"""Rate limiters: spawn gate/window, check gate, submit window, API budget."""
import pytest

import models
import routers.sessions as sessions_mod
from tests.conftest import FAKE_REDIS, fake_checker, force_running, login_headers


def test_spawn_burst_gate_1_per_5s(client, db, make_student, make_lab):
    st = make_student(subscription_tier="pro")
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    r1 = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h)
    assert r1.status_code == 200
    # a different lab (or the same) inside the gate window is rejected
    lab2 = make_lab()
    r2 = client.post("/api/sessions/", json={"lab_id": lab2.id}, headers=h)
    assert r2.status_code == 429
    assert "seconds between" in r2.json()["detail"]


def test_spawn_same_lab_is_idempotent_within_gate(client, db, make_student, make_lab):
    """Re-calling with a live session returns it — the gate never fires."""
    st = make_student()
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    r1 = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h)
    r2 = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h)
    assert r1.status_code == r2.status_code == 200
    assert r1.json()["session_id"] == r2.json()["session_id"]


def test_spawn_window_8_per_10min(client, db, make_student, make_lab):
    st = make_student(subscription_tier="pro")  # limit 3 does not interfere
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    for i in range(8):
        FAKE_REDIS.delete(f"spawn_gate:{st.id}")  # skip the burst gate
        r = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h)
        assert r.status_code == 200, (i, r.text)
        # expire the session so the next call takes the spawn path again
        s = db.query(models.LabSession).filter_by(student_id=st.id).first()
        s.status = "expired"
        db.commit()
    FAKE_REDIS.delete(f"spawn_gate:{st.id}")
    r = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h)
    assert r.status_code == 429
    assert "Too many labs launched" in r.json()["detail"]


def test_check_gate_1_per_2s(client, db, make_student, make_lab, monkeypatch):
    st = make_student()
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker("✅ PASS [100%]: ok\nSCORE: 100/100"))
    r1 = client.post(f"/api/sessions/{sid}/check", headers=h)
    assert r1.status_code == 200
    r2 = client.post(f"/api/sessions/{sid}/check", headers=h)
    assert r2.status_code == 429
    assert "every 2 seconds" in r2.json()["detail"]


def test_check_window_30_per_5min(client, db, make_student, make_lab, monkeypatch):
    st = make_student()
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker("✅ PASS [100%]: ok\nSCORE: 100/100"))
    for i in range(30):
        FAKE_REDIS.delete(f"check_gate:{st.id}")
        r = client.post(f"/api/sessions/{sid}/check", headers=h)
        assert r.status_code == 200, i
    FAKE_REDIS.delete(f"check_gate:{st.id}")
    r = client.post(f"/api/sessions/{sid}/check", headers=h)
    assert r.status_code == 429


def test_submit_window_10_per_5min(client, db, make_student, make_lab, monkeypatch):
    st = make_student()
    lab = make_lab()
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    # failing checks keep the session `running` so submits can repeat
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker("❌ FAIL [0%]: no\nSCORE: 0/100", exit_code=1))
    for i in range(10):
        r = client.post(f"/api/sessions/{sid}/submit", headers=h)
        assert r.status_code == 200, i
    r = client.post(f"/api/sessions/{sid}/submit", headers=h)
    assert r.status_code == 429
    assert "Too many submissions" in r.json()["detail"]


def test_runner_question_check_gate(client, db, make_student, make_lab, monkeypatch):
    st = make_student()
    lab = make_lab(lab_id="module-13-lab-04-fingerprint-audit", points=100)
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    aid = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()["id"]
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker("✅ PASS [100%]: a\n✅ PASS [100%]: b\n✅ PASS [100%]: c\n✅ PASS [100%]: d"))
    r1 = client.post(f"/api/sessions/{sid}/attempts/{aid}/questions/check_1/check", headers=h)
    assert r1.status_code == 200
    r2 = client.post(f"/api/sessions/{sid}/attempts/{aid}/questions/check_1/check", headers=h)
    assert r2.status_code == 429
    assert "every 2 seconds" in r2.json()["detail"]


def test_global_student_budget_60_per_min(client, make_student, make_lab):
    st = make_student()
    make_lab()
    h = login_headers(st.email, "Passw0rd!")
    last = None
    for i in range(61):
        last = client.get("/api/labs", headers=h)
    assert last.status_code == 429
    assert "Too many requests" in last.json()["detail"]
