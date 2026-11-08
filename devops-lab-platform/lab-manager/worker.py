import redis
import os
import json
import time
import re
import socket
import docker
import yaml
import traceback
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from database import SessionLocal
import models
from datetime import datetime, timedelta, timezone
import subprocess
import shutil

redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
try:
    docker_client = docker.from_env()
except Exception as _docker_err:  # unit tests / daemons without docker
    docker_client = None
    print(f"[worker] Docker daemon unavailable: {_docker_err}")

SUDOERS_HOST_PATH = os.path.join(os.path.dirname(__file__), "sudoers-lab-student")
SUDOERS_CONTAINER_PATH = "/etc/sudoers.d/lab-student"

def _utcnow():
    """Naive UTC now (_utcnow() is deprecated in 3.12+)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)



def _resolve_labs_host_path(mountinfo_path: str = "/proc/self/mountinfo") -> str:
    """Derive the host-side path of the /labs-repo mount.

    Bind mounts for lab containers are resolved by the host Docker daemon,
    so relative paths from the lab compose files must be rewritten to the
    absolute host path. This container's mount table records exactly the
    source path the daemon used, which removes the need to hardcode
    LABS_HOST_PATH per machine.
    """
    try:
        with open(mountinfo_path) as fh:
            for line in fh:
                fields = line.split()
                # fields[3] = source path on the host, fields[4] = mount point
                if len(fields) > 4 and fields[4] == "/labs-repo" and fields[3].startswith("/"):
                    return fields[3]
    except OSError:
        pass
    return "./labs-repo"


def _inject_sudoers(container_name: str) -> None:
    """Copy the restricted sudoers whitelist into a running lab container.

    This replaces the broad ``NOPASSWD:ALL`` rule baked into each lab
    Dockerfile with a tightly-scoped whitelist so students can only sudo
    whitelisted, safe commands.

    Steps performed:
      1. ``docker cp``  — copy the file in
      2. ``chmod 0440`` — required by sudo (world-unreadable)
      3. ``chown root:root`` — must be owned by root
      4. Strip the dangerous ``NOPASSWD:ALL`` line from ``/etc/sudoers``
         that each lab Dockerfile appends for the ``intern`` user.
    """
    sudoers_src = SUDOERS_HOST_PATH
    if not os.path.exists(sudoers_src):
        print(f"[sudoers] WARNING: {sudoers_src} not found — skipping sudoers injection")
        return

    try:
        # 1. Copy the whitelist file into the container
        subprocess.run(
            ["docker", "cp", sudoers_src, f"{container_name}:{SUDOERS_CONTAINER_PATH}"],
            check=True,
        )
        # 2. Set correct permissions (sudo refuses to read files not owned by root
        #    or that are world-writable / group-writable)
        subprocess.run(
            ["docker", "exec", container_name, "chmod", "0440", SUDOERS_CONTAINER_PATH],
            check=True,
        )
        subprocess.run(
            ["docker", "exec", container_name, "chown", "root:root", SUDOERS_CONTAINER_PATH],
            check=True,
        )
        # 3. Remove the dangerously-broad NOPASSWD:ALL line from /etc/sudoers
        #    that each lab Dockerfile appends (e.g. "intern ALL=(ALL) NOPASSWD:ALL")
        subprocess.run(
            [
                "docker", "exec", container_name,
                "sed", "-i",
                r"/intern.*NOPASSWD\s*:\s*ALL/d",
                "/etc/sudoers",
            ],
            check=True,
        )
        # Note: "unable to resolve host" is suppressed via "Defaults !log_host" in
        #       sudoers-lab-student rather than patching /etc/hosts, which is unreliable
        #       when the container runs with network_mode: none.
        print(f"[sudoers] Restricted sudoers whitelist injected into {container_name}")
    except subprocess.CalledProcessError as exc:
        print(f"[sudoers] ERROR injecting sudoers into {container_name}: {exc}")


def _resolve_labs_host_path_docker() -> str:
    """Resolve the /labs-repo bind source via the Docker API.

    Docker Desktop (macOS/Windows) reports the true client-side source path
    here (e.g. /Users/you/.../labs), while /proc/self/mountinfo only shows
    VM-internal paths — so this is the reliable method on Desktop installs.
    """
    try:
        own = docker_client.containers.get(socket.gethostname())
        for m in (own.attrs.get("Mounts") or []):
            if m.get("Destination") == "/labs-repo":
                src = (m.get("Source") or "").rstrip("/")
                if src.startswith("/"):
                    return src
    except Exception as e:
        print(f"[labs-path] docker-inspect resolution failed: {e}")
    return None


def _labs_host_path() -> str:
    """Host-side path of the labs dir, for rewriting relative bind mounts.

    Order: LABS_HOST_PATH env > docker inspect (works on Docker Desktop)
    > mountinfo (works on plain Linux). Returns None only when nothing
    works — start_lab then refuses bind-mount labs with a clear error
    instead of crashing every start like os.path.join(None, ...) did.
    """
    env = os.getenv("LABS_HOST_PATH")
    if env:
        print(f"[labs-path] using LABS_HOST_PATH from env: {env}")
        return env.rstrip("/")
    via_docker = _resolve_labs_host_path_docker()
    if via_docker:
        print(f"[labs-path] resolved labs host path via docker inspect: {via_docker}")
        return via_docker
    via_mountinfo = _resolve_labs_host_path()
    if via_mountinfo:
        print(f"[labs-path] resolved labs host path via mountinfo: {via_mountinfo}")
        return via_mountinfo
    print("[labs-path] WARNING: host-side labs path unknown. Labs with relative "
          "bind mounts will fail - set LABS_HOST_PATH in .env (see .env.example).")
    return None


def start_lab(data):
    """Wrapper: any start failure must be loud in the logs AND expire the
    session, so the UI stops polling a 'starting' session forever."""
    session_id = data.get("session_id")
    try:
        _start_lab_impl(data)
    except Exception:
        print(f"[start_lab] FAILED for session {session_id} - traceback follows")
        traceback.print_exc()
        try:
            db = SessionLocal()
            s = db.query(models.LabSession).filter_by(id=session_id).first()
            if s and s.status == "starting":
                s.status = "expired"
                db.commit()
                print(f"[start_lab] session {session_id} marked expired")
            db.close()
        except Exception:
            print("[start_lab] could not mark the session expired after failure")


def _start_lab_impl(data):

    session_id = data["session_id"]
    student_id = data["student_id"]
    short_student_id = data["short_student_id"]
    lab_id = data["lab_id"]
    student_name = data.get("student_name", "student")
    
    sanitized_name = re.sub(r'[^a-zA-Z0-9]', '', student_name).lower()
    if not sanitized_name:
        sanitized_name = "student"
    project_name = f"{sanitized_name}-{short_student_id}"
    
    # US-004 — Enforce one active session per student
    db_check = SessionLocal()
    try:
        old_sessions = db_check.query(models.LabSession).filter(
            models.LabSession.student_id == student_id,
            models.LabSession.status == "running",
            models.LabSession.id != session_id,
        ).all()
        for old in old_sessions:
            print(f"[evict] stopping old session {old.id} to start {session_id}")
            old.status = "expired"
            db_check.commit()
            stop_lab({
                "student_id": str(old.student_id),
                "lab_id": old.lab_id,
            })
    except Exception as e:
        print(f"Error evicting old sessions: {e}")
        db_check.rollback()
    finally:
        db_check.close()
    
    # 1. Find correct lab files
    src = None
    cache_key = f"lab_src:{lab_id}"
    cached_src = redis_client.get(cache_key)
    
    if cached_src:
        src = cached_src.decode('utf-8')
    else:
        for root_dir, _, files in os.walk("/labs-repo"):
            if "docker-compose.yml" in files:
                current_lab_id = os.path.basename(root_dir)
                if "metadata.json" in files:
                    try:
                        with open(os.path.join(root_dir, "metadata.json")) as f:
                            meta = json.load(f)
                            current_lab_id = meta.get("id", current_lab_id)
                    except:
                        pass
                if current_lab_id == lab_id:
                    src = root_dir
                    redis_client.setex(cache_key, 3600, src)
                    break
                
    if not src:
        raise RuntimeError(
            f"Lab {lab_id} not found under /labs-repo - is the labs volume mounted "
            "and did the backend lab sync run? (check: docker compose logs backend)"
        )
    print(f"[start_lab] found lab dir {src}")

    dest = f"/tmp/lab-envs/{student_id}-{lab_id}"
    # Always copy fresh to avoid stale files from previous failures
    shutil.copytree(src, dest, dirs_exist_ok=True)

    # Get relative path from /labs-repo
    rel_path = os.path.relpath(src, "/labs-repo")
    labs_host_path = _labs_host_path()
    
    # Remove hardcoded container_name and rewrite volume paths
    compose_path = os.path.join(dest, "docker-compose.yml")
    if os.path.exists(compose_path):
        with open(compose_path, "r") as f:
            content = f.read()
            
        # Strip container_name
        content = re.sub(r'^\s*container_name:.*$', '', content, flags=re.MULTILINE)
        
        # Rewrite relative bind mounts e.g. - ./solution:/solution:ro -> - /absolute/host/path/solution:/solution:ro
        # We look for lines like `      - ./something:` or `- "./something:"`
        if re.search(r'^(\s*-\s*["\']?)\./', content, flags=re.MULTILINE):
            if not labs_host_path:
                raise RuntimeError(
                    "This lab uses relative bind mounts but the host-side labs path is "
                    "unknown (typical on Docker Desktop). Set LABS_HOST_PATH=/absolute/"
                    "host/path/to/Opslance/labs in .env and restart the stack."
                )
            host_lab_path = os.path.join(labs_host_path, rel_path)
            print(f"[start_lab] rewriting relative bind mounts against {host_lab_path}")

            def replace_volume(match):
                prefix = match.group(1)
                rest = match.group(2)
                return f"{prefix}{host_lab_path}/{rest}"

            content = re.sub(r'^(\s*-\s*["\']?)\./(.*?)$', replace_volume, content, flags=re.MULTILINE)
        
        # US-001 — Parse with PyYAML and inject resource limits
        # Load per-lab overrides from metadata.json if present
        meta_path = os.path.join(dest, "metadata.json")
        lab_limits = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path) as f:
                    meta = json.load(f)
                    lab_limits = meta.get("resource_limits", {})
            except Exception as e:
                print(f"Error reading metadata.json for limits: {e}")

        defaults = {
            "cpu":     str(lab_limits.get("cpu", "0.1")),
            "memory":  str(lab_limits.get("memory", "100m")),
            "pids":    int(lab_limits.get("pids", 50)),
            "network": str(lab_limits.get("network", "none")),
        }

        try:
            compose = yaml.safe_load(content)
            # metadata.json may opt a lab out of the default lockdown via
            # resource_limits.privileged — k3s-based labs need privileged
            # containers, real service networking and generous resources.
            privileged_lab = bool(lab_limits.get("privileged", False))
            for svc in compose.get("services", {}).values():
                if privileged_lab:
                    svc["privileged"] = True
                    svc.pop("network_mode", None)
                else:
                    deploy = svc.setdefault("deploy", {})
                    deploy["resources"] = {
                        "limits":       {"cpus": defaults["cpu"], "memory": defaults["memory"], "pids": defaults["pids"]},
                        "reservations": {"cpus": str(float(defaults["cpu"]) / 2), "memory": "32m"},
                    }
                    svc["pids_limit"] = defaults["pids"]
                    ulimits = svc.setdefault("ulimits", {})
                    ulimits["nproc"] = {"soft": defaults["pids"], "hard": defaults["pids"]}
                    ulimits["nofile"] = {"soft": 256, "hard": 512}
                    svc["network_mode"] = defaults["network"]
                    svc["cap_drop"] = ["ALL"]
                    # CHOWN, SETUID, SETGID are required for sudo's SUID mechanism.
                    # Privilege scope is enforced via /etc/sudoers.d/lab-student (whitelist)
                    # rather than no-new-privileges, which would block sudo entirely.
                    # AUDIT_WRITE silences "unable to send audit message" warnings from sudo.
                    svc["cap_add"] = ["CHOWN", "SETUID", "SETGID", "AUDIT_WRITE"]
                # Keep terminal containers alive: compose CMDs like plain
                # `bash` exit immediately without a TTY, which would break
                # the websocket terminal and the /check.sh verification exec.
                svc["tty"] = True
                svc["stdin_open"] = True

            if privileged_lab:
                print("[limits] privileged lab mode: k3s resources unlocked")

            content = yaml.dump(compose)
        except Exception as e:
            print(f"Failed to inject resource limits: {e}")
        
        with open(compose_path, "w") as f:
            f.write(content)
    
    # 2. Run docker-compose up
    try:
        print(f"[start_lab] running docker-compose up for {project_name} "
              f"(first run builds the image; k3s labs pull ~200MB on first start)")
        subprocess.run(["docker-compose", "-p", project_name, "up", "-d", "--build"], cwd=dest, check=True)
    except Exception:
        print("Failed to start lab - the docker-compose output above is the cause")
        traceback.print_exc()
        raise
    
    # The terminal/verification container is the FIRST service listed in the
    # lab's docker-compose.yml — select it deterministically instead of
    # relying on `docker-compose ps` output ordering.
    first_service = None
    try:
        with open(compose_path) as f:
            first_service = next(iter((yaml.safe_load(f) or {}).get("services", {})), None)
    except Exception:
        first_service = None

    try:
        ps_cmd = ["docker-compose", "-p", project_name, "ps", "-q"]
        if first_service:
            ps_cmd.append(first_service)
        out = subprocess.check_output(ps_cmd, cwd=dest)
        container_ids = [c for c in out.decode('utf-8').strip().split('\n') if c.strip()]
        if container_ids:
            container_obj = docker_client.containers.get(container_ids[0])
            container_name = container_obj.name
        else:
            container_name = f"{project_name}-{first_service or '1'}-1"
    except Exception:
        container_name = f"{project_name}-{first_service or '1'}-1"
    
    # ── Inject restricted sudoers whitelist ──────────────────────────────────
    # Replace the broad NOPASSWD:ALL baked into lab Dockerfiles with a
    # tightly scoped whitelist that only allows safe commands.
    _inject_sudoers(container_name)

    # Update DB
    db = SessionLocal()
    session = db.query(models.LabSession).filter_by(id=session_id).first()
    if session:
        session.container_name = container_name
        session.status = "running"
        
        # Hard expiry: admin-configured TTL per tier, with the historic defaults
        # (30 min free / 2 h pro) as fallback when settings can't be read.
        student_tier = (session.student.subscription_tier or "free") if (session.student and session.student.subscription_tier) else "free"
        try:
            import settings_service
            ttl_minutes = int(settings_service.get_setting(
                db, "default_session_minutes_pro" if student_tier == "pro" else "default_session_minutes_free"))
        except Exception:
            ttl_minutes = 120 if student_tier == "pro" else 30

        print(f"[session] TTL set to {ttl_minutes} min for lab {lab_id} (tier: {student_tier})")
        session.expires_at = _utcnow() + timedelta(minutes=ttl_minutes)
        session.last_activity_at = _utcnow()
        db.commit()
    db.close()

def stop_lab(data):
    student_id = data["student_id"]
    lab_id = data["lab_id"]
    dest = f"/tmp/lab-envs/{student_id}-{lab_id}"
    
    db = SessionLocal()
    student = db.query(models.Student).filter_by(id=student_id).first()
    student_name = student.full_name if student else "student"
    db.close()
    
    sanitized_name = re.sub(r'[^a-zA-Z0-9]', '', student_name).lower() or "student"
    project_name = f"{sanitized_name}-{str(student_id)[:4]}"
    
    if os.path.exists(dest):
        subprocess.run(["docker-compose", "-p", project_name, "down", "-v"], cwd=dest)
        shutil.rmtree(dest)

def check_lab(data):
    session_id = data["session_id"]
    container_name = data["container_name"]
    
    # Exec check.sh
    try:
        container = docker_client.containers.get(container_name)
        exit_code, output = container.exec_run("bash /check.sh")
        passed = (exit_code == 0)
    except:
        passed = False
        output = b"Error running check.sh"
    
    db = SessionLocal()
    session = db.query(models.LabSession).filter_by(id=session_id).first()
    if session:
        score = 10 if passed else 0
        sub = models.Submission(
            session_id=session.id,
            student_id=session.student_id,
            lab_id=session.lab_id,
            passed=passed,
            score=score,
            verification_output=output.decode("utf-8")
        )
        db.add(sub)
        if passed:
            session.status = "submitted"
        db.commit()
    db.close()

def cleanup_idle_labs():
    print("[cleanup] Running periodic idle container cleanup...")
    db = SessionLocal()
    try:
        idle_timeout_min = int(os.getenv("LAB_IDLE_TIMEOUT_MINUTES", 20))
        now = _utcnow()
        idle_threshold = now - timedelta(minutes=idle_timeout_min)
        
        expired_sessions = db.query(models.LabSession).filter(
            models.LabSession.status == "running"
        ).filter(
            (models.LabSession.last_activity_at < idle_threshold) |
            (models.LabSession.expires_at < now)
        ).all()
        
        for sess in expired_sessions:
            reason = "idle timeout" if (sess.last_activity_at and sess.last_activity_at < idle_threshold) else "hard expiry"
            print(f"[cleanup] Expiring session {sess.id} for student {sess.student_id} due to {reason}")

            sess.status = "expired"
            sess.auto_stopped = True
            db.commit()

            stop_lab({
                "student_id": str(sess.student_id),
                "lab_id": sess.lab_id
            })

        # Sessions stuck in 'starting' mean the worker failed before the status
        # could change — expire them so the UI stops polling forever.
        stuck_starting = db.query(models.LabSession).filter(
            models.LabSession.status == "starting",
            models.LabSession.started_at < now - timedelta(minutes=10),
        ).all()
        for sess in stuck_starting:
            print(f"[cleanup] Expiring stuck 'starting' session {sess.id} (worker never finished)")
            sess.status = "expired"
            sess.auto_stopped = True
            db.commit()
    except Exception as e:
        print(f"[cleanup] Error during idle cleanup: {e}")
        db.rollback()
    finally:
        db.close()

def run_worker():
    print("Starting Lab Manager Worker...")
    last_cleanup = 0.0
    while True:
        # Periodic cleanup of idle labs (every 5 minutes / 300 seconds)
        now_ts = time.time()
        if now_ts - last_cleanup >= 300:
            try:
                cleanup_idle_labs()
            except Exception as e:
                print(f"Error in idle cleanup trigger: {e}")
            last_cleanup = now_ts

        try:
            job = redis_client.brpop("lab_jobs", timeout=5)
            if job:
                _, data_str = job
                data = json.loads(data_str)
                print(f"Processing job: {data['type']}")
                if data["type"] == "start_lab":
                    start_lab(data)
                elif data["type"] == "stop_lab":
                    stop_lab(data)
                elif data["type"] == "check_lab":
                    check_lab(data)
        except redis.exceptions.TimeoutError:
            pass
        except Exception as e:
            print(f"Error in worker job processing: {e}")
            time.sleep(1)
        
        # US-002 — Fix session expiry bug (zombie containers)
        db = SessionLocal()
        try:
            expired = db.query(models.LabSession).filter(
                models.LabSession.status == "running",
                models.LabSession.expires_at < _utcnow()
            ).all()
            for sess in expired:
                print(f"[expiry] stopping session {sess.id} for student {sess.student_id}")
                sess.status = "expired"
                db.commit()
                stop_lab({
                    "student_id": str(sess.student_id),
                    "lab_id": sess.lab_id,
                })
        except Exception as e:
            print(f"Error in expiry logic: {e}")
            db.rollback()
        finally:
            db.close()

def _serve_internal_api():
    """Run the internal exec/PTY API on the compose network only (no published
    port). The backend proxies verification + terminal here, so it never needs
    the Docker socket itself."""
    import threading
    import uvicorn
    from api import app as internal_app

    thread = threading.Thread(
        target=uvicorn.run,
        args=(internal_app,),
        kwargs={"host": "0.0.0.0", "port": 8100, "log_level": "warning"},
        daemon=True,
    )
    thread.start()


if __name__ == "__main__":
    _serve_internal_api()
    run_worker()
