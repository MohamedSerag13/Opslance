from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import models
from schemas import SessionCreate
from dependencies import rate_limit_student, require_admin, enforce_rate_limit, redis_client
import uuid
import json
import asyncio
import time as _time
from datetime import timedelta

from auth import utcnow
from logging_setup import get_logger
import verification

logger = get_logger("sessions")

router = APIRouter()

@router.post("/")
def create_session(data: SessionCreate, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    lab_id = data.lab_id

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

    import settings_service
    if tier == "pro":
        max_active = int(settings_service.get_setting(db, "max_running_sessions_pro"))
    else:
        max_active = int(settings_service.get_setting(db, "max_running_sessions_free"))
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
    passed, score, output = verification.run_verification_in_container(s.container_name, lab_points)

    message = "All checks passed! You are ready to submit." if passed else "Some checks failed. Read the output below to debug."

    return {
        "passed": passed,
        "score": score,
        "verification_output": output,
        "message": message
    }

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
    passed, score, output = verification.run_verification_in_container(s.container_name, lab_points)

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
        delta = utcnow() - s.started_at.replace(tzinfo=None)
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
        verification.record_passed_submission(db, background_tasks, student, s, score, output,
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
    import settings_service
    if not settings_service.get_setting(db, "hints_allowed"):
        raise HTTPException(403, "Hints are disabled for this platform.")
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
    queue_key = f"help_queue:{group_id}"
    req_data = {
        "student_id": str(student.id),
        "student_name": student.full_name,
        "lab_title": s.lab.title if s.lab else s.lab_id,
        "requested_at": int(_time.time()),
        "session_id": str(s.id)
    }

    # Check if already in queue
    if not redis_client.hexists(queue_key, str(student.id)):
        redis_client.hset(queue_key, str(student.id), json.dumps(req_data))

        # Broadcast to instructors (using the same event_manager)
        # Assuming event manager sends to all, frontend can filter by group_id
        from routers.websocket import event_manager
        # Sync endpoint — schedule the broadcast on the running loop when one
        # exists; otherwise the frontend still gets the queue on next poll.
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

def _extend_minutes(db: Session) -> int:
    import settings_service
    return int(settings_service.get_setting(db, "session_extend_minutes"))


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
        sess.expires_at = sess.expires_at + timedelta(minutes=_extend_minutes(db))
    else:
        sess.expires_at = utcnow() + timedelta(minutes=_extend_minutes(db))

    db.commit()
    return {"message": "Session extended successfully", "expires_at": sess.expires_at}
