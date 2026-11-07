"""Classic lab session lifecycle: create/get/stop, check, submit, hints."""
import json

import pytest

import models
import routers.sessions as sessions_mod
from tests.conftest import force_running, fake_checker, login_headers


def test_create_session_requires_lab_id(client, student_headers):
    r = client.post("/api/sessions/", json={}, headers=student_headers)
    assert r.status_code == 400


def test_create_session_unknown_lab_404(client, student_headers):
    r = client.post("/api/sessions/", json={"lab_id": "missing-lab"}, headers=student_headers)
    assert r.status_code == 404


def test_create_session_free_tier_module_gate(client, db, make_student, make_lab):
    st = make_student(subscription_tier="free")
    lab = make_lab(module_number=5)
    r = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=login_headers(st.email, "Passw0rd!"))
    assert r.status_code == 403
    assert "Module 01" in r.json()["detail"]


def test_create_session_free_tier_module1_allowed(client, db, make_student, make_lab):
    st = make_student(subscription_tier="free")
    lab = make_lab(module_number=1)
    r = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=login_headers(st.email, "Passw0rd!"))
    assert r.status_code == 200
    assert r.json()["status"] == "starting"


def test_active_session_limit_one_for_free(client, db, make_student, make_lab):
    st = make_student(subscription_tier="free")
    h = login_headers(st.email, "Passw0rd!")
    lab1 = make_lab()
    lab2 = make_lab()
    r1 = client.post("/api/sessions/", json={"lab_id": lab1.id}, headers=h)
    r2 = client.post("/api/sessions/", json={"lab_id": lab2.id}, headers=h)
    assert r1.status_code == 200
    assert r2.status_code == 400
    assert "limit" in r2.json()["detail"].lower()


def test_create_session_is_idempotent(client, db, make_student, make_lab):
    st = make_student()
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    r1 = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h)
    r2 = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h)
    assert r1.json()["session_id"] == r2.json()["session_id"]


def test_get_session_by_uuid(client, db, make_student, make_lab):
    st = make_student()
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    r = client.get(f"/api/sessions/{sid}", headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "starting"


def test_stop_session_deletes_row(client, db, make_student, make_lab):
    st = make_student()
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    r = client.delete(f"/api/sessions/{sid}", headers=h)
    assert r.status_code == 200
    assert db.query(models.LabSession).filter_by(id=sid).first() is None


def test_check_requires_running_session(client, db, make_student, make_lab):
    st = make_student()
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    r = client.post(f"/api/sessions/{sid}/check", headers=h)
    assert r.status_code == 400
    assert "not running" in r.json()["detail"]


def test_check_with_passing_output(client, db, make_student, make_lab, monkeypatch):
    st = make_student()
    lab = make_lab(points=100)
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker("✅ PASS [100%]: done\nSCORE: 100/100"))
    r = client.post(f"/api/sessions/{sid}/check", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body["passed"] is True
    assert body["score"] == 100


def test_check_score_parsed_from_output(client, db, make_student, make_lab, monkeypatch):
    st = make_student()
    lab = make_lab(points=100)
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker("✅ PASS [60%]: half done\nSCORE: 60/100", exit_code=1))
    r = client.post(f"/api/sessions/{sid}/check", headers=h)
    body = r.json()
    assert body["passed"] is False
    assert body["score"] == 60


def test_submit_passing_records_gamification(client, db, full_pass_flow):
    st, lab, sid, body = full_pass_flow()
    assert body["passed"] is True
    assert body["score"] == 100
    assert body["attempt_number"] == 1

    db.expire_all()  # endpoint committed through its own session
    s = db.query(models.Student).filter_by(id=st.id).first()
    assert s.xp >= 100 + 50  # lab score + first_deploy reward
    assert s.level >= 2
    assert s.current_streak == 1

    sub = db.query(models.Submission).filter_by(student_id=st.id, lab_id=lab.id).first()
    assert sub is not None and sub.passed is True

    earned = {a.achievement_id for a in db.query(models.StudentAchievement).filter_by(student_id=st.id).all()}
    assert "first_deploy" in earned
    assert "zero_downtime" in earned


