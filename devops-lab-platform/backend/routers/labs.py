from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from dependencies import get_current_student, rate_limit_student

router = APIRouter()

@router.get("")
def get_student_labs(db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    if not student.group_id:
        return []
    
    group_labs = db.query(models.GroupLab).filter_by(group_id=student.group_id, is_visible=True).order_by(models.GroupLab.unlock_order).all()
    
    res = []
    for gl in group_labs:
        lab = gl.lab
        # Check if done
        best_sub = db.query(models.Submission).filter_by(student_id=student.id, lab_id=lab.id, passed=True).order_by(models.Submission.score.desc()).first()
        status = "done" if best_sub else "start"
        
        # Simplified lock logic: just assume previous is done if strict order is required.
        # For now, just return them ordered.
        res.append({
            "id": lab.id,
            "module_number": lab.module_number,
            "module_title": lab.module_title,
            "title": lab.title,
            "difficulty": lab.difficulty,
            "estimated_minutes": lab.estimated_minutes,
            "points": lab.points,
            "status": status,
            "score": best_sub.score if best_sub else 0
        })
    return res

@router.get("/{lab_id}")
def get_lab_detail(lab_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    if not student.group_id: raise HTTPException(403)
    gl = db.query(models.GroupLab).filter_by(group_id=student.group_id, lab_id=lab_id, is_visible=True).first()
    if not gl: raise HTTPException(404, "Lab not visible")
    
    lab = gl.lab
    import json
    
    symptoms = []
    if lab.symptoms:
        try:
            symptoms = json.loads(lab.symptoms)
        except:
            symptoms = ["Various errors and misconfigurations."]
    else:
        symptoms = ["Various errors and misconfigurations."]

    return {
        "id": lab.id,
        "title": lab.title,
        "module": f"Module {lab.module_number}: {lab.module_title}",
        "difficulty": lab.difficulty,
        "estimated_minutes": lab.estimated_minutes,
        "points": lab.points,
        "scenario": lab.scenario or lab.description or "Resolve the issues as requested.",
        "symptoms": symptoms,
        "mission": lab.mission or "Fix the environment and ensure the check script passes."
    }
