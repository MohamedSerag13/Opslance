"""Gamification: profile + achievement catalog, challenge mode, leaderboards,
daily challenges."""
import uuid
from datetime import datetime

import models

from tests.conftest import FAKE_REDIS, login_headers


def test_profile_contains_full_catalog(client, student):
    r = client.get("/api/gamification/profile", headers=login_headers(student.email, "Passw0rd!"))
    body = r.json()
    assert body["xp"] == 0 and body["level"] == 1
    ids = {c["id"] for c in body["catalog"]}
    assert ids == {"first_deploy", "speed_demon", "zero_downtime",
                   "level_5", "streak_7", "century"}
    locked = {c["id"]: c for c in body["catalog"] if not c["earned"]}
    assert locked["level_5"]["progress"] == {"current": 1, "target": 5}
    assert locked["century"]["progress"] == {"current": 0, "target": 1000}
    # binary achievements carry no progress bar
    assert locked["speed_demon"]["progress"] is None
    assert body["achievements"] == []


def test_profile_after_passing_shows_earned(client, db, full_pass_flow):
    st, lab, sid, submit = full_pass_flow()
    r = client.get("/api/gamification/profile", headers=login_headers(st.email, "Passw0rd!"))
    body = r.json()
    earned_ids = {a["id"] for a in body["achievements"]}
    assert "first_deploy" in earned_ids
    catalog = {c["id"]: c for c in body["catalog"]}
    assert catalog["first_deploy"]["earned"] is True
    assert catalog["first_deploy"]["earned_at"] is not None
    assert catalog["century"]["earned"] is False


def test_level_and_streak_milestones_awarded(client, db, make_student):
    """Direct state-driven awards: level_5, streak_7, century via the helper."""
    from achievements import award_progress_achievements
    st = make_student()
    st.xp = 1000
    st.level = 1
    st.current_streak = 7
    st.longest_streak = 7
    db.commit()
    xp_added = award_progress_achievements(db, st)
    # level is 1 → level_5 not awarded; streak_7 + century are
    assert xp_added == 150 + 200
    db.commit()  # SessionLocal autoflush=False — persist the pending awards
    earned = {a.achievement_id for a in db.query(models.StudentAchievement).filter_by(student_id=st.id).all()}
    assert "streak_7" in earned and "century" in earned and "level_5" not in earned
    assert st.xp == 1000 + 350


def test_daily_challenges_auto_generated(client, student, make_lab):
    lab = make_lab()
    r = client.get("/api/gamification/daily_challenges", headers=login_headers(student.email, "Passw0rd!"))
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["completed"] is False


def test_leaderboard_session_scope_empty_initially(client, student):
    r = client.get("/api/gamification/leaderboard/all_time", headers=login_headers(student.email, "Passw0rd!"))
    assert r.status_code == 200


def test_leaderboard_after_pass(client, full_pass_flow):
    st, lab, sid, _ = full_pass_flow()
    r = client.get("/api/gamification/leaderboard/all_time", headers=login_headers(st.email, "Passw0rd!"))
    board = r.json()
    assert any(row["student_id"] == str(st.id) and row["score"] >= 100 for row in board)


def test_challenge_mode_toggle_freezes_leaderboard(client, db, make_student, admin_headers):
    st = make_student()
    FAKE_REDIS.zincrby("leaderboard:session:global", 120, str(st.id))
    FAKE_REDIS.zincrby("leaderboard:all_time:global", 120, str(st.id))

    r = client.get("/api/gamification/challenge_mode/global", headers=admin_headers)
    assert r.json() == {"active": False}

    r = client.post("/api/gamification/challenge_mode?active=true&group_id=global", headers=admin_headers)
    assert r.status_code == 200

    r = client.get("/api/gamification/challenge_mode/global", headers=admin_headers)
    assert r.json() == {"active": True}

    # frozen copy returned regardless of later z-score changes
    FAKE_REDIS.zincrby("leaderboard:all_time:global", 500, str(st.id))
    r = client.get("/api/gamification/leaderboard/all_time", headers=login_headers(st.email, "Passw0rd!"))
    assert r.json()[0]["score"] == 120

    client.post("/api/gamification/challenge_mode?active=false&group_id=global", headers=admin_headers)
    r = client.get("/api/gamification/leaderboard/all_time", headers=login_headers(st.email, "Passw0rd!"))
    assert r.json()[0]["score"] == 620  # live again


def test_admin_leaderboard_ranks_by_score(client, db, make_student, make_lab, admin_headers):
    a = make_student(full_name="Alpha")
    b = make_student(full_name="Beta")
    lab = make_lab(points=100)
    db.add_all([
        models.Submission(student_id=a.id, lab_id=lab.id, attempt_number=1,
                          passed=True, score=50, submitted_at=datetime.utcnow()),
        models.Submission(student_id=b.id, lab_id=lab.id, attempt_number=1,
                          passed=True, score=80, submitted_at=datetime.utcnow()),
    ])
    db.commit()
    r = client.get("/api/gamification/admin/leaderboard", headers=admin_headers)
    rows = r.json()
    # shared DB: other tests' students may rank around them — assert relative order
    names = [row["name"] for row in rows]
    assert names.index("Beta") < names.index("Alpha")
    ranks = [row["rank"] for row in rows]
    assert ranks == sorted(ranks) and ranks[0] == 1
