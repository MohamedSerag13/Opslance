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

@router.get("/progress/summary")
def get_progress_summary(db: Session = Depends(get_db), student=Depends(get_current_student)):
    completed_labs = db.query(models.Submission.lab_id).filter_by(
        student_id=student.id, passed=True
    ).distinct().all()
    total_completed = len(completed_labs)
    
    from sqlalchemy import func
    best_scores = db.query(
        models.Submission.lab_id,
        func.max(models.Submission.score).label("best_score")
    ).filter_by(student_id=student.id, passed=True).group_by(models.Submission.lab_id).all()
    total_points = sum(score.best_score for score in best_scores)
    
    streak = student.current_streak
    
    total_active_labs_count = db.query(models.Lab).filter_by(is_globally_active=True).count()
    completion_percentage = int((total_completed / total_active_labs_count * 100)) if total_active_labs_count > 0 else 0
    
    return {
        "total_labs_completed": total_completed,
        "total_points": total_points,
        "current_streak": streak,
        "completion_percentage": completion_percentage,
        "subscription_tier": getattr(student, "subscription_tier", "free")
    }

@router.get("/progress/modules")
def get_progress_modules(db: Session = Depends(get_db), student=Depends(get_current_student)):
    labs = db.query(models.Lab).filter_by(is_globally_active=True).order_by(models.Lab.module_number.asc(), models.Lab.id.asc()).all()
    submissions = db.query(models.Submission).filter_by(student_id=student.id).all()
    
    active_sessions = db.query(models.LabSession).filter_by(student_id=student.id).all()
    session_map = {s.lab_id: s.status for s in active_sessions}
    
    sub_map = {}
    for s in submissions:
        sub_map.setdefault(s.lab_id, []).append(s)
        
    modules = {}
    for lab in labs:
        lab_subs = sub_map.get(lab.id, [])
        is_completed = any(s.passed for s in lab_subs)
        
        if is_completed:
            status = "completed"
        elif lab_subs or session_map.get(lab.id) == "running":
            status = "in_progress"
        else:
            status = "not_started"
            
        best_score = max([s.score for s in lab_subs if s.passed], default=0) if is_completed else 0
        
        module_key = (lab.module_number, lab.module_title)
        modules.setdefault(module_key, []).append({
            "id": lab.id,
            "title": lab.title,
            "difficulty": lab.difficulty,
            "estimated_minutes": lab.estimated_minutes,
            "points": lab.points,
            "status": status,
            "best_score": best_score
        })
        
    res = []
    for (mod_num, mod_title), mod_labs in sorted(modules.items(), key=lambda x: x[0][0]):
        completed_count = sum(1 for l in mod_labs if l["status"] == "completed")
        res.append({
            "module_number": mod_num,
            "module_title": mod_title,
            "total_labs": len(mod_labs),
            "completed_labs": completed_count,
            "labs": mod_labs
        })
        
    return res

@router.get("/progress/activity")
def get_progress_activity(days: int = 30, db: Session = Depends(get_db), student=Depends(get_current_student)):
    from datetime import datetime, timedelta
    
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days - 1)
    
    submissions = db.query(models.Submission).filter(
        models.Submission.student_id == student.id,
        models.Submission.passed == True,
        models.Submission.submitted_at >= datetime.combine(start_date, datetime.min.time())
    ).all()
    
    daily_completions = {}
    for s in submissions:
        s_date = s.submitted_at.date()
        daily_completions.setdefault(s_date, set()).add(s.lab_id)
        
    res = []
    for i in range(days):
        current_day = start_date + timedelta(days=i)
        completed_count = len(daily_completions.get(current_day, set()))
        res.append({
            "date": current_day.isoformat(),
            "labs_completed": completed_count
        })
        
    return res
