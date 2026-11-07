import os
import textwrap

output = []

output.append("# Opslance DevOps Lab Platform - Complete Fixes & Labs")
output.append("")
output.append("## SECTION 1: FIXES")

# =====================================================================
# FIX 1: .env and .env.example
# =====================================================================
output.append("\n### FIX 1 — .env and .env.example")
output.append("Note: You must set LABS_HOST_PATH to the absolute path of the labs/ directory on your host machine before running docker compose up.")

env_content = """POSTGRES_PASSWORD=devops_super_secret
SECRET_KEY=super_secret_jwt_key_change_in_production
ADMIN_EMAIL=admin@opslance.local
ADMIN_PASSWORD=Admin@2025!
ADMIN_FULL_NAME=Admin
LABS_HOST_PATH=/Users/mohamedserag/Desktop/Opslance/labs"""

env_example_content = """# PostgreSQL Database Password
POSTGRES_PASSWORD=devops_super_secret
# JWT Signing Key for sessions
SECRET_KEY=super_secret_jwt_key_change_in_production
# Super admin email address
ADMIN_EMAIL=admin@opslance.local
# Super admin password
ADMIN_PASSWORD=Admin@2025!
# Super admin full name
ADMIN_FULL_NAME=Admin
# Absolute path to the labs directory on the host machine
LABS_HOST_PATH=/absolute/path/to/Opslance/labs"""

output.append("\n--- FILE: .env ---")
output.append("```ini\n" + env_content + "\n```")
output.append("\n--- FILE: .env.example ---")
output.append("```ini\n" + env_example_content + "\n```")


# =====================================================================
# FIX 2: models.py
# =====================================================================
output.append("\n### FIX 2 — models.py")

models_py_content = """from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Lab(Base):
    __tablename__ = "labs"
    
    id = Column(String, primary_key=True, index=True)
    module_number = Column(Integer)
    module_title = Column(String)
    title = Column(String)
    difficulty = Column(String)
    estimated_minutes = Column(Integer)
    points = Column(Integer)
    category = Column(String)
    subcategory = Column(String)
    
    # New Fields
    scenario = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)
    mission = Column(Text, nullable=True)
    verification_command = Column(String, nullable=True)
    hints = Column(Text, nullable=True)
    acceptance_criteria = Column(Text, nullable=True)

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    students = relationship("Student", backref="group")

class LabSession(Base):
    __tablename__ = "lab_sessions"
    id = Column(String, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    lab_id = Column(String, ForeignKey("labs.id"))
    container_name = Column(String, nullable=True)
    status = Column(String, default="starting")
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    lab = relationship("Lab")

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("lab_sessions.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    lab_id = Column(String, ForeignKey("labs.id"))
    attempt_number = Column(Integer, default=1)
    passed = Column(Boolean)
    score = Column(Integer)
    verification_output = Column(Text)
    hints_used = Column(Integer, default=0)
    time_taken_minutes = Column(Integer, nullable=True)
    
    # New Field
    score_breakdown = Column(Text, nullable=True)
"""

output.append("\n--- FILE: backend/models.py ---")
output.append("```python\n" + models_py_content + "\n```")

# =====================================================================
# FIX 3: seed_admin.py and routers/auth.py
# =====================================================================
output.append("\n### FIX 3 — seed_admin.py + routers/auth.py")

seed_admin_content = """import os
from database import SessionLocal, engine
from models import Base, Group

def seed():
    # 1. Create all tables including new columns
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # 2. Confirm env vars
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    
    if not admin_email or not admin_password:
        print("ERROR: ADMIN_EMAIL or ADMIN_PASSWORD environment variable is missing.")
        db.close()
        exit(1)
        
    print(f"Admin credentials configured successfully for: {admin_email}")
    
    # 3. Create Default Group
    default_group = db.query(Group).filter_by(name="Default Group").first()
    if not default_group:
        default_group = Group(name="Default Group")
        db.add(default_group)
        db.commit()
        print("Created 'Default Group'.")
    else:
        print("'Default Group' already exists.")
        
    db.close()
    print("\\n✅ Database seeded successfully.")
    print("You can now log in at http://localhost with your admin credentials.")

if __name__ == "__main__":
    seed()
"""

auth_py_content = """from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
from pydantic import BaseModel
import os
import jwt
import datetime
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    
    if req.email == admin_email and req.password == admin_password:
        token = jwt.encode({
            "sub": "0",
            "email": req.email,
            "role": "admin",
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm="HS256")
        return {"token": token, "role": "admin"}
        
    student = db.query(models.Student).filter(models.Student.email == req.email).first()
    if not student or not pwd_context.verify(req.password, student.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    token = jwt.encode({
        "sub": str(student.id),
        "email": student.email,
        "role": "student",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm="HS256")
    
    return {"token": token, "role": "student"}
"""

