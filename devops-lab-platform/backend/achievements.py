"""Achievement catalog + award helpers.

The catalog is the single source of truth for every badge the platform can
award. `ensure_achievement_catalog(db)` idempotently seeds the rows so the
/achievements UI can always render the full set (earned and locked), and
`award_progress_achievements(...)` grants the milestone badges that depend on
XP / level / streak state after a passing submission.
"""

import models

ACHIEVEMENT_CATALOG = [
    {"id": "first_deploy", "name": "First Deploy", "description": "Completed your first lab",
     "icon": "🚀", "xp_reward": 50},
    {"id": "speed_demon", "name": "Speed Demon", "description": "Completed a lab in under 5 minutes",
     "icon": "⚡", "xp_reward": 100},
    {"id": "zero_downtime", "name": "Zero Downtime", "description": "Completed a lab with 100% score on first attempt",
     "icon": "💯", "xp_reward": 150},
    {"id": "level_5", "name": "Level 5 — Committed", "description": "Reached Level 5 (500 XP earned)",
     "icon": "🧭", "xp_reward": 100},
    {"id": "streak_7", "name": "On Fire", "description": "Kept a 7-day learning streak",
     "icon": "🔥", "xp_reward": 150},
    {"id": "century", "name": "The Century", "description": "Earned 1,000 XP in total",
     "icon": "💎", "xp_reward": 200},
]


def ensure_achievement_catalog(db) -> None:
    """Insert any catalog rows missing from the DB. Safe to call every request."""
    existing_ids = {a.id for a in db.query(models.Achievement).all()}
    for spec in ACHIEVEMENT_CATALOG:
        if spec["id"] not in existing_ids:
            db.add(models.Achievement(
                id=spec["id"], name=spec["name"], description=spec["description"],
                icon=spec["icon"], xp_reward=spec["xp_reward"],
            ))
    db.commit()


def award_progress_achievements(db, student) -> int:
    """Grant milestone badges earned through accumulated state (level, streak,
    total XP). Returns XP added through rewards — caller re-reads student.xp
    for level math afterwards. Seeds the catalog first so the FK on
    student_achievements.achievement_id can never be violated."""
    ensure_achievement_catalog(db)
    specs = {s["id"]: s for s in ACHIEVEMENT_CATALOG}
    conditions = {
        "level_5": student.level >= 5,
        "streak_7": student.current_streak >= 7,
        "century": student.xp >= 1000,
    }
    earned_ids = {sa.achievement_id for sa in
                  db.query(models.StudentAchievement).filter_by(student_id=student.id).all()}
    xp_added = 0
    for ach_id, achieved in conditions.items():
        if achieved and ach_id not in earned_ids:
            db.add(models.StudentAchievement(student_id=student.id, achievement_id=ach_id))
            xp_added += specs[ach_id]["xp_reward"]
    if xp_added:
        student.xp += xp_added
    return xp_added


def achievement_progress(student, labs_passed: int) -> dict:
    """achievement_id -> {current, target} for milestone badges the UI can
    show a fill bar for; binary badges are simply absent."""
    return {
        "first_deploy": {"current": labs_passed, "target": 1},
        "level_5": {"current": student.level, "target": 5},
        "streak_7": {"current": student.longest_streak or student.current_streak, "target": 7},
        "century": {"current": student.xp, "target": 1000},
    }
