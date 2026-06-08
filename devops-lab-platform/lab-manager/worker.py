import redis
import os
import json
import time
import re
import docker
import yaml
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from database import SessionLocal
import models
from datetime import datetime, timedelta
import subprocess
import shutil

redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
docker_client = docker.from_env()

def start_lab(data):
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
        print(f"Lab {lab_id} not found in /labs-repo")
        return
        
    dest = f"/tmp/lab-envs/{student_id}-{lab_id}"
    # Always copy fresh to avoid stale files from previous failures
    shutil.copytree(src, dest, dirs_exist_ok=True)
        
        
    # Get relative path from /labs-repo
    rel_path = os.path.relpath(src, "/labs-repo")
    labs_host_path = os.getenv("LABS_HOST_PATH", "./labs-repo")
    host_lab_path = os.path.join(labs_host_path, rel_path)
    
    # Remove hardcoded container_name and rewrite volume paths
    compose_path = os.path.join(dest, "docker-compose.yml")
    if os.path.exists(compose_path):
        with open(compose_path, "r") as f:
            content = f.read()
            
        # Strip container_name
        content = re.sub(r'^\s*container_name:.*$', '', content, flags=re.MULTILINE)
        
        # Rewrite relative bind mounts e.g. - ./solution:/solution:ro -> - /absolute/host/path/solution:/solution:ro
        # We look for lines like `      - ./something:` or `- "./something:"`
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
            for svc in compose.get("services", {}).values():
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
                svc["cap_add"] = ["CHOWN", "SETUID", "SETGID"]

                security_opt = svc.setdefault("security_opt", [])
                if not isinstance(security_opt, list):
                    security_opt = []
                if "no-new-privileges:true" not in security_opt:
                    security_opt.append("no-new-privileges:true")
                svc["security_opt"] = security_opt

            content = yaml.dump(compose)
        except Exception as e:
            print(f"Failed to inject resource limits: {e}")
        
        with open(compose_path, "w") as f:
            f.write(content)
    
    # 2. Run docker-compose up
    try:
        subprocess.run(["docker-compose", "-p", project_name, "up", "-d", "--build"], cwd=dest, check=True)
    except Exception as e:
        print(f"Failed to start lab: {e}")
        return
    
    try:
        out = subprocess.check_output(["docker-compose", "-p", project_name, "ps", "-q"], cwd=dest)
        container_ids = out.decode('utf-8').strip().split('\n')
        if container_ids and container_ids[0]:
            container_obj = docker_client.containers.get(container_ids[0])
            container_name = container_obj.name
        else:
            container_name = f"{project_name}-1"
    except:
        container_name = f"{project_name}-1"
    
    # Update DB
    db = SessionLocal()
    session = db.query(models.LabSession).filter_by(id=session_id).first()
    if session:
        session.container_name = container_name
        session.status = "running"
        
        # Hard expiry: based on subscription tier (30 min free, 2 hours pro) set at session creation
        student_tier = (session.student.subscription_tier or "free") if (session.student and session.student.subscription_tier) else "free"
        ttl_minutes = 120 if student_tier == "pro" else 30

        print(f"[session] TTL set to {ttl_minutes} min for lab {lab_id} (tier: {student_tier})")
        session.expires_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)
        session.last_activity_at = datetime.utcnow()
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
        now = datetime.utcnow()
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
                models.LabSession.expires_at < datetime.utcnow()
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

if __name__ == "__main__":
    run_worker()