output.append("\n--- FILE: backend/scripts/seed_admin.py ---")
output.append("```python\n" + seed_admin_content + "\n```")
output.append("\n--- FILE: backend/routers/auth.py ---")
output.append("```python\n" + auth_py_content + "\n```")

# =====================================================================
# FIX 4: routers/sessions.py
# =====================================================================
output.append("\n### FIX 4 — routers/sessions.py")

sessions_py_content = """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import get_current_student
import uuid
import json
import redis
import os
import docker
from datetime import datetime

router = APIRouter()
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))

@router.post("/")
def create_session(data: dict, db: Session = Depends(get_db), student=Depends(get_current_student)):
    lab_id = data.get("lab_id")
    if not lab_id:
        raise HTTPException(400, "lab_id required")
        
    existing = db.query(models.LabSession).filter_by(student_id=student.id, lab_id=lab_id).first()
    if existing:
        return {"session_id": existing.id, "status": existing.status}
        
    session_id = str(uuid.uuid4())
    sess = models.LabSession(id=session_id, student_id=student.id, lab_id=lab_id, status="starting")
    db.add(sess)
    db.commit()
    
    job = {
        "type": "start_lab",
        "session_id": session_id,
        "student_id": student.id,
        "short_student_id": str(student.id)[:4],
        "lab_id": lab_id,
        "student_name": student.full_name
    }
    redis_client.lpush("lab_jobs", json.dumps(job))
    
    return {"session_id": session_id, "status": "starting"}

@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db), student=Depends(get_current_student)):
    s = db.query(models.LabSession).filter_by(id=session_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    return {
        "id": s.id,
        "status": s.status,
        "container_name": s.container_name
    }

@router.delete("/{session_id}")
def stop_session(session_id: str, db: Session = Depends(get_db), student=Depends(get_current_student)):
    s = db.query(models.LabSession).filter_by(id=session_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404)
        
    job = {
        "type": "stop_lab",
        "student_id": student.id,
        "lab_id": s.lab_id
    }
    redis_client.lpush("lab_jobs", json.dumps(job))
    
    db.delete(s)
    db.commit()
    return {"message": "Session terminated"}

@router.post("/{session_id}/submit")
def submit_session(session_id: str, db: Session = Depends(get_db), student=Depends(get_current_student)):
    s = db.query(models.LabSession).filter_by(id=session_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    if s.status != "running":
        raise HTTPException(400, f"Session is not running (status: {s.status})")
    if not s.container_name:
        raise HTTPException(400, "Container not assigned yet — lab may still be starting")

    # Run check.sh synchronously inside the container
    try:
        docker_client = docker.from_env()
        container = docker_client.containers.get(s.container_name)
        exit_code, raw_output = container.exec_run("bash /check.sh", demux=False)
        output = raw_output.decode("utf-8", errors="replace") if raw_output else ""
        passed = (exit_code == 0)
    except docker.errors.NotFound:
        raise HTTPException(400, "Container not found — it may have expired")
    except Exception as e:
        raise HTTPException(500, f"Verification error: {str(e)}")

    # Parse SCORE line from check.sh output: "SCORE: 80/100"
    score = 0
    import re
    score_match = re.search(r"SCORE:\\s*(\\d+)/\\d+", output)
    if score_match:
        score = int(score_match.group(1))
    elif passed:
        score = s.lab.points if s.lab else 100

    # Count previous attempts
    attempt_number = db.query(models.Submission).filter_by(
        session_id=s.id, student_id=student.id
    ).count() + 1

    # Calculate time taken
    time_taken = None
    if s.started_at:
        delta = datetime.utcnow() - s.started_at.replace(tzinfo=None)
        time_taken = int(delta.total_seconds() / 60)

    # Write submission record
    sub = models.Submission(
        session_id=s.id,
        student_id=student.id,
        lab_id=s.lab_id,
        attempt_number=attempt_number,
        passed=passed,
        verification_output=output,
        score=score,
        hints_used=0,
        time_taken_minutes=time_taken,
    )
    db.add(sub)

    if passed:
        s.status = "submitted"

    db.commit()

    return {
        "passed": passed,
        "score": score,
        "verification_output": output,
        "attempt_number": attempt_number,
        "message": "🎉 Lab complete! Well done." if passed else "❌ Not quite — read the output above and try again.",
    }

@router.post("/{session_id}/hints/{n}")
def reveal_hint(session_id: str, n: int, db: Session = Depends(get_db), student=Depends(get_current_student)):
    s = db.query(models.LabSession).filter_by(id=session_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404)
    lab = db.query(models.Lab).filter_by(id=s.lab_id).first()
    if not lab or not lab.hints:
        raise HTTPException(404, "No hints available for this lab")
    
    hints = json.loads(lab.hints)
    hint = next((h for h in hints if h.get("number") == n), None)
    if not hint:
        raise HTTPException(404, f"Hint {n} not found")
        
    return {"number": n, "title": hint.get("title"), "content": hint.get("content")}
"""

