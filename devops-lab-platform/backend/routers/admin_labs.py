from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from schemas import LabOut, LabUpdate
from database import get_db
import models
from dependencies import require_admin
import json
import os

router = APIRouter()

@router.get("", response_model=List[LabOut])
def get_labs(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(models.Lab).all()

@router.put("/{lab_id}", response_model=LabOut)
def update_lab(lab_id: str, data: LabUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    lab = db.query(models.Lab).filter(models.Lab.id == lab_id).first()
    if not lab: raise HTTPException(404)
    if data.points is not None: lab.points = data.points
    if data.estimated_minutes is not None: lab.estimated_minutes = data.estimated_minutes
    if data.difficulty is not None: lab.difficulty = data.difficulty
    db.commit()
    db.refresh(lab)
    return lab

@router.post("/sync")
def sync_labs(db: Session = Depends(get_db), admin=Depends(require_admin)):
    labs_dir = "/labs-repo"
    added = 0
    updated = 0
    if not os.path.exists(labs_dir):
        return {"added": 0, "updated": 0, "error": "labs-repo not mounted"}
    
    for root_dir, _, files in os.walk(labs_dir):
        if "docker-compose.yml" in files:
            meta = {}
            if "metadata.json" in files:
                meta_path = os.path.join(root_dir, "metadata.json")
                try:
                    with open(meta_path) as f:
                        meta = json.load(f)
                except Exception as e:
                    print(f"Error parsing {meta_path}: {e}")
            
            item = os.path.basename(root_dir)
            lab_id = meta.get("id", item)
            lab = db.query(models.Lab).filter_by(id=lab_id).first()
            
            if not lab:
                title = meta.get("title")
                if not title:
                    title = item.replace("-", " ").title()
                    
                lab = models.Lab(
                    id=lab_id,
                    module_number=meta.get("module_number", 0),
                    module_title=meta.get("module_title", "Uncategorized"),
                    title=title,
                    difficulty=meta.get("difficulty", "beginner"),
                    estimated_minutes=meta.get("estimated_minutes", 30),
                    points=meta.get("points", 10),
                    category=meta.get("category", "linux")
                )
                db.add(lab)
                added += 1
            else:
                if "title" in meta:
                    lab.title = meta["title"]
                updated += 1
    db.commit()
    return {"added": added, "updated": updated}
