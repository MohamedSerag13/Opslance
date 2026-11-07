from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import json
import models
from tracks import TRACKS
from dependencies import get_current_student

router = APIRouter()


def _best_passed_scores(db: Session, student_id) -> dict:
    """lab_id -> best passing score."""
    from sqlalchemy import func
    rows = db.query(
        models.Submission.lab_id,
        func.max(models.Submission.score).label("best_score")
    ).filter_by(student_id=student_id, passed=True).group_by(models.Submission.lab_id).all()
    return {r.lab_id: r.best_score for r in rows}


def _daily_activity(db: Session, student_id, days: int) -> list:
    from datetime import datetime, timedelta
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days - 1)
    submissions = db.query(models.Submission).filter(
        models.Submission.student_id == student_id,
        models.Submission.passed == True,
        models.Submission.submitted_at >= datetime.combine(start_date, datetime.min.time())
    ).all()
    daily = {}
    for s in submissions:
        daily.setdefault(s.submitted_at.date(), set()).add(s.lab_id)
    return [
        {"date": (start_date + timedelta(days=i)).isoformat(),
         "labs_completed": len(daily.get(start_date + timedelta(days=i), set()))}
        for i in range(days)
    ]


def _leaderboard(db: Session, student) -> dict:
    """Group-scoped when the student has a group, global fallback otherwise.
    Returns the full ranked board; callers slice what they need."""
    if student.group_id:
        students = db.query(models.Student).filter_by(group_id=student.group_id).all()
        scope = "group"
    else:
        students = db.query(models.Student).all()
        scope = "global"

    board = []
    for st in students:
        scores = _best_passed_scores(db, st.id)
        board.append({
            "student_id": st.id,
            "name": st.full_name,
            "total_score": sum(scores.values()),
            "labs_completed": len(scores),
            "is_me": st.id == student.id,
        })
    board.sort(key=lambda x: x["total_score"], reverse=True)
    for i, b in enumerate(board):
        b["rank"] = i + 1
    my_rank = next((b["rank"] for b in board if b["is_me"]), None)
    return {"scope": scope, "total_students": len(board), "my_rank": my_rank, "board": board}