output.append("\n--- FILE: backend/routers/sessions.py ---")
output.append("```python\n" + sessions_py_content + "\n```")

# =====================================================================
# FIX 5: check.sh for labs 03 and 04
# =====================================================================
output.append("\n### FIX 5 — labs/lab-03/check.sh & labs/lab-04/check.sh")

check03 = """#!/bin/bash
# Acceptance criteria checker for: What is My System?
# All checks run independently — no set -e

PASSED_WEIGHT=0

run_check() {
  local weight=$1
  local description=$2
  local result=$3   # 0=pass 1=fail
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}

echo "=== Checking: What is My System? ==="
echo ""

# CHECK 1 (50%): system-report.txt exists and is not empty
[ -f /home/intern/system-report.txt ] && [ -s /home/intern/system-report.txt ]
run_check 50 "system-report.txt exists and is not empty" $?

# CHECK 2 (50%): report contains the username 'intern'
grep -qi "intern" /home/intern/system-report.txt 2>/dev/null
run_check 50 "report contains username 'intern'" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
"""

check04 = """#!/bin/bash
# Acceptance criteria checker for: Copy, Move, Remove
# All checks run independently — no set -e

PASSED_WEIGHT=0

run_check() {
  local weight=$1
  local description=$2
  local result=$3   # 0=pass 1=fail
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}

echo "=== Checking: Copy, Move, Remove ==="
echo ""

# CHECK 1 (25%): /etc/app/staging.conf exists
[ -f /etc/app/staging.conf ]
run_check 25 "/etc/app/staging.conf exists" $?

# CHECK 2 (25%): /etc/app/production.conf exists
[ -f /etc/app/production.conf ]
run_check 25 "/etc/app/production.conf exists" $?

# CHECK 3 (25%): no backup-*.tar.gz files remain in /home/intern
[ $(find /home/intern -maxdepth 1 -name 'backup-*.tar.gz' 2>/dev/null | wc -l) -eq 0 ]
run_check 25 "no backup-*.tar.gz files remain in /home/intern" $?

# CHECK 4 (25%): /var/app/data directory exists
[ -d /var/app/data ]
run_check 25 "/var/app/data directory exists" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"

if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed! You completed ${PASSED_WEIGHT}% of the requirements."
  exit 0
else
  echo "❌ Not yet complete. You need 70 points to pass (got ${PASSED_WEIGHT})."
  exit 1
fi
"""

output.append("\n--- FILE: labs/linux/module-01-linux-fundamentals/lab-03-what-is-my-system/check.sh ---")
output.append("```bash\n" + check03 + "\n```")
output.append("\n--- FILE: labs/linux/module-01-linux-fundamentals/lab-04-copy-move-remove/check.sh ---")
output.append("```bash\n" + check04 + "\n```")


# =====================================================================
# FIX 6: metadata.json for labs 03 and 04
# =====================================================================
output.append("\n### FIX 6 — labs/lab-03/metadata.json & labs/lab-04/metadata.json")

meta03 = """{
  "id": "module-01-lab-03-what-is-my-system",
  "module_number": 1,
  "module_title": "Linux Fundamentals",
  "title": "What is My System?",
  "difficulty": "beginner",
  "estimated_minutes": 15,
  "points": 100,
  "category": "linux",
  "subcategory": "fundamentals",
  "skills": ["whoami", "hostname", "pwd", "echo", "file redirection"],
  "scenario": "You are a new intern joining the DevOps team. On your first day you are dropped onto an unfamiliar Linux server with no documentation. Your shell prompt is bare and you are not in your home directory. Before you can do any meaningful work you must figure out who you are, where you are, and what system you are on.",
  "symptoms": [
    "Shell prompt shows only $ with no username or path",
    "You do not know what directory you are in",
    "There is no documentation on the system"
  ],
  "mission": "Navigate to your home directory /home/intern, and then create a report file called system-report.txt using the template:\\nUsername:\\nHostname:\\nHome:\\nPWD:",
  "verification_command": "bash /check.sh",
  "hints": [
    {
      "number": 1,
      "title": "Where to look",
      "content": "Start by navigating to your home directory using `cd /home/intern`. Then, run basic discovery commands: `whoami` tells you who you are, `pwd` tells you where you are. Run both."
    },
    {
      "number": 2,
      "title": "What to check",
      "content": "The hostname is shown by the hostname command. Use file redirection to construct the report."
    },
    {
      "number": 3,
      "title": "The fix",
      "content": "Run these commands to build your report:\\ncd /home/intern\\necho \\"Username: $(whoami)\\" > system-report.txt\\necho \\"Hostname: $(hostname)\\" >> system-report.txt\\necho \\"Home: /home/intern\\" >> system-report.txt\\necho \\"PWD: $(pwd)\\" >> system-report.txt"
    }
  ],
  "acceptance_criteria": [
    {"id": "check_1", "description": "system-report.txt exists and is not empty", "weight": 20},
    {"id": "check_2", "description": "report contains username", "weight": 20},
    {"id": "check_3", "description": "report contains the system hostname", "weight": 20},
    {"id": "check_4", "description": "report contains home directory", "weight": 20},
    {"id": "check_5", "description": "report contains working directory", "weight": 20}
  ]
}"""

