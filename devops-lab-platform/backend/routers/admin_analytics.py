"""Admin analytics — one aggregate endpoint powering the /admin/analytics page.

Everything is computed from existing rows (students, submissions, lab
sessions, achievements, exam attempts) with SQL group-bys; no new tables.
Scope: `days` (default 30, capped at 90) drives the activity window.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from database import get_db
import models
from dependencies import require_admin

router = APIRouter()


@router.get("")
def get_analytics(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    window_start = datetime.now(timezone.utc) - timedelta(days=days)

    students = db.query(models.Student).all()
    submissions_q = db.query(models.Submission)

    # --- overview KPIs ---
    running_sessions = db.query(models.LabSession).filter(
        models.LabSession.status.in_(["running", "starting"])).count()
    labs_total = db.query(models.Lab).filter_by(is_globally_active=True).count()

    window_subs = submissions_q.filter(models.Submission.submitted_at >= window_start).all()
    active_student_ids = {s.student_id for s in window_subs}
    passed_all = submissions_q.filter(models.Submission.passed == True).all()  # noqa: E712
    avg_score_passed = (sum(s.score for s in passed_all) / len(passed_all)) if passed_all else 0

    overview = {
        "students_total": len(students),
        "students_active_window": len(active_student_ids),
        "groups_total": db.query(models.Group).count(),
        "labs_total": labs_total,
        "sessions_running": running_sessions,
        "submissions_total": submissions_q.count(),
        "submissions_window": len(window_subs),
        "passed_window": sum(1 for s in window_subs if s.passed),
        "pass_rate_all_time": round(len(passed_all) / submissions_q.count() * 100, 1) if submissions_q.count() else 0,
        "avg_score_passed": round(avg_score_passed, 1),
        "xp_total_awarded": sum(st.xp or 0 for st in students),
        "achievements_awarded": db.query(models.StudentAchievement).count(),
        "exam_attempts_total": db.query(models.ExamAttempt).count(),
    }

    # --- daily activity (submissions passed/failed + signups + active students) ---
    daily = {}
    for s in window_subs:
        d = s.submitted_at.date().isoformat()
        bucket = daily.setdefault(d, {"submissions": 0, "passed": 0, "students": set()})
        bucket["submissions"] += 1
        bucket["students"].add(s.student_id)
        if s.passed:
            bucket["passed"] += 1
    signup_counts = {}
    for st in students:
        if st.created_at:
            d = st.created_at.date().isoformat()
            if st.created_at >= window_start:
                signup_counts[d] = signup_counts.get(d, 0) + 1

    start_day = (datetime.now(timezone.utc) - timedelta(days=days - 1)).date()
    daily_series = []
    for i in range(days):
        d = (start_day + timedelta(days=i)).isoformat()
        b = daily.get(d)
        daily_series.append({
            "date": d,
            "submissions": b["submissions"] if b else 0,
            "passed": b["passed"] if b else 0,
            "active_students": len(b["students"]) if b else 0,
            "signups": signup_counts.get(d, 0),
        })

    # --- lab performance (attempt volume vs first-attempt pass rate) ---
    lab_rows = db.query(
        models.Submission.lab_id,
        func.count(models.Submission.id).label("attempts"),
        func.sum(case((models.Submission.passed == True, 1), else_=0)).label("passed"),  # noqa: E712
        func.count(func.distinct(models.Submission.student_id)).label("students"),
        func.avg(models.Submission.score).label("avg_score"),
    ).group_by(models.Submission.lab_id).all()
    labs_by_id = {l.id: l for l in db.query(models.Lab).all()}
    top_labs = []
    for r in sorted(lab_rows, key=lambda x: -x.attempts)[:12]:
        lab = labs_by_id.get(r.lab_id)
        top_labs.append({
            "lab_id": r.lab_id,
            "title": lab.title if lab else r.lab_id,
            "module_number": lab.module_number if lab else None,
            "difficulty": lab.difficulty if lab else None,
            "attempts": r.attempts,
            "students": r.students,
            "pass_rate": round((r.passed or 0) / r.attempts * 100, 1),
            "avg_score": round(float(r.avg_score or 0), 1),
        })

    # --- group comparison ---
    groups = []
    for g in db.query(models.Group).all():
        g_students = [st for st in students if st.group_id == g.id]
        g_ids = {st.id for st in g_students}
        g_subs = [s for s in submissions_q.all() if s.student_id in g_ids]
        g_passed = [s for s in g_subs if s.passed]
        best_by_student = {}
        for s in g_passed:
            best_by_student.setdefault(s.student_id, set()).add(s.lab_id)
        groups.append({
            "group_id": str(g.id),
            "name": g.name,
            "students": len(g_students),
            "active_window": len(g_ids & active_student_ids),
            "submissions": len(g_subs),
            "pass_rate": round(len(g_passed) / len(g_subs) * 100, 1) if g_subs else 0,
            "avg_labs_completed": round(
                sum(len(v) for v in best_by_student.values()) / len(g_students), 1
            ) if g_students else 0,
        })

    # --- recent submissions feed ---
    recent = []
    for s in submissions_q.order_by(models.Submission.submitted_at.desc()).limit(20).all():
        lab = labs_by_id.get(s.lab_id)
        student = next((st for st in students if st.id == s.student_id), None)
        recent.append({
            "lab_id": s.lab_id,
            "lab_title": lab.title if lab else s.lab_id,
            "student_name": student.full_name if student else "—",
            "score": s.score,
            "passed": s.passed,
            "attempt_number": s.attempt_number,
            "hints_used": s.hints_used,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        })

    return {
        "days": days,
        "overview": overview,
        "daily": daily_series,
        "top_labs": top_labs,
        "groups": groups,
        "recent": recent,
    }
