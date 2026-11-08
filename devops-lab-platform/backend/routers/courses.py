"""Courses API — structured learning paths (CKA 8-week plan, Linux fundamentals).

A course is a wrapper around weeks/days of study items; students tick items
(read / course / lab) per day and their progress persists server-side, so the
plan survives browser refreshes and follows the student across devices.
"""
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Literal

from database import get_db
from dependencies import get_current_student
import models

router = APIRouter()

TICK_COLUMNS = {
    "read": models.StudentCourseProgress.tick_read,
    "course": models.StudentCourseProgress.tick_course,
    "lab": models.StudentCourseProgress.tick_lab,
}


class TickUpdate(BaseModel):
    week: int
    day_index: int
    tick: Literal["read", "course", "lab"]
    value: bool


def _get_active_course_or_404(db: Session, slug: str) -> models.Course:
    course = db.query(models.Course).filter_by(slug=slug, is_active=True).first()
    if not course:
        raise HTTPException(404, "Course not found")
    return course


def _week_days(week: models.CourseWeek) -> list:
    try:
        return json.loads(week.days or "[]")
    except Exception:
        return []


def _total_ticks(course: models.Course) -> int:
    """Number of tickable items across the whole course (from seed content)."""
    total = 0
    for week in course.weeks:
        for day in _week_days(week):
            total += len(day.get("items") or [])
    return total


def _student_ticks(db: Session, student_id, course_id: str) -> dict:
    """{(week_number, day_index): {"read": bool, "course": bool, "lab": bool}}"""
    rows = db.query(models.StudentCourseProgress).filter_by(
        student_id=student_id, course_id=course_id).all()
    return {
        (r.week_number, r.day_index): {
            "read": bool(r.tick_read),
            "course": bool(r.tick_course),
            "lab": bool(r.tick_lab),
        }
        for r in rows
    }


def _checked_count(ticks: dict, course: models.Course) -> int:
    checked = 0
    for week in course.weeks:
        for day in _week_days(week):
            day_ticks = ticks.get((week.week_number, day.get("day_index")), {})
            for item in day.get("items") or []:
                if day_ticks.get(item.get("tick")):
                    checked += 1
    return checked


@router.get("")
def list_courses(db: Session = Depends(get_db), student=Depends(get_current_student)):
    courses = db.query(models.Course).filter_by(is_active=True).order_by(models.Course.title).all()
    out = []
    for course in courses:
        ticks = _student_ticks(db, student.id, course.id)
        total = _total_ticks(course)
        checked = _checked_count(ticks, course)
        out.append({
            "id": course.id,
            "slug": course.slug,
            "title": course.title,
            "subtitle": course.subtitle,
            "author": course.author,
            "difficulty": course.difficulty or "intermediate",
            "exam_domain": course.exam_domain,
            "duration_weeks": course.duration_weeks,
            "hours_per_week": course.hours_per_week,
            "pass_mark": course.pass_mark,
            "cover_color": course.cover_color,
            "tags": json.loads(course.tags or "[]"),
            "weeks_count": len(course.weeks),
            "enrollment_pct": round(checked / total * 100) if total else 0,
        })
    return out


@router.get("/{slug}")
def get_course(slug: str, db: Session = Depends(get_db), student=Depends(get_current_student)):
    course = _get_active_course_or_404(db, slug)
    ticks = _student_ticks(db, student.id, course.id)
    weeks = []
    for week in course.weeks:
        days = _week_days(week)
        day_items_total = sum(len(d.get("items") or []) for d in days)
        day_items_done = sum(
            1 for d in days
            for item in (d.get("items") or [])
            if ticks.get((week.week_number, d.get("day_index")), {}).get(item.get("tick"))
        )
        weeks.append({
            "week_number": week.week_number,
            "title": week.title,
            "dates": week.dates,
            "focus": week.focus,
            "exam_domain": week.exam_domain,
            "gate": week.gate,
            "days": days,
            "items_total": day_items_total,
            "items_done": day_items_done,
        })
    total = sum(w["items_total"] for w in weeks)
    done = sum(w["items_done"] for w in weeks)
    return {
        "id": course.id,
        "slug": course.slug,
        "title": course.title,
        "subtitle": course.subtitle,
        "description": course.description,
        "author": course.author,
        "published_at": course.published_at.isoformat() if course.published_at else None,
        "difficulty": course.difficulty or "intermediate",
        "exam_domain": course.exam_domain,
        "duration_weeks": course.duration_weeks,
        "hours_per_week": course.hours_per_week,
        "pass_mark": course.pass_mark,
        "cover_color": course.cover_color,
        "tags": json.loads(course.tags or "[]"),
        "weeks": weeks,
        "ticks_total": total,
        "ticks_done": done,
        "enrollment_pct": round(done / total * 100) if total else 0,
    }


@router.get("/{slug}/progress")
def get_progress(slug: str, db: Session = Depends(get_db), student=Depends(get_current_student)):
    course = _get_active_course_or_404(db, slug)
    ticks = _student_ticks(db, student.id, course.id)
    return {
        "slug": course.slug,
        # flat map "week:day" -> {"read": bool, "course": bool, "lab": bool}
        "days": {f"{w}:{d}": v for (w, d), v in ticks.items()},
    }


@router.post("/{slug}/progress")
def set_tick(slug: str, data: TickUpdate, db: Session = Depends(get_db),
             student=Depends(get_current_student)):
    course = _get_active_course_or_404(db, slug)

    week = db.query(models.CourseWeek).filter_by(
        course_id=course.id, week_number=data.week).first()
    if not week:
        raise HTTPException(404, f"Week {data.week} not found")
    day_ids = {d.get("day_index") for d in _week_days(week)}
    if data.day_index not in day_ids:
        raise HTTPException(404, f"Day {data.day_index} not part of week {data.week}")

    row = db.query(models.StudentCourseProgress).filter_by(
        student_id=student.id, course_id=course.id,
        week_number=data.week, day_index=data.day_index).first()
    if row is None:
        row = models.StudentCourseProgress(
            student_id=student.id, course_id=course.id,
            week_number=data.week, day_index=data.day_index)
        db.add(row)

    column = TICK_COLUMNS[data.tick]
    setattr(row, column.key, data.value)
    row.updated_at = datetime.now(timezone.utc)
    db.commit()

    # return the refreshed day ticks so the client can reconcile optimistic state
    db.refresh(row)
    return {
        "week": data.week,
        "day_index": data.day_index,
        "ticks": {"read": bool(row.tick_read), "course": bool(row.tick_course), "lab": bool(row.tick_lab)},
    }