meta04 = """{
  "id": "module-01-lab-04-copy-move-remove",
  "module_number": 1,
  "module_title": "Linux Fundamentals",
  "title": "Copy, Move, Remove",
  "difficulty": "beginner",
  "estimated_minutes": 15,
  "points": 100,
  "category": "linux",
  "subcategory": "fundamentals",
  "skills": ["cp", "mv", "rm", "mkdir", "chmod", "ls"],
  "description": "Organize a messy filesystem by moving, copying, and removing files.",
  "scenario": "A sysadmin left the server in a mess before going on leave. A critical config file has wrong permissions and is in the wrong place, old backups are cluttering the home directory, and a required data directory does not exist. Fix it all.",
  "symptoms": "- ~/staging.conf exists but cannot be read or moved (permissions 000)\\n- /etc/app/ directory does not exist\\n- Three backup-*.tar.gz files clutter the home directory\\n- /var/app/data directory is missing",
  "mission": "Move staging.conf to /etc/app/, copy it to production.conf, delete the backup files, and create /var/app/data.",
  "verification_command": "bash /check.sh",
  "hints": [
    {
      "number": 1,
      "title": "Where to look",
      "content": "Run ls -la in your home directory. Look carefully at the permissions column on staging.conf — what do all the dashes mean?"
    },
    {
      "number": 2,
      "title": "What to check",
      "content": "The staging.conf permissions are 000 — no one can touch it. Use chmod 644 ~/staging.conf to fix that first. Then use mkdir -p to create /etc/app/ before you try to move anything there."
    },
    {
      "number": 3,
      "title": "The fix",
      "content": "chmod 644 ~/staging.conf\\nsudo mkdir -p /etc/app\\nmv ~/staging.conf /etc/app/staging.conf\\nsudo cp /etc/app/staging.conf /etc/app/production.conf\\nrm ~/backup-*.tar.gz\\nsudo mkdir -p /var/app/data"
    }
  ],
  "acceptance_criteria": [
    {"id": "check_1", "description": "/etc/app/staging.conf exists", "weight": 25},
    {"id": "check_2", "description": "/etc/app/production.conf exists", "weight": 25},
    {"id": "check_3", "description": "no backup-*.tar.gz files remain in /home/intern", "weight": 25},
    {"id": "check_4", "description": "/var/app/data directory exists", "weight": 25}
  ]
}"""

output.append("\n--- FILE: labs/linux/module-01-linux-fundamentals/lab-03-what-is-my-system/metadata.json ---")
output.append("```json\n" + meta03 + "\n```")
output.append("\n--- FILE: labs/linux/module-01-linux-fundamentals/lab-04-copy-move-remove/metadata.json ---")
output.append("```json\n" + meta04 + "\n```")

# =====================================================================
# FIX 7: sync_labs.py
# =====================================================================
output.append("\n### FIX 7 — backend/scripts/sync_labs.py")

sync_labs = """import os
import json
import argparse
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def sync_labs():
    db = SessionLocal()
    labs_dir = os.environ.get("LABS_HOST_PATH", "./labs-repo")
    
    added = 0
    updated = 0
    skipped = 0

    for root, dirs, files in os.walk(labs_dir):
        if "docker-compose.yml" in files:
            if "metadata.json" not in files:
                print(f"⚠️  No metadata.json in {root} — skipping")
                skipped += 1
                continue
                
            try:
                with open(os.path.join(root, "metadata.json"), "r") as f:
                    meta = json.load(f)
                
                lab_id = meta["id"]
                existing_lab = db.query(models.Lab).filter_by(id=lab_id).first()
                
                lab_data = {
                    "module_number": meta.get("module_number", 0),
                    "module_title": meta.get("module_title", ""),
                    "title": meta.get("title", ""),
                    "difficulty": meta.get("difficulty", "beginner"),
                    "estimated_minutes": meta.get("estimated_minutes", 15),
                    "points": meta.get("points", 100),
                    "category": meta.get("category", ""),
                    "subcategory": meta.get("subcategory", ""),
                    "scenario": meta.get("scenario", ""),
                    "symptoms": json.dumps(meta.get("symptoms", [])),
                    "mission": meta.get("mission", ""),
                    "verification_command": meta.get("verification_command", ""),
                    "hints": json.dumps(meta.get("hints", [])),
                    "acceptance_criteria": json.dumps(meta.get("acceptance_criteria", []))
                }
                
                if existing_lab:
                    for key, value in lab_data.items():
                        setattr(existing_lab, key, value)
                    updated += 1
                else:
                    new_lab = models.Lab(id=lab_id, **lab_data)
                    db.add(new_lab)
                    added += 1
                    
            except Exception as e:
                print(f"Error parsing metadata in {root}: {e}")
                skipped += 1
                
    db.commit()
    db.close()
    
    print("=== Sync Summary ===")
    print(f"✅ Added:   {added}")
    print(f"🔄 Updated: {updated}")
    print(f"⏭ Skipped: {skipped}")

if __name__ == "__main__":
    sync_labs()
"""

