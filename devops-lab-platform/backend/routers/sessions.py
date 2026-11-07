from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import models
from dependencies import get_current_student, rate_limit_student, require_admin, enforce_rate_limit
import uuid
import json
import redis
import os
import docker
from datetime import datetime, timedelta
from email_service import send_lab_completion_email_task
from achievements import ensure_achievement_catalog

router = APIRouter()
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))

@router.post("/")
def create_session(data: dict, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    lab_id = data.get("lab_id")
    if not lab_id:
        raise HTTPException(400, "lab_id required")

    lab = db.query(models.Lab).filter_by(id=lab_id).first()
    if not lab:
        raise HTTPException(404, "Lab not found")
        
    tier = getattr(student, "subscription_tier", "free") or "free"
    
    # Free tier restriction: access to Module 01 only
    if tier == "free" and lab.module_number != 1:
        raise HTTPException(status_code=403, detail="Free tier students can only access Module 01 labs. Upgrade to Pro to unlock all modules.")

    existing = db.query(models.LabSession).filter_by(student_id=student.id, lab_id=lab_id).first()
    if existing:
        if existing.status in ["expired", "submitted"]:
            db.delete(existing)
            db.commit()
        else:
            # Re-calling with a live session is idempotent — return it without
            # touching the active-limit or spawn limiter (nothing new spawns).
            return {"session_id": existing.id, "status": existing.status}

    # Enforce active session limit
    active_sessions = db.query(models.LabSession).filter(
        models.LabSession.student_id == student.id,
        models.LabSession.status.in_(["running", "starting"])
    ).count()

    max_active = 3 if tier == "pro" else 1
    if active_sessions >= max_active:
        raise HTTPException(status_code=400, detail=f"Active lab session limit reached ({active_sessions}/{max_active}). Please stop your other active lab first.")

    # Spawn hardening: 1 launch per 5s kills double-click bursts, and a fixed
    # window of 8 launches per 10 min caps container churn per student. Runs
    # only on the path that actually spawns a new container.
    enforce_rate_limit(f"spawn_gate:{student.id}", 1, 5,
                       "Please wait a few seconds between lab launches.")
    enforce_rate_limit(f"spawn:{student.id}", 8, 600,
                       "Too many labs launched recently — try again in a few minutes.")

    session_id = str(uuid.uuid4())
    sess = models.LabSession(id=session_id, student_id=student.id, lab_id=lab_id, status="starting")
    db.add(sess)
    db.commit()
    
    job = {
        "type": "start_lab",
        "session_id": session_id,
        "student_id": str(student.id),
        "short_student_id": str(student.id)[:4],
        "lab_id": lab_id,
        "student_name": student.full_name
    }
    redis_client.lpush("lab_jobs", json.dumps(job))
    
    return {"session_id": session_id, "status": "starting"}

@router.get("/active/{lab_id}")
def get_active_session(lab_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = db.query(models.LabSession).filter_by(student_id=student.id, lab_id=lab_id).first()
    if not s:
        raise HTTPException(404, "No active session")
    return {
        "id": s.id,
        "status": s.status,
        "container_name": s.container_name,
        "expires_at": s.expires_at.isoformat() if s.expires_at else None
    }

@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(404, "Invalid Session ID")
        
    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    return {
        "id": s.id,
        "status": s.status,
        "container_name": s.container_name,
        "expires_at": s.expires_at.isoformat() if s.expires_at else None
    }

@router.delete("/{session_id}")
def stop_session(session_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(404, "Invalid Session ID")
        
    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404)
        
    job = {
        "type": "stop_lab",
        "student_id": str(student.id),
        "lab_id": s.lab_id
    }
    redis_client.lpush("lab_jobs", json.dumps(job))
    
    db.delete(s)
    db.commit()
    return {"message": "Session terminated"}

def exec_in_container(container_name: str, command: str):
    """Run a command inside the student's container. Returns (exit_code, output).
    Shared by the classic check/submit flow and the per-question runner checks."""
    try:
        docker_client = docker.from_env()
        container = docker_client.containers.get(container_name)
        exit_code, raw_output = container.exec_run(command, demux=False)
        output = raw_output.decode("utf-8", errors="replace") if raw_output else ""
        return exit_code, output
    except docker.errors.NotFound:
        raise HTTPException(400, "Container not found — it may have expired")
    except Exception as e:
        raise HTTPException(500, f"Verification error: {str(e)}")

def run_verification_in_container(container_name: str, lab_points: int):
    exit_code, output = exec_in_container(container_name, "bash /check.sh")
    passed = (exit_code == 0)

    # Parse SCORE line from check.sh output: "SCORE: 80/100"
    score = 0
    import re
    score_match = re.search(r"SCORE:\s*(\d+)/\d+", output)
    if score_match:
        score = int(score_match.group(1))
    elif passed:
        score = lab_points

    return passed, score, output

@router.post("/{session_id}/check")
def check_session(session_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(404, "Invalid Session ID")

    # Check hardening: each exec into the lab container costs CPU on the host —
    # cap at 1 per 2s and 30 per 5 min per student (runner question-checks have
    # their own 40/5min + 2s gate below).
    enforce_rate_limit(f"check_gate:{student.id}", 1, 2,
                       "Slow down — you can re-check every 2 seconds.")
    enforce_rate_limit(f"check:{student.id}", 30, 300,
                       "Too many checks — wait a minute before checking again.")

    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    if s.status != "running":
        raise HTTPException(400, f"Session is not running (status: {s.status})")
    if not s.container_name:
        raise HTTPException(400, "Container not assigned yet — lab may still be starting")

    lab_points = s.lab.points if s.lab else 100
    passed, score, output = run_verification_in_container(s.container_name, lab_points)

    message = "All checks passed! You are ready to submit." if passed else "Some checks failed. Read the output below to debug."

    return {
        "passed": passed,
        "score": score,
        "verification_output": output,
        "message": message
    }

def _record_passed_submission(db: Session, background_tasks: BackgroundTasks, student, s, score: int,
                              output: str, hints_used: int, time_taken, attempt_number: int):
    """Submission row + XP/level/streak/leaderboard/achievements/email for a PASSED
    lab. Shared by the classic submit flow and the runner's finish endpoint so both
    award identical gamification. Caller is responsible for db.commit()."""
    s.status = "submitted"

    # --- Gamification Logic ---
    # 1. Update XP and Level
    student_obj = db.query(models.Student).filter_by(id=student.id).first()
    student_obj.xp += score
    new_level = 1 + (student_obj.xp // 100)
    if new_level > student_obj.level:
        student_obj.level = new_level

    # 2. Daily Streak
    today = datetime.now().date()
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
    student_obj.last_activity_date = datetime.now()

    # 3. Redis Leaderboard
    group_id = str(student.group_id) if student.group_id else "global"
    redis_client.zincrby(f"leaderboard:all_time:{group_id}", score, str(student.id))
    redis_client.zincrby(f"leaderboard:session:{group_id}", score, str(student.id))

    # 4. Award Badges — catalog seeded once so locked badges render in the UI
    ensure_achievement_catalog(db)

    # Check First Deploy
    if db.query(models.StudentAchievement).filter_by(student_id=student.id, achievement_id="first_deploy").count() == 0:
        db.add(models.StudentAchievement(student_id=student.id, achievement_id="first_deploy"))
        student_obj.xp += 50

    # Check Speed Demon
    if time_taken and time_taken < 5 and db.query(models.StudentAchievement).filter_by(student_id=student.id, achievement_id="speed_demon").count() == 0:
        db.add(models.StudentAchievement(student_id=student.id, achievement_id="speed_demon"))
        student_obj.xp += 100

    # Check Zero Downtime
    if score == (s.lab.points if s.lab else 100) and attempt_number == 1 and db.query(models.StudentAchievement).filter_by(student_id=student.id, achievement_id="zero_downtime").count() == 0:
        db.add(models.StudentAchievement(student_id=student.id, achievement_id="zero_downtime"))
        student_obj.xp += 150

    # Milestone badges from accumulated state (level/streak/total XP); their
    # XP rewards can level the student up again, so recompute afterwards.
    from achievements import award_progress_achievements
    if award_progress_achievements(db, student_obj):
        new_level = 1 + (student_obj.xp // 100)
        if new_level > student_obj.level:
            student_obj.level = new_level

    # 5. Broadcast leaderboard update
    from routers.websocket import event_manager
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


@router.post("/{session_id}/submit")
def submit_session(session_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(404, "Invalid Session ID")

    # Submissions write rows and trigger gamification — 10 per 5 min is far
    # above any legitimate retry loop.
    enforce_rate_limit(f"submit:{student.id}", 10, 300,
                       "Too many submissions — wait a minute before submitting again.")

    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    if s.status != "running":
        raise HTTPException(400, f"Session is not running (status: {s.status})")
    if not s.container_name:
        raise HTTPException(400, "Container not assigned yet — lab may still be starting")

    lab_points = s.lab.points if s.lab else 100
    passed, score, output = run_verification_in_container(s.container_name, lab_points)

    # Retrieve hints used from Redis
    redis_key = f"hint:{student.id}:{s.lab_id}"
    revealed_hints_raw = redis_client.get(redis_key)
    hints_used = 0
    if revealed_hints_raw:
        try:
            hints_used = len(json.loads(revealed_hints_raw))
        except Exception:
            hints_used = 0

    # Deduct 10 points per hint used, capped at 0
    score = max(0, score - (hints_used * 10))

    # Count previous attempts
    attempt_number = db.query(models.Submission).filter_by(
        session_id=s.id, student_id=student.id
    ).count() + 1

    # Calculate time taken
    time_taken = None
    if s.started_at:
        delta = datetime.utcnow() - s.started_at.replace(tzinfo=None)
        time_taken = int(delta.total_seconds() / 60)

    # Write submission record
    sub = models.Submission(
        session_id=s.id,
        student_id=student.id,
        lab_id=s.lab_id,
        attempt_number=attempt_number,
        passed=passed,
        verification_output=output,
        score=score,
        hints_used=hints_used,
        time_taken_minutes=time_taken,
    )
    db.add(sub)

    if passed:
        _record_passed_submission(db, background_tasks, student, s, score, output,
                                  hints_used, time_taken, attempt_number)

    db.commit()

    return {
        "passed": passed,
        "score": score,
        "verification_output": output,
        "attempt_number": attempt_number,
        "message": "🎉 Lab complete! Well done." if passed else "❌ Not quite — read the output above and try again.",
    }

@router.get("/{session_id}/hints")
def get_revealed_hints(session_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(404, "Invalid Session ID")
        
    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
        
    lab = db.query(models.Lab).filter_by(id=s.lab_id).first()
    if not lab or not lab.hints:
        return {"hints_revealed": 0, "score_preview": 100, "revealed_hints": []}
        
    hints = json.loads(lab.hints)
    
    redis_key = f"hint:{student.id}:{s.lab_id}"
    revealed_hints_raw = redis_client.get(redis_key)
    if revealed_hints_raw:
        try:
            revealed_hints_nums = json.loads(revealed_hints_raw)
        except Exception:
            revealed_hints_nums = []
    else:
        revealed_hints_nums = []
        
    revealed_hints_data = []
    for num in sorted(revealed_hints_nums):
        hint = next((h for h in hints if h.get("number") == num), None)
        if hint:
            revealed_hints_data.append({
                "number": num,
                "title": hint.get("title"),
                "hint": hint.get("content")
            })
            
    hints_revealed = len(revealed_hints_nums)
    points_deducted_so_far = hints_revealed * 10
    score_preview = max(0, 100 - points_deducted_so_far)
    
    return {
        "hints_revealed": hints_revealed,
        "score_preview": score_preview,
        "revealed_hints": revealed_hints_data
    }

@router.post("/{session_id}/hints/{n}")
def reveal_hint(session_id: str, n: int, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(404, "Invalid Session ID")
        
    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    lab = db.query(models.Lab).filter_by(id=s.lab_id).first()
    if not lab or not lab.hints:
        raise HTTPException(404, "No hints available for this lab")
    
    hints = json.loads(lab.hints)
    hint = next((h for h in hints if h.get("number") == n), None)
    if not hint:
        raise HTTPException(404, f"Hint {n} not found")
        
    redis_key = f"hint:{student.id}:{s.lab_id}"
    revealed_hints_raw = redis_client.get(redis_key)
    if revealed_hints_raw:
        try:
            revealed_hints = json.loads(revealed_hints_raw)
        except Exception:
            revealed_hints = []
    else:
        revealed_hints = []
        
    if n not in revealed_hints:
        revealed_hints.append(n)
        redis_client.setex(redis_key, 86400, json.dumps(revealed_hints))
        
    hints_revealed = len(revealed_hints)
    points_deducted_so_far = hints_revealed * 10
    score_preview = max(0, 100 - points_deducted_so_far)
        
    return {
        "number": n,
        "title": hint.get("title"),
        "hint": hint.get("content"),
        "hints_revealed": hints_revealed,
        "points_deducted_so_far": points_deducted_so_far,
        "score_preview": score_preview
    }

@router.post("/{session_id}/help")
def request_help(session_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(404, "Invalid Session ID")
        
    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
        
    group_id = str(student.group_id) if student.group_id else "global"
    
    # Store request in a Redis Hash to avoid duplicates, with timestamp
    import time
    queue_key = f"help_queue:{group_id}"
    req_data = {
        "student_id": str(student.id),
        "student_name": student.full_name,
        "lab_title": s.lab.title if s.lab else s.lab_id,
        "requested_at": int(time.time()),
        "session_id": str(s.id)
    }
    
    # Check if already in queue
    if not redis_client.hexists(queue_key, str(student.id)):
        redis_client.hset(queue_key, str(student.id), json.dumps(req_data))
        
        # Broadcast to instructors (using the same event_manager)
        # Assuming event manager sends to all, frontend can filter by group_id
        from routers.websocket import event_manager
        import asyncio
        # We need to run it safely, but this is a sync endpoint
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(event_manager.broadcast({"type": "help_requested", "group_id": group_id, "data": req_data}))
        except RuntimeError:
            pass # Ignore if no loop, frontend will poll or refresh anyway
            
    return {"message": "Help requested. An instructor will be with you shortly!"}

@router.get("/group/{group_id}/help")
def get_help_queue(group_id: str, admin=Depends(require_admin)):
    queue_key = f"help_queue:{group_id}"
    requests = redis_client.hgetall(queue_key)
    
    res = []
    for k, v in requests.items():
        res.append(json.loads(v))
        
    # Sort by oldest first
    res.sort(key=lambda x: x["requested_at"])
    return res

@router.delete("/group/{group_id}/help/{student_id}")
def resolve_help(group_id: str, student_id: str, admin=Depends(require_admin)):
    queue_key = f"help_queue:{group_id}"
    redis_client.hdel(queue_key, student_id)
    return {"message": "Resolved"}

@router.post("/{session_id}/extend")
def extend_session(session_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    if (getattr(student, "subscription_tier", "free") or "free") != "pro":
        raise HTTPException(status_code=403, detail="Session extension is a Pro tier exclusive feature")

    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Session ID")

    sess = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id, status="running").first()
    if not sess:
        raise HTTPException(status_code=404, detail="Active lab session not found")

    if sess.expires_at:
        sess.expires_at = sess.expires_at + timedelta(minutes=30)
    else:
        sess.expires_at = datetime.utcnow() + timedelta(minutes=30)

    db.commit()
    return {"message": "Session extended successfully", "expires_at": sess.expires_at}


# ---------------------------------------------------------------------------
# Question-by-question runner (lab.yaml schema v2 — see docs/AUTHORING_LABS.md)
#
# One attempt per lab session; per-question state persisted server-side so it
# survives refresh. Per-question checks run the SAME bash /check.sh as the
# classic flow and map its output lines to questions by order; finish() does
# one authoritative final run and records a Submission through the same
# gamification path as the classic submit.
# ---------------------------------------------------------------------------

import lab_content  # noqa: E402


def _valid_uuid(value: str):
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        return None


def _get_session_or_404(db: Session, student, session_id: str) -> models.LabSession:
    valid_id = _valid_uuid(session_id)
    if not valid_id:
        raise HTTPException(404, "Invalid Session ID")
    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    return s


def _get_attempt_or_404(db: Session, student, s: models.LabSession, attempt_id: str) -> models.ExamAttempt:
    valid_id = _valid_uuid(attempt_id)
    if not valid_id:
        raise HTTPException(404, "Attempt not found")
    attempt = db.query(models.ExamAttempt).filter_by(
        id=valid_id, session_id=s.id, student_id=student.id).first()
    if not attempt:
        raise HTTPException(404, "Attempt not found")
    return attempt


def _lab_questions_or_404(lab_id: str):
    content = lab_content.get_questions(lab_id)
    if not content or not content[1]:
        raise HTTPException(404, "This lab has no lab.yaml (schema v2) — the question runner is not available for it")
    return content  # (lab_meta, questions)


def _questions_for_attempt(attempt: models.ExamAttempt, questions: list) -> list:
    ids = json.loads(attempt.question_ids or "[]")
    return sorted([q for q in questions if q["id"] in set(ids)], key=lambda q: q.get("order", 0))


def _expire_if_needed(db: Session, s: models.LabSession, attempt: models.ExamAttempt,
                      lab_meta: dict, questions: list, student=None, background_tasks=None):
    if (attempt.status == "active" and attempt.mode == "exam" and attempt.expires_at
            and datetime.utcnow() >= attempt.expires_at.replace(tzinfo=None)):
        _finish_attempt(db, s, attempt, lab_meta, questions, student=student, background_tasks=background_tasks)


def _attempt_payload(db: Session, s: models.LabSession, attempt: models.ExamAttempt,
                     lab_meta: dict, questions: list) -> dict:
    states = {qs.question_id: qs for qs in attempt.question_states}
    items = []
    domains = {}
    live_earned = 0
    total_weight = 0

    for q in _questions_for_attempt(attempt, questions):
        st = states.get(q["id"])
        status = st.status if st else "unanswered"
        weight = int(q.get("weight") or 0)
        total_weight += weight
        if status == "passed":
            live_earned += weight
        dom = q.get("domain") or lab_meta.get("domain") or "general"
        agg = domains.setdefault(dom, {"domain": dom, "earned": 0, "total": 0, "questions": 0})
        agg["total"] += weight
        agg["questions"] += 1
        if status == "passed":
            agg["earned"] += weight

        hints = q.get("hints") or []
        revealed = min(st.hints_revealed if st else 0, len(hints))
        item = {
            "id": q["id"],
            "order": q.get("order"),
            "domain": dom,
            "weight": weight,
            "prompt": q.get("prompt"),
            "description": q.get("description"),
            "context": q.get("context"),
            "time_target_minutes": q.get("time_target_minutes"),
            "check_description": (q.get("check") or {}).get("description"),
            "hints_total": len(hints),
            "hints_revealed": revealed,
            "hints": [{"number": i + 1, "title": h.get("title"), "content": h.get("content")}
                      for i, h in enumerate(hints[:revealed])],
            "flagged": bool(st.flagged) if st else False,
            "status": status,
            "checks_run": st.checks_run if st else 0,
            "last_output": st.last_output if st else None,
        }
        if attempt.status == "completed":
            # review mode: full walkthrough once the attempt is over
            item["solution"] = q.get("solution")
            item["explanation"] = q.get("explanation")
        items.append(item)

    remaining = None
    if attempt.status == "active" and attempt.mode == "exam" and attempt.expires_at:
        remaining = max(0, int((attempt.expires_at.replace(tzinfo=None) - datetime.utcnow()).total_seconds()))

    completed = attempt.status == "completed"
    return {
        "id": str(attempt.id),
        "session_id": str(attempt.session_id),
        "lab_id": attempt.lab_id,
        "mode": attempt.mode,
        "status": attempt.status,
        "current_index": attempt.current_index,
        "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
        "expires_at": attempt.expires_at.isoformat() if attempt.expires_at else None,
        "finished_at": attempt.finished_at.isoformat() if attempt.finished_at else None,
        "remaining_seconds": remaining,
        "duration_seconds": attempt.duration_seconds,
        "pass_mark": attempt.pass_mark,
        "lab_title": lab_meta.get("title"),
        "questions_total": len(items),
        "score_total": attempt.score_total,
        "score_earned": attempt.score_earned if completed else live_earned,
        "passed": attempt.passed,
        "questions": items,
        "domain_breakdown": sorted(domains.values(), key=lambda d: -d["total"]),
    }


def _apply_check_result(db: Session, attempt: models.ExamAttempt, questions: list, results, force: bool = False) -> int:
    """Write per-question states from a mapped check run. force=True marks every
    question (final finish run); otherwise only failed/passed transitions are
    written per question by the caller. Returns number of updated rows."""
    states = {qs.question_id: qs for qs in attempt.question_states}
    updated = 0
    now = datetime.utcnow()
    for q, r in zip(questions, results):
        st = states.get(q["id"])
        if st is None or r is None:
            continue
        st.last_passed = r["passed"]
        st.last_output = f"{'PASS' if r['passed'] else 'FAIL'}: {r['description']}"
        st.updated_at = now
        if r["passed"]:
            if st.status != "passed":
                st.status = "passed"
                if not st.first_passed_at:
                    st.first_passed_at = now
                updated += 1
        else:
            if st.status == "unanswered":
                st.status = "failed"
                updated += 1
            elif st.status == "passed" and force:
                st.status = "failed"
                updated += 1
    return updated


def _finish_attempt(db: Session, s: models.LabSession, attempt: models.ExamAttempt,
                    lab_meta: dict, questions: list, student=None, background_tasks=None):
    """Complete an attempt: one authoritative final check.sh run (when the
    container is reachable) re-maps live state onto every question, then scores
    against the pass mark. On a pass it records a Submission through the same
    gamification path as the classic submit."""
    if attempt.status != "active":
        return
    final_output = None
    verified_final = False
    if s.status == "running" and s.container_name:
        try:
            _exit_code, final_output = exec_in_container(s.container_name, "bash /check.sh")
            results, mapped = lab_content.map_output_to_questions(final_output, questions)
            if mapped:
                _apply_check_result(db, attempt, questions, results, force=True)
                verified_final = True
        except HTTPException:
            final_output = None  # container gone — grade from stored per-question states

    states = {qs.question_id: qs for qs in attempt.question_states}
    ids = set(json.loads(attempt.question_ids or "[]"))
    score_total = 0
    score_earned = 0
    for q in questions:
        if q["id"] not in ids:
            continue
        w = int(q.get("weight") or 0)
        score_total += w
        st = states.get(q["id"])
        if st and st.status == "passed":
            score_earned += w

    attempt.score_total = score_total
    attempt.score_earned = score_earned
    percent = (score_earned / score_total * 100) if score_total else 0
    attempt.passed = percent >= attempt.pass_mark
    attempt.status = "completed"
    attempt.finished_at = datetime.utcnow()

    if attempt.passed and student is not None and background_tasks is not None:
        attempt_number = db.query(models.Submission).filter_by(
            session_id=s.id, student_id=student.id).count() + 1
        time_taken = None
        if attempt.started_at:
            delta = attempt.finished_at - attempt.started_at.replace(tzinfo=None)
            time_taken = int(delta.total_seconds() / 60)
        sub = models.Submission(
            session_id=s.id,
            student_id=student.id,
            lab_id=s.lab_id,
            attempt_number=attempt_number,
            passed=True,
            verification_output=final_output or "",
            score=score_earned,
            hints_used=0,
            time_taken_minutes=time_taken,
        )
        db.add(sub)
        _record_passed_submission(db, background_tasks, student, s, score_earned,
                                  final_output or "", hints_used=0,
                                  time_taken=time_taken, attempt_number=attempt_number)
    db.commit()


@router.post("/{session_id}/attempts")
def create_attempt(session_id: str, data: dict = None, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    if s.status != "running":
        raise HTTPException(400, f"Session is not running (status: {s.status})")

    mode = (data or {}).get("mode", "practice")
    if mode not in ("practice", "exam"):
        raise HTTPException(400, "mode must be 'practice' or 'exam'")

    lab_meta, questions = _lab_questions_or_404(s.lab_id)

    existing = db.query(models.ExamAttempt).filter_by(session_id=s.id, status="active").first()
    if existing:
        _expire_if_needed(db, s, existing, lab_meta, questions)
        if existing.status == "active":
            return _attempt_payload(db, s, existing, lab_meta, questions)

    duration_seconds = None
    expires_at = None
    if mode == "exam" and lab_meta.get("time_limit_minutes"):
        duration_seconds = int(lab_meta["time_limit_minutes"]) * 60
        expires_at = datetime.utcnow() + timedelta(seconds=duration_seconds)

    attempt = models.ExamAttempt(
        session_id=s.id,
        student_id=student.id,
        lab_id=s.lab_id,
        mode=mode,
        question_ids=json.dumps([q["id"] for q in questions]),
        pass_mark=int(lab_meta.get("pass_mark") or 70),
        score_total=int(lab_meta.get("total") or 100),
        duration_seconds=duration_seconds,
        expires_at=expires_at,
    )
    db.add(attempt)
    db.flush()
    for q in questions:
        db.add(models.QuestionState(attempt_id=attempt.id, question_id=q["id"]))
    db.commit()
    db.refresh(attempt)
    return _attempt_payload(db, s, attempt, lab_meta, questions)


@router.get("/{session_id}/attempts/active")
def get_active_attempt(session_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = db.query(models.ExamAttempt).filter_by(session_id=s.id, student_id=student.id, status="active").first()
    if not attempt:
        raise HTTPException(404, "No active attempt")
    lab_meta, questions = _lab_questions_or_404(s.lab_id)
    _expire_if_needed(db, s, attempt, lab_meta, questions, student=student, background_tasks=background_tasks)
    db.refresh(attempt)
    return _attempt_payload(db, s, attempt, lab_meta, questions)


@router.get("/{session_id}/attempts/{attempt_id}")
def get_attempt(session_id: str, attempt_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = _get_attempt_or_404(db, student, s, attempt_id)
    lab_meta, questions = _lab_questions_or_404(s.lab_id)
    _expire_if_needed(db, s, attempt, lab_meta, questions, student=student, background_tasks=background_tasks)
    db.refresh(attempt)
    return _attempt_payload(db, s, attempt, lab_meta, questions)


@router.patch("/{session_id}/attempts/{attempt_id}/questions/{question_id}")
def update_question(session_id: str, attempt_id: str, question_id: str, data: dict,
                    db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = _get_attempt_or_404(db, student, s, attempt_id)
    if attempt.status != "active":
        raise HTTPException(400, "Attempt is completed")
    qs = db.query(models.QuestionState).filter_by(attempt_id=attempt.id, question_id=question_id).first()
    if not qs:
        raise HTTPException(404, "Question not part of this attempt")

    if "flagged" in data:
        qs.flagged = bool(data["flagged"])
    if data.get("current"):
        _lab_meta, questions = _lab_questions_or_404(s.lab_id)
        idx = next((i for i, q in enumerate(_questions_for_attempt(attempt, questions))
                    if q["id"] == question_id), None)
        if idx is not None:
            attempt.current_index = idx
    db.commit()
    return {"ok": True, "question_id": question_id, "flagged": qs.flagged}


@router.post("/{session_id}/attempts/{attempt_id}/questions/{question_id}/check")
def check_question(session_id: str, attempt_id: str, question_id: str,
                   db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = _get_attempt_or_404(db, student, s, attempt_id)
    if attempt.status != "active":
        raise HTTPException(400, "Attempt is completed")
    if s.status != "running":
        raise HTTPException(400, f"Session is not running (status: {s.status})")
    if not s.container_name:
        raise HTTPException(400, "Container not assigned yet — lab may still be starting")

    # rate limit: max 40 checks / 5 min per attempt + 2s cooldown per question
    rl_key = f"qcheck:{student.id}:{attempt.id}"
    count = redis_client.get(rl_key)
    if count and int(count) >= 40:
        raise HTTPException(429, "Too many checks — wait a minute before checking again")
    pipe = redis_client.pipeline()
    pipe.incr(rl_key)
    pipe.expire(rl_key, 300)
    pipe.execute()
    gate_key = f"qcheck_gate:{student.id}:{attempt.id}:{question_id}"
    if not redis_client.set(gate_key, 1, nx=True, ex=2):
        raise HTTPException(429, "Slow down — you can re-check a question every 2 seconds")

    lab_meta, questions = _lab_questions_or_404(s.lab_id)
    q = next((q for q in _questions_for_attempt(attempt, questions) if q["id"] == question_id), None)
    if not q:
        raise HTTPException(404, "Question not part of this attempt")

    # Per-question validation: CKA checkers accept `bash /check.sh <n>` to grade a
    # single task — one check runs, not the whole lab. Falls back to a full check
    # + order mapping for checkers without single-task dispatch.
    _exit_code, output = exec_in_container(s.container_name, f"bash /check.sh {q['order']}")
    single = lab_content.parse_check_output(output)
    result = single[0] if len(single) == 1 else None
    if result is None:
        _ec, full_output = exec_in_container(s.container_name, "bash /check.sh")
        results, mapped = lab_content.map_output_to_questions(full_output, questions)
        result = results[q["order"] - 1] if mapped else None

    states = {qs.question_id: qs for qs in attempt.question_states}
    st = states.get(q["id"])
    if result is None:
        return {
            "question_id": q["id"],
            "mapped": False,
            "passed": None,
            "message": "Checker output could not be mapped to this question. "
                       "Per-question state was not changed.",
        }
    st.checks_run += 1
    st.last_passed = result["passed"]
    st.last_output = f"{'PASS' if result['passed'] else 'FAIL'}: {result['description']}"
    now = datetime.utcnow()
    if result["passed"]:
        st.status = "passed"
        if not st.first_passed_at:
            st.first_passed_at = now
    elif st.status != "failed":
        st.status = "failed"
    db.commit()

    live_earned = sum(int(qq.get("weight") or 0) for qq in _questions_for_attempt(attempt, questions)
                      if states[qq["id"]].status == "passed")
    return {
        "question_id": q["id"],
        "mapped": True,
        "passed": result["passed"],
        "status": st.status,
        "weight": q.get("weight"),
        "output": st.last_output,
        "score_earned": live_earned,
        "score_total": attempt.score_total,
        "message": f"✓ Passes — +{q.get('weight')} pts recorded for this question"
                   if result["passed"]
                   else "✕ Not passing yet — fix your cluster state, then check again.",
    }


@router.post("/{session_id}/attempts/{attempt_id}/questions/{question_id}/hint")
def reveal_question_hint(session_id: str, attempt_id: str, question_id: str,
                         db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = _get_attempt_or_404(db, student, s, attempt_id)
    if attempt.status != "active":
        raise HTTPException(400, "Attempt is completed")
    if attempt.mode == "exam":
        raise HTTPException(403, "Hints are disabled in exam mode")

    lab_meta, questions = _lab_questions_or_404(s.lab_id)
    q = next((q for q in _questions_for_attempt(attempt, questions) if q["id"] == question_id), None)
    if not q:
        raise HTTPException(404, "Question not part of this attempt")
    hints = q.get("hints") or []
    st = db.query(models.QuestionState).filter_by(attempt_id=attempt.id, question_id=question_id).first()
    if not st:
        raise HTTPException(404, "Question not part of this attempt")
    if st.hints_revealed >= len(hints):
        raise HTTPException(400, "No more hints for this question")

    st.hints_revealed += 1
    hint = hints[st.hints_revealed - 1]
    db.commit()
    return {
        "number": st.hints_revealed,
        "title": hint.get("title"),
        "content": hint.get("content"),
        "hints_revealed": st.hints_revealed,
        "hints_total": len(hints),
    }


@router.post("/{session_id}/attempts/{attempt_id}/finish")
def finish_attempt(session_id: str, attempt_id: str, background_tasks: BackgroundTasks,
                   db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = _get_attempt_or_404(db, student, s, attempt_id)
    if attempt.status != "active":
        raise HTTPException(400, "Attempt is already completed")
    lab_meta, questions = _lab_questions_or_404(s.lab_id)
    _finish_attempt(db, s, attempt, lab_meta, questions, student=student, background_tasks=background_tasks)
    db.refresh(attempt)
    return _attempt_payload(db, s, attempt, lab_meta, questions)


@router.post("/{session_id}/attempts/{attempt_id}/retry-failed")
def retry_failed_questions(session_id: str, attempt_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = _get_attempt_or_404(db, student, s, attempt_id)
    if attempt.status != "completed":
        raise HTTPException(400, "Finish the current attempt before retrying failed questions")
    lab_meta, questions = _lab_questions_or_404(s.lab_id)

    failed_ids = [qs.question_id for qs in attempt.question_states if qs.status != "passed"]
    if not failed_ids:
        raise HTTPException(400, "Nothing to retry — every question passed")

    duration_seconds = None
    expires_at = None
    if attempt.mode == "exam" and attempt.duration_seconds:
        duration_seconds = attempt.duration_seconds
        expires_at = datetime.utcnow() + timedelta(seconds=duration_seconds)

    retry = models.ExamAttempt(
        session_id=s.id,
        student_id=student.id,
        lab_id=s.lab_id,
        mode=attempt.mode,
        question_ids=json.dumps(failed_ids),
        pass_mark=attempt.pass_mark,
        score_total=sum(int(q.get("weight") or 0) for q in questions if q["id"] in set(failed_ids)),
        duration_seconds=duration_seconds,
        expires_at=expires_at,
    )
    db.add(retry)
    db.flush()
    for qid in failed_ids:
        db.add(models.QuestionState(attempt_id=retry.id, question_id=qid))
    db.commit()
    db.refresh(retry)
    return _attempt_payload(db, s, retry, lab_meta, questions)