def test_submit_updates_redis_leaderboard(client, db, full_pass_flow):
    from tests.conftest import FAKE_REDIS
    st, lab, sid, _ = full_pass_flow()
    all_time = FAKE_REDIS.zscore("leaderboard:all_time:global", str(st.id))
    session = FAKE_REDIS.zscore("leaderboard:session:global", str(st.id))
    assert all_time is not None and float(all_time) >= 100
    assert session is not None


def test_failed_submit_does_not_award(client, db, make_student, make_lab, monkeypatch):
    st = make_student()
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker("❌ FAIL [0%]: nope\nSCORE: 0/100", exit_code=1))
    r = client.post(f"/api/sessions/{sid}/submit", headers=h)
    body = r.json()
    assert body["passed"] is False
    db.expire_all()
    s = db.query(models.Student).filter_by(id=st.id).first()
    assert s.xp == 0
    sub = db.query(models.Submission).filter_by(student_id=st.id).first()
    assert sub is not None and sub.passed is False
    # session stays running so the student can retry
    sess = db.query(models.LabSession).filter_by(id=sid).first()
    assert sess.status == "running"


def test_hint_reveal_and_score_deduction(client, db, make_student, make_lab, monkeypatch):
    from tests.conftest import FAKE_REDIS
    st = make_student()
    lab = make_lab(hints=json.dumps([
        {"number": 1, "title": "Look around", "content": "Run ls -la"},
        {"number": 2, "title": "Deeper", "content": "cat the file"},
    ]))
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)

    r0 = client.get(f"/api/sessions/{sid}/hints", headers=h)
    assert r0.json()["hints_revealed"] == 0
    assert r0.json()["score_preview"] == 100

    r1 = client.post(f"/api/sessions/{sid}/hints/1", headers=h)
    assert r1.status_code == 200
    assert r1.json()["hint"] == "Run ls -la"
    assert r1.json()["score_preview"] == 90

    r2 = client.post(f"/api/sessions/{sid}/hints/2", headers=h)
    assert r2.json()["hints_revealed"] == 2

    # hint 3 does not exist
    r3 = client.post(f"/api/sessions/{sid}/hints/3", headers=h)
    assert r3.status_code == 404

    # submitting now deducts 10/hint
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker("✅ PASS [100%]: done\nSCORE: 100/100"))
    r = client.post(f"/api/sessions/{sid}/submit", headers=h)
    assert r.json()["score"] == 80  # 100 - 20 hint deduction


def test_expired_session_submit_rejected(client, db, make_student, make_lab):
    st = make_student()
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    s = db.query(models.LabSession).filter_by(id=sid).first()
    s.status = "expired"
    db.commit()
    r = client.post(f"/api/sessions/{sid}/submit", headers=h)
    assert r.status_code == 400


def test_session_extension_pro_tier_only(client, db, make_student, make_lab):
    st = make_student(subscription_tier="free")
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    r = client.post(f"/api/sessions/{sid}/extend", headers=h)
    assert r.status_code == 403

    st2 = make_student(subscription_tier="pro")
    h2 = login_headers(st2.email, "Passw0rd!")
    sid2 = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h2).json()["session_id"]
    force_running(db, sid2)
    r = client.post(f"/api/sessions/{sid2}/extend", headers=h2)
    assert r.status_code == 200
    assert db.query(models.LabSession).filter_by(id=sid2).first().expires_at is not None


def test_help_request_enqueued(client, db, make_student, make_lab):
    from tests.conftest import FAKE_REDIS
    st = make_student()
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    r = client.post(f"/api/sessions/{sid}/help", headers=h)
    assert r.status_code == 200
    queue = FAKE_REDIS.hgetall("help_queue:global")
    assert len(queue) == 1


def test_get_active_session_lookup(client, db, make_student, make_lab):
    st = make_student()
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h)
    r = client.get(f"/api/sessions/active/{lab.id}", headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "starting"