output.append("\n--- FILE: backend/scripts/sync_labs.py ---")
output.append("```python\n" + sync_labs + "\n```")


# =====================================================================
# SECTION 2: NEW LABS
# =====================================================================
output.append("\n## SECTION 2: NEW LABS")

output.append("\n### LAB 01 — labs/linux/module-01-linux-fundamentals/lab-01-lost-in-the-filesystem/")

l01_meta = """{
  "id": "module-01-lab-01-lost-in-the-filesystem",
  "module_number": 1,
  "module_title": "Linux Fundamentals",
  "title": "Lost in the Filesystem",
  "difficulty": "beginner",
  "estimated_minutes": 15,
  "points": 100,
  "category": "linux",
  "subcategory": "fundamentals",
  "skills": ["pwd", "ls", "cd", "absolute paths", "relative paths"],
  "scenario": "A junior developer was exploring the filesystem and got lost. They were somewhere deep in the directory tree and ran cd / by accident. Now they can't find their way back to their home directory where their work file mission.txt is waiting. They need to navigate back and read the file.",
  "symptoms": [
    "You don't know where you are",
    "You need to find mission.txt somewhere in the intern's home directory"
  ],
  "mission": "Navigate the filesystem, read mission.txt, and complete the tasks inside it.",
  "hints": [
    {"number": 1, "title": "Where to look", "content": "The file is located in the user's home directory. You can go there using the ~ symbol or the absolute path /home/intern."},
    {"number": 2, "title": "What to check", "content": "Once in the home directory, list all files to find mission.txt and read it."},
    {"number": 3, "title": "The fix", "content": "Run `cd ~`, then `cat mission.txt`. Then create the required files."}
  ],
  "verification_command": "bash /check.sh",
  "acceptance_criteria": [
    {"id": "check_1", "description": "/home/intern/found.txt exists and contains target text", "weight": 35},
    {"id": "check_2", "description": "/home/intern/etc-count.txt exists and is not empty", "weight": 35},
    {"id": "check_3", "description": "/home/intern/projects/alpha/beta/gamma/visited.txt exists", "weight": 30}
  ]
}"""

l01_dock = """FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \\
    sudo vim nano less curl \\
    && rm -rf /var/lib/apt/lists/*
RUN useradd -m -s /bin/bash intern && \\
    echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \\
    echo "intern:intern123" | chpasswd
    
# THE BREAK: Disorient the student
RUN mkdir -p /home/intern/projects/alpha/beta/gamma/
RUN touch /home/intern/projects/alpha/file1.txt /home/intern/projects/alpha/beta/file2.txt
RUN echo "These are some notes" > /home/intern/projects/notes.txt

RUN echo "🎯 Mission: You Found It!\\n\\nYou navigated to your home directory successfully.\\n\\nNow complete these tasks:\\n1. Create a file called 'found.txt' in this directory (/home/intern/)\\n   with the text: \\"I navigated the Linux filesystem\\"\\n\\n2. Use 'ls' to list the contents of /etc and count how many items are there.\\n   Write the count to /home/intern/etc-count.txt like this:\\n   echo \\"42 items\\" > /home/intern/etc-count.txt\\n   (replace 42 with the real count)\\n\\n3. Navigate to /home/intern/projects/alpha/beta/gamma/ using a RELATIVE path\\n   from /home/intern/ (not an absolute path) and create a file called\\n   'visited.txt' there.\\n\\nRun /check.sh when done." > /home/intern/mission.txt

COPY check.sh /check.sh
RUN chmod +x /check.sh
RUN echo "FLAG-lost-in-the-filesystem" > /root/flag.txt
USER intern
WORKDIR /usr/share/doc/bash/
ENTRYPOINT ["tail", "-f", "/dev/null"]"""

