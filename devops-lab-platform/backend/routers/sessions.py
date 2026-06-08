from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import models
from dependencies import get_current_student, rate_limit_student, require_admin
import uuid
import json
import redis
import os
import docker
from datetime import datetime, timedelta
from email_service import send_lab_completion_email_task

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
        
    # Enforce active session limit
    active_sessions = db.query(models.LabSession).filter(
        models.LabSession.student_id == student.id,
        models.LabSession.status.in_(["running", "starting"])
    ).count()
    
    max_active = 3 if tier == "pro" else 1
    if active_sessions >= max_active:
        raise HTTPException(status_code=400, detail=f"Active lab session limit reached ({active_sessions}/{max_active}). Please stop your other active lab first.")

    existing = db.query(models.LabSession).filter_by(student_id=student.id, lab_id=lab_id).first()
    if existing:
        if existing.status in ["expired", "submitted"]:
            db.delete(existing)
            db.commit()
        else:
            return {"session_id": existing.id, "status": existing.status}
        
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

def run_verification_in_container(container_name: str, lab_points: int):
    try:
        docker_client = docker.from_env()
        container = docker_client.containers.get(container_name)
        exit_code, raw_output = container.exec_run("bash /check.sh", demux=False)
        output = raw_output.decode("utf-8", errors="replace") if raw_output else ""
        passed = (exit_code == 0)
    except docker.errors.NotFound:
        raise HTTPException(400, "Container not found — it may have expired")
    except Exception as e:
        raise HTTPException(500, f"Verification error: {str(e)}")

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

@router.post("/{session_id}/submit")
def submit_session(session_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    try:
        valid_id = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(404, "Invalid Session ID")
        
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
        
        # 4. Award Badges
        # Pre-requisite: ensure achievements exist in DB
        first_deploy = db.query(models.Achievement).filter_by(id="first_deploy").first()
        if not first_deploy:
            db.add(models.Achievement(id="first_deploy", name="First Deploy", description="Completed your first lab", icon="🚀", xp_reward=50))
            db.add(models.Achievement(id="speed_demon", name="Speed Demon", description="Completed a lab in under 5 minutes", icon="⚡", xp_reward=100))
            db.add(models.Achievement(id="zero_downtime", name="Zero Downtime", description="Completed a lab with 100% score on first attempt", icon="💯", xp_reward=150))
            db.commit()

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

