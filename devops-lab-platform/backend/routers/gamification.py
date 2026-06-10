from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
import models
from dependencies import get_current_student, require_admin, redis_client
from datetime import datetime, date, timedelta
from routers.websocket import event_manager
import json

router = APIRouter()

@router.get("/profile")
def get_gamification_profile(student=Depends(get_current_student), db: Session = Depends(get_db)):
    achievements = db.query(models.StudentAchievement).filter_by(student_id=student.id).all()
    achievements_list = []
    for a in achievements:
        achievements_list.append({
            "id": a.achievement.id,
            "name": a.achievement.name,
            "icon": a.achievement.icon,
            "earned_at": a.earned_at
        })
    
    return {
        "xp": student.xp,
        "level": student.level,
        "current_streak": student.current_streak,
        "longest_streak": student.longest_streak,
        "achievements": achievements_list
    }

@router.get("/leaderboard/{scope}")
def get_leaderboard(scope: str, student=Depends(get_current_student), db: Session = Depends(get_db)):
    # scope can be 'session' or 'all_time'
    group_id = str(student.group_id) if student.group_id else "global"
    
    # Check if instructor challenge mode is active
    challenge_mode = redis_client.get(f"challenge_mode:{group_id}")
    if challenge_mode and challenge_mode.decode() == "active":
        frozen_data = redis_client.get(f"frozen_leaderboard:{group_id}:{scope}")
        if frozen_data:
            return json.loads(frozen_data.decode())

    # Get from Redis sorted set
    redis_key = f"leaderboard:{scope}:{group_id}"
    
    # We fetch top 50
    # ZREVRANGE returns list of member names
    # ZSCORE can get the score
    top_students = redis_client.zrevrange(redis_key, 0, 49, withscores=True)
    
    leaderboard = []
    rank = 1
    for student_id_bytes, score in top_students:
        student_id = student_id_bytes.decode()
        # get student name
        s = db.query(models.Student).filter_by(id=student_id).first()
        if s:
            leaderboard.append({
                "rank": rank,
                "student_id": s.id,
                "name": s.full_name,
                "score": int(score)
            })
            rank += 1
            
    return leaderboard

@router.get("/challenge_mode/{group_id}")
def get_challenge_mode(group_id: str, admin=Depends(require_admin), db: Session = Depends(get_db)):
    key = f"challenge_mode:{group_id}"
    status = redis_client.get(key)
    return {"active": status is not None and status.decode() == "active"}

@router.post("/challenge_mode")
def toggle_challenge_mode(active: bool, group_id: str, background_tasks: BackgroundTasks, admin=Depends(require_admin), db: Session = Depends(get_db)):
    key = f"challenge_mode:{group_id}"
    if active:
        redis_client.set(key, "active")
        # Freeze current leaderboards
        for scope in ["session", "all_time"]:
            redis_key = f"leaderboard:{scope}:{group_id}"
            top_students = redis_client.zrevrange(redis_key, 0, 49, withscores=True)
            leaderboard = []
            rank = 1
            for student_id_bytes, score in top_students:
                student_id = student_id_bytes.decode()
                s = db.query(models.Student).filter_by(id=student_id).first()
                if s:
                    leaderboard.append({
                        "rank": rank,
                        "student_id": s.id,
                        "name": s.full_name,
                        "score": int(score)
                    })
                    rank += 1
            redis_client.set(f"frozen_leaderboard:{group_id}:{scope}", json.dumps(leaderboard))
        
        # broadcast
        background_tasks.add_task(event_manager.broadcast, {"type": "challenge_mode", "status": "active", "group_id": group_id})
    else:
        redis_client.delete(key)
        redis_client.delete(f"frozen_leaderboard:{group_id}:session")
        redis_client.delete(f"frozen_leaderboard:{group_id}:all_time")
        # broadcast reveal
        background_tasks.add_task(event_manager.broadcast, {"type": "challenge_mode", "status": "revealed", "group_id": group_id})
        
    return {"status": "success", "challenge_mode": active}

@router.get("/daily_challenges")
def get_daily_challenges(student=Depends(get_current_student), db: Session = Depends(get_db)):
    today = date.today()
    challenges = db.query(models.DailyChallenge).filter(
        models.DailyChallenge.date >= today
    ).all()
    
    if not challenges:
        # Generate one
        labs = db.query(models.Lab).all()
        if labs:
            import random
            lab = random.choice(labs)
            dc = models.DailyChallenge(date=today, lab_id=lab.id, xp_reward=50)
            db.add(dc)
            db.commit()
            challenges = [dc]
    
    res = []
    for c in challenges:
        # check if student completed this lab today
        completed = db.query(models.Submission).filter(
            models.Submission.student_id == student.id,
            models.Submission.lab_id == c.lab_id,
            models.Submission.passed == True,
            models.Submission.submitted_at >= today
        ).first() is not None
        
        res.append({
            "id": c.id,
            "lab_id": c.lab_id,
            "lab_title": c.lab.title if c.lab else c.lab_id,
            "xp_reward": c.xp_reward,
            "completed": completed
        })
    return res

@router.get("/admin/leaderboard")
def get_admin_leaderboard(db: Session = Depends(get_db), admin=Depends(require_admin)):
    students = db.query(models.Student).filter(models.Student.is_active == True).all()
    result = []
    for s in students:
        submissions = db.query(models.Submission).filter(
            models.Submission.student_id == s.id,
            models.Submission.passed == True
        ).all()
        total_score = sum(sub.score for sub in submissions if sub.score)
        result.append({
            "student_id": str(s.id),
            "name": s.full_name,
            "email": s.email,
            "group_name": s.group.name if s.group else "Ungrouped",
            "total_score": total_score,
            "xp": s.xp,
            "level": s.level,
        })
    result.sort(key=lambda x: x["total_score"], reverse=True)
    for i, r in enumerate(result):
        r["rank"] = i + 1
    return result

