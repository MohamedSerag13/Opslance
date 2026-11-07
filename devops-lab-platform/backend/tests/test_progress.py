"""Progress endpoints + the dashboard aggregate."""
import json
import uuid
from datetime import datetime, timedelta

import pytest

import models


@pytest.fixture()
def seeded_student(client, db, make_student, make_lab):
    """Student with: 2 passed labs (best 90/40), 1 failed attempt, 1 running session."""
    st = make_student()
    l1 = make_lab(module_number=1, points=100, title="Alpha Lab")
    l2 = make_lab(module_number=2, points=50, title="Beta Lab")
    l3 = make_lab(module_number=2, points=60, title="Gamma Lab")
    l4 = make_lab(module_number=3, points=40, title="Delta Lab")  # failed only

    db.add_all([
        models.Submission(student_id=st.id, lab_id=l1.id, attempt_number=1,
                          passed=True, score=90, hints_used=0, time_taken_minutes=12,
                          submitted_at=datetime.utcnow() - timedelta(days=3)),
        models.Submission(student_id=st.id, lab_id=l1.id, attempt_number=2,
                          passed=True, score=90, hints_used=0, time_taken_minutes=5,
                          submitted_at=datetime.utcnow() - timedelta(days=1)),
        models.Submission(student_id=st.id, lab_id=l2.id, attempt_number=1,
                          passed=True, score=40, hints_used=1, time_taken_minutes=8,
                          submitted_at=datetime.utcnow() - timedelta(days=2)),
        models.Submission(student_id=st.id, lab_id=l3.id, attempt_number=1,
                          passed=False, score=0, hints_used=0, time_taken_minutes=4,
                          submitted_at=datetime.utcnow() - timedelta(hours=2)),
        models.Submission(student_id=st.id, lab_id=l4.id, attempt_number=1,
                          passed=False, score=10, hints_used=0, time_taken_minutes=3,
                          submitted_at=datetime.utcnow() - timedelta(hours=1)),
    ])
    sess = models.LabSession(student_id=st.id, lab_id=l3.id, status="running",
                             container_name="c-123")
    db.add(sess)
    db.commit()
    return st, [l1, l2, l3, l4]


def test_progress_history_and_total(client, seeded_student):
    st, _ = seeded_student
    r = client.get("/api/progress", headers=login(st))
    assert r.status_code == 200
    body = r.json()
    assert len(body["history"]) == 5
    # /progress sums every passed submission: 90 + 90 + 40 = 220
    # (the dashboard summary uses best-per-lab instead — asserted below)
    assert body["total_score"] == 220


def test_progress_summary(client, seeded_student):
    st, _ = seeded_student
    r = client.get("/api/progress/summary", headers=login(st))
    body = r.json()
    assert body["total_labs_completed"] == 2
    assert body["total_points"] == 130
    assert body["subscription_tier"] == "free"


def test_progress_modules_aggregation(client, seeded_student):
    st, labs = seeded_student
    r = client.get("/api/progress/modules", headers=login(st))
    modules = r.json()
    assert isinstance(modules, list) and len(modules) == 3
    by_num = {m["module_number"]: m for m in modules}
    assert by_num[1]["completed_labs"] == 1
    alpha = [l for l in by_num[1]["labs"] if l["id"] == labs[0].id][0]
    assert alpha["status"] == "completed" and alpha["best_score"] == 90
    gamma = [l for l in by_num[2]["labs"] if l["id"] == labs[2].id][0]
    assert gamma["status"] == "in_progress"  # running session, no pass


def test_progress_activity_shape(client, seeded_student):
    st, _ = seeded_student
    r = client.get("/api/progress/activity?days=7", headers=login(st))
    rows = r.json()
    assert len(rows) == 7
    assert {"date", "labs_completed"} <= set(rows[0].keys())


def test_dashboard_aggregate(client, seeded_student):
    st, labs = seeded_student
    r = client.get("/api/progress/dashboard", headers=login(st))
    body = r.json()
    assert body["summary"]["total_points"] == 130
    # continue: running session for Gamma Lab
    kinds = [c["kind"] for c in body["continue"]]
    assert "session" in kinds
    session_item = next(c for c in body["continue"] if c["kind"] == "session")
    assert session_item["lab_id"] == labs[2].id
    # retry: failed-only Delta surfaces (Gamma is already covered by the session)
    assert "retry" in kinds
    retry_item = next(c for c in body["continue"] if c["kind"] == "retry")
    assert retry_item["lab_id"] == labs[3].id
    # and Gamma is not duplicated as a retry
    assert all(c["lab_id"] != labs[2].id for c in body["continue"] if c["kind"] == "retry")
    # tracks registry: linux path present with completion data
    track_keys = {t["key"] for t in body["tracks"]}
    assert "linux-path" in track_keys and "cka" in track_keys
    linux = next(t for t in body["tracks"] if t["key"] == "linux-path")
    assert linux["total_labs"] >= 3
    assert 0 <= linux["completion"] <= 100
    # leaderboard: global scope (student has no group), ranked, me present
    assert body["leaderboard"]["scope"] == "global"
    assert body["leaderboard"]["my_rank"] is not None and body["leaderboard"]["my_rank"] >= 1
    assert body["activity"] and len(body["activity"]) == 84


def test_dashboard_continue_attempt_item(client, db, seeded_student, monkeypatch):
    """An active runner attempt on a running session becomes an 'attempt' item."""
    import routers.sessions as sessions_mod
    from tests.conftest import fake_checker, force_running, login_headers
    st, labs = seeded_student
    lab = labs[2]
    sid = db.query(models.LabSession).filter_by(student_id=st.id, lab_id=lab.id).first().id
    # lab.yaml-backed id required for attempts; seed one attempt via the model
    att = models.ExamAttempt(session_id=sid, student_id=st.id, lab_id=lab.id,
                             mode="practice", question_ids=json.dumps(["check_1", "check_2"]),
                             pass_mark=70, score_total=55)
    db.add(att)
    db.commit()

    r = client.get("/api/progress/dashboard", headers=login(st))
    kinds = [c["kind"] for c in r.json()["continue"]]
    assert "attempt" in kinds


def test_leaderboard_scoped_to_group(client, db, make_student, make_lab):
    g = models.Group(name=f"G-{uuid.uuid4().hex[:6]}")
    db.add(g)
    db.commit()
    st = make_student(group_id=g.id)
    other = make_student(full_name="Rival", email=f"rival-{uuid.uuid4().hex[:6]}@opslance.local", group_id=g.id)
    lab = make_lab(points=100)
    db.add_all([
        models.Submission(student_id=other.id, lab_id=lab.id, attempt_number=1,
                          passed=True, score=99, submitted_at=datetime.utcnow()),
    ])
    db.commit()
    r = client.get("/api/leaderboard", headers=login(st))
    board = r.json()
    assert board[0]["name"] == "Rival"
    assert board[0]["total_score"] == 99
    assert any(b["is_me"] for b in board)


def login(student):
    from tests.conftest import login_headers
    return login_headers(student.email, "Passw0rd!")