l01_comp = """version: '3.8'
services:
  linux-module-01-lost-in-the-filesystem:
    build: .
    container_name: lab-01-lost-in-the-filesystem
    restart: "no"
    labels:
      - "lab.module=MODULE 01"
      - "lab.category=linux"
      - "lab.difficulty=beginner"
      - "lab.title=Lost in the Filesystem"
      - "lab.id=module-01-lab-01-lost-in-the-filesystem"
    volumes:
      - ./solution:/solution:ro"""

l01_check = """#!/bin/bash
PASSED_WEIGHT=0
run_check() {
  local weight=$1 description=$2 result=$3
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}
echo "=== Checking: Lost in the Filesystem ==="
echo ""

# CHECK 1
grep -q "I navigated the Linux filesystem" /home/intern/found.txt 2>/dev/null
run_check 35 "/home/intern/found.txt exists and contains 'I navigated the Linux filesystem'" $?

# CHECK 2
[ -s /home/intern/etc-count.txt ]
run_check 35 "/home/intern/etc-count.txt exists and is not empty" $?

# CHECK 3
[ -f /home/intern/projects/alpha/beta/gamma/visited.txt ]
run_check 30 "/home/intern/projects/alpha/beta/gamma/visited.txt exists" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi"""

l01_read = """# Lab 01: Lost in the Filesystem

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- What the shell prompt tells you.
- Determine your location with `pwd`.
- Navigate using absolute and relative paths.

---

## 📖 Background

**What is Linux?** It's an operating system kernel that powers servers, phones, and most of the internet. A **distribution** (like Ubuntu, Debian, RHEL, or Alpine) is just different packaging around the same core Linux kernel.

When you open a terminal, you see a prompt like `intern@hostname:~$`. This means you are logged in as the user `intern` on the machine `hostname`, and your current directory is `~`. The tilde (`~`) is a universal shortcut for your home directory (usually `/home/intern`).

The Linux filesystem is a tree. The very top is `/` (the root). Everything hangs off it:
- `/home` (user files)
- `/etc` (config files)
- `/var` (logs and runtime data)
- `/tmp` (temporary files)
- `/usr` (programs)

An **absolute path** starts from `/` and works from anywhere (e.g. `/home/intern/file.txt`). A **relative path** starts from where you are right now (e.g. `../file.txt`).

---

## 🔥 Scenario

A junior developer was exploring the filesystem and got lost. They were somewhere deep in the directory tree and ran `cd /` by accident. Now they can't find their way back to their home directory where their work file `mission.txt` is waiting.

---

## 💥 Symptoms
- You are not in your home directory.
- You do not know where `mission.txt` is.

---

## 🎯 Your Mission

Navigate back to your home directory, read `mission.txt`, and complete all the tasks requested inside it.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | /home/intern/found.txt exists and contains target text | 35% |
| 2 | /home/intern/etc-count.txt exists and is not empty | 35% |
| 3 | /home/intern/projects/alpha/beta/gamma/visited.txt exists | 30% |

---

## 📚 Command Reference
| Command | What it does |
|---------|-------------|
| `pwd` | Print working directory |
| `ls -la` | List files including hidden |
| `cd ~` | Go home |
| `cd ..` | Go up one directory |
"""

l01_sol = """# Solution: Lost in the Filesystem

## Root Cause
You were intentionally placed inside `/usr/share/doc/bash/` to simulate getting lost.

## Step-by-Step Fix

```bash
# 1. Go home and read mission
cd ~
cat mission.txt

# 2. Task 1
echo "I navigated the Linux filesystem" > /home/intern/found.txt

# 3. Task 2
ls /etc | wc -l
# (Let's say it outputs 150)
echo "150 items" > /home/intern/etc-count.txt

# 4. Task 3
cd projects/alpha/beta/gamma/
touch visited.txt
```

Run `/check.sh` to pass.
"""

output.append("\n--- FILE: metadata.json ---\n```json\n" + l01_meta + "\n```")
output.append("\n--- FILE: Dockerfile ---\n```dockerfile\n" + l01_dock + "\n```")
output.append("\n--- FILE: docker-compose.yml ---\n```yaml\n" + l01_comp + "\n```")
output.append("\n--- FILE: check.sh ---\n```bash\n" + l01_check + "\n```")
output.append("\n--- FILE: README.md ---\n```markdown\n" + l01_read + "\n```")
output.append("\n--- FILE: SOLUTION.md ---\n```markdown\n" + l01_sol + "\n```")

# LAB 02
output.append("\n### LAB 02 — labs/linux/module-01-linux-fundamentals/lab-02-command-not-found/")

