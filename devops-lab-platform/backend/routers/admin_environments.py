from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from dependencies import require_admin
import docker

router = APIRouter()

try:
    client = docker.from_env()
except:
    client = None

@router.get("")
def get_environments(db: Session = Depends(get_db), admin=Depends(require_admin)):
    sessions = db.query(models.LabSession).filter(models.LabSession.status == "running").all()
    res = []
    for s in sessions:
        res.append({
            "session_id": s.id,
            "student_name": s.student.full_name,
            "lab_title": s.lab.title if s.lab else s.lab_id,
            "started_at": s.started_at,
            "expires_at": s.expires_at,
            "container_name": s.container_name,
            "status": "running"
        })
    return res

@router.delete("/{container_name}")
def kill_environment(container_name: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    if not client:
        raise HTTPException(500, "Docker client unavailable")
    try:
        container = client.containers.get(container_name)
        container.stop()
        container.remove()
    except Exception as e:
        pass # Ignore if not found
    
    db.query(models.LabSession).filter_by(container_name=container_name).update({"status": "killed"})
    db.commit()
    return {"status": "killed"}
