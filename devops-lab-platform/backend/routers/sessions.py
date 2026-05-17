from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
import models
from dependencies import get_current_student
from schemas import SessionCreate
import redis
import os
import json
import uuid

router = APIRouter()
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))

@router.post("")
def start_session(data: SessionCreate, db: Session = Depends(get_db), student=Depends(get_current_student)):
    existing = db.query(models.LabSession).filter_by(student_id=student.id, lab_id=data.lab_id, status="running").first()
    if existing:
        return {"session_id": existing.id}
    
    # Assign port (mock logic for now, in real life worker might assign or we track in db)
    # Actually just enqueue it
    session_id = uuid.uuid4()
    s = models.LabSession(id=session_id, student_id=student.id, lab_id=data.lab_id, status="starting")
    db.add(s)
    db.commit()
    
    job = {
        "type": "start_lab",
        "session_id": str(session_id),
        "student_id": str(student.id),
        "short_student_id": str(student.id)[:4],
        "student_name": student.full_name,
        "lab_id": data.lab_id
    }
    redis_client.lpush("lab_jobs", json.dumps(job))
    
    return {"session_id": session_id}

@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db), student=Depends(get_current_student)):
    s = db.query(models.LabSession).filter_by(id=session_id, student_id=student.id).first()
    if not s: raise HTTPException(404)
    return {
        "id": s.id,
        "status": s.status,
        "started_at": s.started_at,
        "expires_at": s.expires_at,
        "container_name": s.container_name
    }

@router.delete("/{session_id}")
def stop_session(session_id: str, db: Session = Depends(get_db), student=Depends(get_current_student)):
    s = db.query(models.LabSession).filter_by(id=session_id, student_id=student.id).first()
    if not s: raise HTTPException(404)
    job = {"type": "stop_lab", "session_id": str(s.id), "container_name": s.container_name, "student_id": str(student.id), "lab_id": s.lab_id}
    redis_client.lpush("lab_jobs", json.dumps(job))
    s.status = "stopped"
    db.commit()
    return {"status": "stopping"}

@router.post("/{session_id}/submit")
def submit_session(session_id: str, db: Session = Depends(get_db), student=Depends(get_current_student)):
    s = db.query(models.LabSession).filter_by(id=session_id, student_id=student.id).first()
    if not s or s.status != "running": raise HTTPException(400, "Session not running")
    
    # Enqueue a check job and wait, or do it synchronously if we have docker access
    job = {"type": "check_lab", "session_id": str(s.id), "container_name": s.container_name}
    redis_client.lpush("lab_jobs", json.dumps(job))
    
    # Normally we'd wait for result via pubsub, but let's mock it for immediate return
    return {"message": "Verification started. Check progress."}

@router.post("/{session_id}/hints/{n}")
def reveal_hint(session_id: str, n: int, db: Session = Depends(get_db), student=Depends(get_current_student)):
    return {"hint": f"Hint {n} details"}

@router.get("/{session_id}/history")
def get_history(session_id: str, db: Session = Depends(get_db), student=Depends(get_current_student)):
    cmds = db.query(models.CommandHistory).filter_by(session_id=session_id).order_by(models.CommandHistory.ran_at).all()
    return [{"command": c.command, "ran_at": c.ran_at} for c in cmds]