@router.get("/progress/dashboard")
def get_dashboard(db: Session = Depends(get_db), student=Depends(get_current_student)):
    """Single aggregate for the student dashboard: summary, continue-where-you-
    left-off items, certification-track progress, 12-week activity, leaderboard."""
    from datetime import datetime

    labs = db.query(models.Lab).filter_by(is_globally_active=True)\
        .order_by(models.Lab.module_number.asc(), models.Lab.id.asc()).all()
    labs_by_id = {l.id: l for l in labs}
    passed_scores = _best_passed_scores(db, student.id)
    attempted_ids = {s.lab_id for s in db.query(models.Submission.lab_id).filter_by(student_id=student.id).all()}
    board_data = _leaderboard(db, student)

    # --- summary (same math as /progress/summary) ---
    total_active = len(labs)
    summary = {
        "total_labs_completed": len(passed_scores),
        "total_points": sum(passed_scores.values()),
        "current_streak": student.current_streak,
        "completion_percentage": int(len(passed_scores) / total_active * 100) if total_active else 0,
        "subscription_tier": getattr(student, "subscription_tier", "free"),
    }

    # --- continue-where-you-left-off ---
    continue_items = []
    attempt_lab_ids = set()
    active_attempts = db.query(models.ExamAttempt).filter_by(
        student_id=student.id, status="active"
    ).order_by(models.ExamAttempt.started_at.desc()).all()
    # one IN query instead of a lookup per attempt (N+1)
    attempt_sessions = {
        s.id: s for s in db.query(models.LabSession).filter(
            models.LabSession.id.in_([a.session_id for a in active_attempts])
        ).all()
    } if active_attempts else {}
    for a in active_attempts:
        lab = labs_by_id.get(a.lab_id)
        sess = attempt_sessions.get(a.session_id)
        if not lab or not sess or sess.status != "running":
            continue
        attempt_lab_ids.add(a.lab_id)
        try:
            q_count = len(json.loads(a.question_ids or "[]"))
        except Exception:
            q_count = 0
        continue_items.append({
            "kind": "attempt",
            "lab_id": lab.id,
            "session_id": str(a.session_id),
            "attempt_id": str(a.id),
            "lab_title": lab.title,
            "module_number": lab.module_number,
            "mode": a.mode,
            "current_index": a.current_index,
            "question_count": q_count,
            "expires_at": a.expires_at,
        })

    running_sessions = db.query(models.LabSession).filter_by(
        student_id=student.id, status="running"
    ).order_by(models.LabSession.last_active_at.desc()).all()
    # cap at two running-session cards — a strip full of sessions would push the
    # "next up" card out entirely (strip has 4 slots total)
    for s in running_sessions[:2]:
        lab = labs_by_id.get(s.lab_id)
        if not lab or lab.id in attempt_lab_ids or any(i["lab_id"] == lab.id for i in continue_items):
            continue
        continue_items.append({
            "kind": "session",
            "lab_id": lab.id,
            "session_id": str(s.id),
            "lab_title": lab.title,
            "module_number": lab.module_number,
            "last_active_at": s.last_active_at,
        })

    # failed-but-not-passed labs, most recent failure first
    failed = {}
    for s in db.query(models.Submission).filter_by(student_id=student.id, passed=False)\
            .order_by(models.Submission.submitted_at.desc()).all():
        if s.lab_id not in failed and s.lab_id not in passed_scores:
            failed[s.lab_id] = s
    for lab_id, sub in list(failed.items())[:2]:
        lab = labs_by_id.get(lab_id)
        if not lab or any(i["lab_id"] == lab_id for i in continue_items):
            continue
        continue_items.append({
            "kind": "retry",
            "lab_id": lab.id,
            "lab_title": lab.title,
            "module_number": lab.module_number,
            "last_score": sub.score,
            "points": lab.points,
        })

    # next-up: first lab never passed and not currently open
    if len(continue_items) < 4:
        for lab in labs:
            if lab.id in passed_scores or lab.id in attempted_ids or lab.id in attempt_lab_ids:
                continue
            if any(i["lab_id"] == lab.id for i in continue_items):
                continue
            continue_items.append({
                "kind": "next",
                "lab_id": lab.id,
                "lab_title": lab.title,
                "module_number": lab.module_number,
                "difficulty": lab.difficulty,
                "points": lab.points,
                "estimated_minutes": lab.estimated_minutes,
            })
            break
    continue_items = continue_items[:4]

    # --- certification tracks ---
    tracks_res = []
    for track in TRACKS:
        mod_entries = []
        for n in track["module_numbers"]:
            mod_labs = [l for l in labs if l.module_number == n]
            if not mod_labs:
                continue
            completed = sum(1 for l in mod_labs if l.id in passed_scores)
            entry = {
                "module_number": n,
                "module_title": next(l.module_title for l in mod_labs),
                "total_labs": len(mod_labs),
                "completed_labs": completed,
                "points": sum(l.points for l in mod_labs),
            }
            if track["kind"] == "path":
                nxt = next((l for l in mod_labs if l.id not in passed_scores), None)
                if nxt:
                    entry["next_lab"] = {"lab_id": nxt.id, "title": nxt.title}
            if track["kind"] == "certification":
                entry["labs"] = [{
                    "lab_id": l.id,
                    "title": l.title,
                    "status": "completed" if l.id in passed_scores else ("in_progress" if l.id in attempted_ids or l.id in attempt_lab_ids else "not_started"),
                    "best_score": passed_scores.get(l.id, 0),
                    "points": l.points,
                    "estimated_minutes": l.estimated_minutes,
                } for l in mod_labs]
            mod_entries.append(entry)
        total_labs = sum(m["total_labs"] for m in mod_entries)
        done_labs = sum(m["completed_labs"] for m in mod_entries)
        tracks_res.append({
            "key": track["key"],
            "kind": track["kind"],
            "title": track["title"],
            "tagline": track["tagline"],
            "icon": track["icon"],
            "accent": track["accent"],
            "modules": mod_entries,
            "total_labs": total_labs,
            "completed_labs": done_labs,
            "completion": int(round(done_labs / total_labs * 100)) if total_labs else 0,
        })

    return {
        "summary": summary,
        "continue": continue_items,
        "tracks": tracks_res,
        "activity": _daily_activity(db, student.id, 84),
        "leaderboard": {
            "scope": board_data["scope"],
            "total_students": board_data["total_students"],
            "my_rank": board_data["my_rank"],
            "entries": board_data["board"][:5],
        },
    }

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
    return _leaderboard(db, student)["board"]

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
    return _daily_activity(db, student.id, days)
