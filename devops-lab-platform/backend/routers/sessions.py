from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from dependencies import get_current_student, rate_limit_student
import uuid
import json
import redis
import os
import docker
from datetime import datetime

router = APIRouter()
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))

@router.post("/")
def create_session(data: dict, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
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
        "student_id": str(student.id),
        "short_student_id": str(student.id)[:4],
        "lab_id": lab_id,
        "student_name": student.full_name
    }
    redis_client.lpush("lab_jobs", json.dumps(job))
    
    return {"session_id": session_id, "status": "starting"}

@router.get("/active/{lab_id}")
def get_active_session(lab_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = db.query(models.LabSession).filter_by(student_id=student.id, lab_id=lab_id).first()
    if not s:
        raise HTTPException(404, "No active session")
    return {
        "id": s.id,
        "status": s.status,
        "container_name": s.container_name
    }

@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(404, "Invalid Session ID")
        
    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    return {
        "id": s.id,
        "status": s.status,
        "container_name": s.container_name
    }

@router.delete("/{session_id}")
def stop_session(session_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(404, "Invalid Session ID")
        
    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404)
        
    job = {
        "type": "stop_lab",
        "student_id": str(student.id),
        "lab_id": s.lab_id
    }
    redis_client.lpush("lab_jobs", json.dumps(job))
    
    db.delete(s)
    db.commit()
    return {"message": "Session terminated"}

@router.post("/{session_id}/submit")
def submit_session(session_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(404, "Invalid Session ID")
        
    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
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
    score_match = re.search(r"SCORE:\s*(\d+)/\d+", output)
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
def reveal_hint(session_id: str, n: int, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(404, "Invalid Session ID")
        
    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    lab = db.query(models.Lab).filter_by(id=s.lab_id).first()
    if not lab or not lab.hints:
        raise HTTPException(404, "No hints available for this lab")
    
    hints = json.loads(lab.hints)
    hint = next((h for h in hints if h.get("number") == n), None)
    if not hint:
        raise HTTPException(404, f"Hint {n} not found")
        
    # Frontend expects res.data.hint
    return {"number": n, "title": hint.get("title"), "hint": hint.get("content")}