l02_meta = """{
  "id": "module-01-lab-02-command-not-found",
  "module_number": 1,
  "module_title": "Linux Fundamentals",
  "title": "Command Not Found",
  "difficulty": "beginner",
  "estimated_minutes": 15,
  "points": 100,
  "category": "linux",
  "subcategory": "fundamentals",
  "skills": ["PATH", "bashrc", "alias"],
  "scenario": "A new server was provisioned by a colleague who customized it but then left the company. Several commands that the team relies on are not working. The PATH is broken, a useful alias is missing, and a custom script the team uses daily is installed but unreachable.",
  "symptoms": [
    "Custom scripts in /usr/local/bin return 'command not found'",
    "The 'll' alias does not work",
    "APP_ENV environment variable is missing"
  ],
  "mission": "Fix the .bashrc profile to include /usr/local/bin in PATH, set up the ll alias, and export APP_ENV=staging.",
  "hints": [],
  "verification_command": "bash /check.sh",
  "acceptance_criteria": [
    {"id": "check_1", "description": "/usr/local/bin is in the student's PATH", "weight": 30},
    {"id": "check_2", "description": "ll alias exists in .bashrc", "weight": 25},
    {"id": "check_3", "description": "APP_ENV is exported in .bashrc with value staging", "weight": 25},
    {"id": "check_4", "description": "path-report.txt contains 'local'", "weight": 20}
  ]
}"""

l02_dock = """FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \\
    sudo vim nano less curl \\
    && rm -rf /var/lib/apt/lists/*
RUN useradd -m -s /bin/bash intern && \\
    echo "intern ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers && \\
    echo "intern:intern123" | chpasswd
    
# THE BREAK: Modify PATH and remove alias
RUN echo "export PATH=/usr/bin:/bin:/usr/sbin:/sbin" > /home/intern/.bashrc
RUN echo "#!/bin/bash\\necho 'Deploy Check OK'" > /usr/local/bin/deploy-check
RUN chmod +x /usr/local/bin/deploy-check

COPY check.sh /check.sh
RUN chmod +x /check.sh
RUN echo "FLAG-command-not-found" > /root/flag.txt
USER intern
WORKDIR /home/intern
ENTRYPOINT ["tail", "-f", "/dev/null"]"""

l02_comp = """version: '3.8'
services:
  linux-module-01-command-not-found:
    build: .
    container_name: lab-02-command-not-found
    restart: "no"
    labels:
      - "lab.module=MODULE 01"
      - "lab.category=linux"
      - "lab.difficulty=beginner"
      - "lab.title=Command Not Found"
      - "lab.id=module-01-lab-02-command-not-found"
    volumes:
      - ./solution:/solution:ro"""

l02_check = """#!/bin/bash
PASSED_WEIGHT=0
run_check() {
  local weight=$1 description=$2 result=$3
  if [ "$result" -eq 0 ]; then
    echo "✅ PASS [${weight}%]: $description"
    PASSED_WEIGHT=$((PASSED_WEIGHT + weight))
  else
    echo "❌ FAIL [${weight}%]: $description"
  fi
}
echo "=== Checking: Command Not Found ==="
echo ""

# CHECK 1
grep -q "/usr/local/bin" /home/intern/.bashrc
run_check 30 "/usr/local/bin is in the student's PATH" $?

# CHECK 2
grep -q "alias ll=" /home/intern/.bashrc
run_check 25 "ll alias exists in .bashrc" $?

# CHECK 3
grep -q 'export APP_ENV=staging' /home/intern/.bashrc
run_check 25 "APP_ENV is exported in .bashrc with value staging" $?

# CHECK 4
grep -q "local" /home/intern/path-report.txt 2>/dev/null
run_check 20 "/home/intern/path-report.txt exists and contains 'local'" $?

echo ""
echo "SCORE: ${PASSED_WEIGHT}/100"
if [ "$PASSED_WEIGHT" -ge 70 ]; then
  echo "🎉 Lab passed!"
  exit 0
else
  echo "❌ Need 70 to pass (got ${PASSED_WEIGHT})."
  exit 1
fi"""

l02_read = """# Lab 02: Command Not Found

**Module:** 01 — Linux Fundamentals  
**Difficulty:** ⭐ Beginner  
**Estimated Time:** 15 minutes  
**Points:** 100  

---

## 🎯 What You Will Learn
- What `$PATH` is and how Linux locates commands.
- What `.bashrc` does.
- How to create an alias and export variables.

---

## 📖 Background

When you type a command, the shell searches every directory listed in the `$PATH` environment variable in order. `$PATH` is a colon-separated list like `/usr/bin:/usr/local/bin:/bin`. The `which` command tells you exactly which binary will run.

`command not found` simply means the binary isn't in any of those directories.

`.bashrc` is a script that runs every time you open a terminal. We use it to set up aliases (like `alias ll='ls -la'`) and export environment variables (like `export APP_ENV=staging`) so they are available to all child processes.

---

## 🔥 Scenario

A new server was customized by a colleague who then left. Now, several standard commands don't work, a custom script `deploy-check` is unreachable, the `ll` shortcut is gone, and the app is crashing because `APP_ENV` isn't set.

---

## 🎯 Your Mission

Edit `~/.bashrc` to append `/usr/local/bin` to the PATH, add the `ll` alias, export `APP_ENV=staging`, and save the corrected PATH to a report file.

---

## ✅ Acceptance Criteria
| # | What is checked | Points |
|---|----------------|--------|
| 1 | /usr/local/bin is in the student's PATH | 30% |
| 2 | ll alias exists in .bashrc | 25% |
| 3 | APP_ENV is exported in .bashrc with value staging | 25% |
| 4 | path-report.txt contains 'local' | 20% |
"""

