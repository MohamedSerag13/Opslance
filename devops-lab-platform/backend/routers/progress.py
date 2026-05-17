from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
from dependencies import get_current_student

router = APIRouter()

@router.get("/progress")
def get_my_progress(db: Session = Depends(get_db), student=Depends(get_current_student)):
    subs = db.query(models.Submission).filter_by(student_id=student.id).all()
    res = []
    total_score = 0
    for s in subs:
        if s.passed:
            total_score += s.score
        res.append({
            "lab_id": s.lab_id,
            "title": s.lab.title if s.lab else s.lab_id,
            "score": s.score,
            "passed": s.passed,
            "hints_used": s.hints_used,
            "time_taken": s.time_taken_minutes,
            "submitted_at": s.submitted_at
        })
    return {"history": res, "total_score": total_score}

@router.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db), student=Depends(get_current_student)):
    if not student.group_id:
        return []
    
    group_students = db.query(models.Student).filter_by(group_id=student.group_id).all()
    board = []
    for st in group_students:
        subs = db.query(models.Submission).filter_by(student_id=st.id, passed=True).all()
        # count best score per lab
        scores = {}
        for s in subs:
            scores[s.lab_id] = max(scores.get(s.lab_id, 0), s.score)
        total = sum(scores.values())
        board.append({
            "student_id": st.id,
            "name": st.full_name,
            "total_score": total,
            "labs_completed": len(scores)
        })
    board.sort(key=lambda x: x["total_score"], reverse=True)
    for i, b in enumerate(board):
        b["rank"] = i + 1
    return board
