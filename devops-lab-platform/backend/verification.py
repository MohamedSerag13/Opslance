"""Shared verification + gamification pipeline for the classic lab flow and the
question-by-question runner.

Container access is delegated to the lab-manager's internal API so the backend
never needs the Docker socket (it can neither spawn nor exec in containers
directly). The internal API is only reachable on the compose network and is
guarded by the shared LAB_API_TOKEN.
"""
import json
import os
import re
import urllib.request
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session as DBSession

import models
from auth import utcnow
from database import SessionLocal
from dependencies import redis_client
from email_service import send_lab_completion_email_task
from logging_setup import get_logger

logger = get_logger("verification")

LAB_MANAGER_URL = os.getenv("LAB_MANAGER_URL", "").rstrip("/")
LAB_API_TOKEN = os.getenv("LAB_API_TOKEN", "")


def exec_in_container(container_name: str, command: str):
    """Run a command inside the student's container. Returns (exit_code, output).

    Proxied to lab-manager over the internal network; raises HTTPException with
    stable messages the frontend already handles."""
    if not LAB_MANAGER_URL:
        raise HTTPException(503, "Verification service is not available")
    if not container_name:
        raise HTTPException(400, "Container not assigned yet — lab may still be starting")
    try:
        req = urllib.request.Request(
            f"{LAB_MANAGER_URL}/internal/exec",
            method="POST",
            data=json.dumps({"container": container_name, "cmd": command}).encode(),
            headers={"Content-Type": "application/json", "X-Lab-Token": LAB_API_TOKEN},
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode())
        return int(body.get("exit_code", 1)), body.get("output", "")
    except HTTPException:
        raise
    except Exception as e:
        # Internal detail stays in the log; the client gets a stable message.
        logger.error("lab_exec_proxy_failed", error=str(e), container=container_name)
        raise HTTPException(400, "Container not found — it may have expired")


def run_verification_in_container(container_name: str, lab_points: int):
    exit_code, output = exec_in_container(container_name, "bash /check.sh")
    passed = (exit_code == 0)

    # Parse SCORE line from check.sh output: "SCORE: 80/100"
    score = 0
    score_match = re.search(r"SCORE:\s*(\d+)/\d+", output)
    if score_match:
        score = int(score_match.group(1))
    elif passed:
        score = lab_points

    return passed, score, output


def record_passed_submission(db: DBSession, background_tasks, student, s, score: int,
                             output: str, hints_used: int, time_taken, attempt_number: int):
    """Submission row + XP/level/streak/leaderboard/achievements/email for a PASSED
    lab. Shared by the classic submit flow and the runner's finish endpoint so both
    award identical gamification. Caller is responsible for db.commit()."""
    from achievements import award_progress_achievements
    from routers.websocket import event_manager

    s.status = "submitted"

    # --- Gamification Logic ---
    # 1. Update XP and Level
    student_obj = db.query(models.Student).filter_by(id=student.id).first()
    student_obj.xp += score
    new_level = 1 + (student_obj.xp // 100)
    if new_level > student_obj.level:
        student_obj.level = new_level

    # 2. Daily Streak
    today = utcnow().date()
    if student_obj.last_activity_date:
        last_date = student_obj.last_activity_date.date()
        if last_date == today - timedelta(days=1):
            student_obj.current_streak += 1
            if student_obj.current_streak > student_obj.longest_streak:
                student_obj.longest_streak = student_obj.current_streak
        elif last_date < today - timedelta(days=1):
            student_obj.current_streak = 1
    else:
        student_obj.current_streak = 1
    student_obj.last_activity_date = utcnow()

    # 3. Redis Leaderboard
    group_id = str(student.group_id) if student.group_id else "global"
    redis_client.zincrby(f"leaderboard:all_time:{group_id}", score, str(student.id))
    redis_client.zincrby(f"leaderboard:session:{group_id}", score, str(student.id))

    # 4. Badges — one IN query instead of three per-submission lookups.
    #    (first_deploy / speed_demon / zero_downtime)
    candidate_ids = ["first_deploy", "speed_demon", "zero_downtime"]
    already = {
        row[0] for row in db.query(models.StudentAchievement.achievement_id).filter(
            models.StudentAchievement.student_id == student.id,
            models.StudentAchievement.achievement_id.in_(candidate_ids),
        ).all()
    }
    lab_points = s.lab.points if s.lab else 100
    eligible = {
        "first_deploy": True,
        "speed_demon": bool(time_taken and time_taken < 5),
        "zero_downtime": score == lab_points and attempt_number == 1,
    }
    xp_rewards = {"first_deploy": 50, "speed_demon": 100, "zero_downtime": 150}
    for ach_id in candidate_ids:
        if eligible[ach_id] and ach_id not in already:
            db.add(models.StudentAchievement(student_id=student.id, achievement_id=ach_id))
            student_obj.xp += xp_rewards[ach_id]

    # Milestone badges from accumulated state (level/streak/total XP); their
    # XP rewards can level the student up again, so recompute afterwards.
    if award_progress_achievements(db, student_obj):
        new_level = 1 + (student_obj.xp // 100)
        if new_level > student_obj.level:
            student_obj.level = new_level

    # 5. Broadcast leaderboard update
    background_tasks.add_task(event_manager.broadcast, {
        "type": "leaderboard_update",
        "group_id": group_id
    })

    # Trigger Lab Completion Email if not opted out
    if not getattr(student, "opt_out_completion", False):
        next_lab = db.query(models.Lab).filter(
            models.Lab.module_number >= s.lab.module_number,
            models.Lab.id != s.lab_id,
            models.Lab.is_globally_active == True
        ).order_by(models.Lab.module_number.asc(), models.Lab.id.asc()).first()

        next_lab_title = next_lab.title if next_lab else "Explore Catalog"
        next_lab_id = next_lab.id if next_lab else ""

        background_tasks.add_task(
            send_lab_completion_email_task,
            student.email,
            s.lab.title,
            score,
            next_lab_title,
            next_lab_id
        )


def ensure_achievement_catalog_on_startup() -> None:
    """Seed the achievement catalog once at application startup instead of on
    every successful submission (per-submission call removed)."""
    from achievements import ensure_achievement_catalog
    db = SessionLocal()
    try:
        ensure_achievement_catalog(db)
        logger.info("achievement_catalog_seeded")
    except Exception as e:
        logger.error("achievement_catalog_seed_failed", error=str(e))
        db.rollback()
    finally:
        db.close()
