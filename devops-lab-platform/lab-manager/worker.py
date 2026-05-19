import redis
import os
import json
import time
import docker
import re
import docker
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
        session.expires_at = datetime.utcnow() + timedelta(hours=2)
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

def run_worker():
    print("Starting Lab Manager Worker...")
    while True:
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
        
        # Expiry logic
        db = SessionLocal()
        expired = db.query(models.LabSession).filter(models.LabSession.status == "running", models.LabSession.expires_at < datetime.utcnow()).all()
        for sess in expired:
            stop_lab({"student_id": sess.student_id, "lab_id": sess.lab_id})
            sess.status = "expired"
        db.commit()
        db.close()

if __name__ == "__main__":
    run_worker()
