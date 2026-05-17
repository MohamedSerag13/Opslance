from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from schemas import GroupCreate, GroupUpdate, GroupListOut, GroupOut, ReorderLabs
from database import get_db
import models
from dependencies import require_admin
from sqlalchemy.sql import func

router = APIRouter()

@router.get("", response_model=List[GroupListOut])
def get_groups(db: Session = Depends(get_db), admin=Depends(require_admin)):
    groups = db.query(models.Group).all()
    res = []
    for g in groups:
        student_count = db.query(models.Student).filter(models.Student.group_id == g.id).count()
        labs_completed = 0  # Simplified for now
        res.append(GroupListOut(
            id=g.id, name=g.name, description=g.description, created_at=g.created_at,
            student_count=student_count, labs_completed=labs_completed, avg_score=0.0
        ))
    return res

@router.post("", response_model=GroupOut)
def create_group(data: GroupCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    g = models.Group(name=data.name, description=data.description)
    db.add(g)
    db.commit()
    db.refresh(g)
    return g

@router.get("/{group_id}", response_model=GroupOut)
def get_group(group_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    g = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not g: raise HTTPException(404)
    return g

@router.put("/{group_id}", response_model=GroupOut)
def update_group(group_id: str, data: GroupUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    g = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not g: raise HTTPException(404)
    g.name = data.name
    g.description = data.description
    db.commit()
    db.refresh(g)
    return g

@router.delete("/{group_id}")
def delete_group(group_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    g = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not g: raise HTTPException(404)
    # Move students to ungrouped
    db.query(models.Student).filter(models.Student.group_id == group_id).update({models.Student.group_id: None})
    db.delete(g)
    db.commit()
    return {"message": "deleted"}

@router.get("/{group_id}/labs")
def get_group_labs(group_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    labs = db.query(models.Lab).all()
    group_labs = db.query(models.GroupLab).filter(models.GroupLab.group_id == group_id).all()
    gl_map = {gl.lab_id: gl for gl in group_labs}
    
    res = []
    for lab in labs:
        gl = gl_map.get(lab.id)
        res.append({
            "lab_id": lab.id,
            "title": lab.title,
            "module_number": lab.module_number,
            "difficulty": lab.difficulty,
            "is_visible": gl.is_visible if gl else False,
            "unlock_order": gl.unlock_order if gl else 9999
        })
    return sorted(res, key=lambda x: (x["unlock_order"], x["module_number"]))

@router.put("/{group_id}/labs/{lab_id}")
def toggle_lab_visibility(group_id: str, lab_id: str, data: dict, db: Session = Depends(get_db), admin=Depends(require_admin)):
    gl = db.query(models.GroupLab).filter_by(group_id=group_id, lab_id=lab_id).first()
    if not gl:
        gl = models.GroupLab(group_id=group_id, lab_id=lab_id, is_visible=data.get("is_visible", False), unlock_order=data.get("unlock_order", 9999))
        db.add(gl)
    else:
        gl.is_visible = data.get("is_visible", gl.is_visible)
        gl.unlock_order = data.get("unlock_order", gl.unlock_order)
    db.commit()
    return {"status": "ok"}

@router.post("/{group_id}/labs/reorder")
def reorder_group_labs(group_id: str, data: ReorderLabs, db: Session = Depends(get_db), admin=Depends(require_admin)):
    for idx, lab_id in enumerate(data.lab_ids):
        gl = db.query(models.GroupLab).filter_by(group_id=group_id, lab_id=lab_id).first()
        if not gl:
            gl = models.GroupLab(group_id=group_id, lab_id=lab_id, is_visible=False, unlock_order=idx)
            db.add(gl)
        else:
            gl.unlock_order = idx
    db.commit()
    return {"status": "ok"}

@router.post("/{group_id}/labs/show-all")
def show_all_labs(group_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    labs = db.query(models.Lab).all()
    for lab in labs:
        gl = db.query(models.GroupLab).filter_by(group_id=group_id, lab_id=lab.id).first()
        if not gl:
            db.add(models.GroupLab(group_id=group_id, lab_id=lab.id, is_visible=True, unlock_order=lab.module_number))
        else:
            gl.is_visible = True
    db.commit()
    return {"status": "ok"}

@router.post("/{group_id}/labs/hide-all")
def hide_all_labs(group_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    db.query(models.GroupLab).filter_by(group_id=group_id).update({models.GroupLab.is_visible: False})
    db.commit()
    return {"status": "ok"}