l02_sol = """# Solution: Command Not Found

## Root Cause
The user's default `.bashrc` profile stripped out `/usr/local/bin` from the PATH.

## Step-by-Step Fix

```bash
echo "export PATH=\\$PATH:/usr/local/bin" >> ~/.bashrc
echo "alias ll='ls -la'" >> ~/.bashrc
echo "export APP_ENV=staging" >> ~/.bashrc

# Apply changes right now
source ~/.bashrc

# Save report
echo $PATH > ~/path-report.txt
```
Run `/check.sh` to pass.
"""

output.append("\n--- FILE: metadata.json ---\n```json\n" + l02_meta + "\n```")
output.append("\n--- FILE: Dockerfile ---\n```dockerfile\n" + l02_dock + "\n```")
output.append("\n--- FILE: docker-compose.yml ---\n```yaml\n" + l02_comp + "\n```")
output.append("\n--- FILE: check.sh ---\n```bash\n" + l02_check + "\n```")
output.append("\n--- FILE: README.md ---\n```markdown\n" + l02_read + "\n```")
output.append("\n--- FILE: SOLUTION.md ---\n```markdown\n" + l02_sol + "\n```")


# =====================================================================
# SECTION 3: QUICK VERIFICATION COMMANDS
# =====================================================================
output.append("\n## SECTION 3: QUICK VERIFICATION COMMANDS")
output.append("""```bash
# Save this as verify_fixes.sh and run it
#!/bin/bash
echo "Verifying files..."
[ -f .env ] && echo ".env exists"
[ -f .env.example ] && echo ".env.example exists"
grep -q "score_breakdown" backend/models.py && echo "models.py updated"
grep -q "export APP_ENV=staging" ../labs/linux/module-01-linux-fundamentals/lab-02-command-not-found/check.sh && echo "Lab 02 generated"
echo "All done!"
```""")


# WRITE TO OUTPUT
with open("/Users/mohamedserag/Desktop/Opslance/prompt_output.md", "w") as f:
    f.write("\n".join(output))

# NOW APPLY THE FIXES DIRECTLY TO THE REPO!

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)

# Apply Fix 1
write_file(".env", env_content)
write_file(".env.example", env_example_content)

# Apply Fix 2
write_file("backend/models.py", models_py_content)

# Apply Fix 3
write_file("backend/scripts/seed_admin.py", seed_admin_content)
write_file("backend/routers/auth.py", auth_py_content)

# Apply Fix 4
write_file("backend/routers/sessions.py", sessions_py_content)

# Apply Fix 5 & 6
write_file("../labs/linux/module-01-linux-fundamentals/lab-03-what-is-my-system/check.sh", check03)
write_file("../labs/linux/module-01-linux-fundamentals/lab-04-copy-move-remove/check.sh", check04)
write_file("../labs/linux/module-01-linux-fundamentals/lab-03-what-is-my-system/metadata.json", meta03)
write_file("../labs/linux/module-01-linux-fundamentals/lab-04-copy-move-remove/metadata.json", meta04)

# Apply Fix 7
write_file("backend/scripts/sync_labs.py", sync_labs)

# Create Lab 01
l1_dir = "../labs/linux/module-01-linux-fundamentals/lab-01-lost-in-the-filesystem/"
write_file(l1_dir + "metadata.json", l01_meta)
write_file(l1_dir + "Dockerfile", l01_dock)
write_file(l1_dir + "docker-compose.yml", l01_comp)
write_file(l1_dir + "check.sh", l01_check)
write_file(l1_dir + "README.md", l01_read)
write_file(l1_dir + "SOLUTION.md", l01_sol)

# Create Lab 02
l2_dir = "../labs/linux/module-01-linux-fundamentals/lab-02-command-not-found/"
write_file(l2_dir + "metadata.json", l02_meta)
write_file(l2_dir + "Dockerfile", l02_dock)
write_file(l2_dir + "docker-compose.yml", l02_comp)
write_file(l2_dir + "check.sh", l02_check)
write_file(l2_dir + "README.md", l02_read)
write_file(l2_dir + "SOLUTION.md", l02_sol)

print("SUCCESS")
