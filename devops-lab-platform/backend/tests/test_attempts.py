"""Question-by-question runner: attempts, per-question checks, exam timer,
finish + submission path, retry-failed, review payload."""
import json
from datetime import datetime, timedelta

import pytest

import models
import routers.sessions as sessions_mod
from tests.conftest import (
    CKA_LAB_ID, CKA_MOCK_EXAM_ID, LAB_V2_ID, fake_checker, force_running, login_headers,
)


def lab_pass_output(n_questions: int, pass_idx=None):
    """check.sh-style output with one line per question (linux kind)."""
    pass_idx = set(range(n_questions)) if pass_idx is None else set(pass_idx)
    lines = []
    for i in range(n_questions):
        if i in pass_idx:
            lines.append(f"✅ PASS [100%]: check {i + 1} ok")
        else:
            lines.append(f"❌ FAIL [0%]: check {i + 1} failed")
    return "\n".join(lines)


@pytest.fixture()
def v2_setup(client, db, make_student, make_lab):
    """Student + DB Lab row for a real lab.yaml lab, session running."""
    def _make(lab_id=LAB_V2_ID):
        st = make_student()
        lab = make_lab(lab_id=lab_id, points=100)
        h = login_headers(st.email, "Passw0rd!")
        r = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h)
        assert r.status_code == 200, r.text
        sid = r.json()["session_id"]
        force_running(db, sid)
        return st, lab, sid, h
    return _make


def test_attempt_requires_v2_lab(client, db, make_student, make_lab):
    st = make_student()
    lab = make_lab()  # no lab.yaml on disk
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    r = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h)
    assert r.status_code == 404
    assert "lab.yaml" in r.json()["detail"]


def test_create_practice_attempt(v2_setup, client, monkeypatch):
    st, lab, sid, h = v2_setup()
    r = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "practice"
    assert body["status"] == "active"
    assert body["questions_total"] == 4
    assert body["score_total"] == 100  # 25+30+25+20
    assert len(body["questions"]) == 4
    assert body["questions"][0]["weight"] == 25
    assert body["domain_breakdown"]
    # review-only fields hidden while active
    assert "solution" not in body["questions"][0]


def test_attempt_is_single_per_session(v2_setup, client):
    st, lab, sid, h = v2_setup()
    r1 = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h)
    r2 = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "exam"}, headers=h)
    assert r1.json()["id"] == r2.json()["id"]  # active attempt returned as-is


def test_per_question_check_pass_and_fail(v2_setup, client, monkeypatch):
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()
    aid = attempt["id"]
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker(lab_pass_output(4, pass_idx=[0])))
    r = client.post(f"/api/sessions/{sid}/attempts/{aid}/questions/check_1/check", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body["mapped"] is True
    assert body["passed"] is True
    assert body["score_earned"] == 25
    assert body["score_total"] == 100

    r2 = client.post(f"/api/sessions/{sid}/attempts/{aid}/questions/check_2/check", headers=h)
    assert r2.json()["passed"] is False
    assert r2.json()["score_earned"] == 25


def test_per_question_check_uses_single_task_dispatch(v2_setup, client, monkeypatch):
    """CKA checkers accept `bash /check.sh <order>` to grade one task. The endpoint
    must run exactly that command (no full-lab check) and return only the verdict
    for this question — other questions' state stays untouched."""
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()
    aid = attempt["id"]
    commands = []

    def dispatched_checker(container_name, command):
        commands.append(command)
        if command == "bash /check.sh 3":
            return 0, "  FAIL [    0] check 3 failed"
        return 0, lab_pass_output(4)

    monkeypatch.setattr(sessions_mod, "exec_in_container", dispatched_checker)
    r = client.post(f"/api/sessions/{sid}/attempts/{aid}/questions/check_3/check", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert commands == ["bash /check.sh 3"], "must run only the single-task check"
    assert body["mapped"] is True
    assert body["passed"] is False
    assert "full_output" not in body
    assert body["message"].startswith("✕")

    review = client.get(f"/api/sessions/{sid}/attempts/{aid}", headers=h).json()
    by_id = {q["id"]: q for q in review["questions"]}
    assert by_id["check_3"]["status"] == "failed"
    assert all(by_id[f"check_{i}"]["status"] == "unanswered" for i in (1, 2, 4))

    commands.clear()
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        lambda c, cmd: (commands.append(cmd), (0, "  PASS [+25 pts] check 1 ok"))[1])
    r2 = client.post(f"/api/sessions/{sid}/attempts/{aid}/questions/check_1/check", headers=h)
    assert commands == ["bash /check.sh 1"]
    assert r2.json()["passed"] is True
    assert r2.json()["message"].startswith("✓")


def test_check_unknown_question_404(v2_setup, client):
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()
    r = client.post(f"/api/sessions/{sid}/attempts/{attempt['id']}/questions/nope/check", headers=h)
    assert r.status_code == 404


def test_flag_and_navigate(v2_setup, client):
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()
    aid = attempt["id"]
    r = client.patch(f"/api/sessions/{sid}/attempts/{aid}/questions/check_3",
                     json={"flagged": True, "current": True}, headers=h)
    assert r.status_code == 200
    assert r.json()["flagged"] is True
    active = client.get(f"/api/sessions/{sid}/attempts/active", headers=h).json()
    assert active["current_index"] == 2  # check_3 is index 2
    assert any(q["flagged"] for q in active["questions"])


def test_hints_gated_in_exam_mode(v2_setup, client):
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "exam"}, headers=h).json()
    r = client.post(f"/api/sessions/{sid}/attempts/{attempt['id']}/questions/check_1/hint", headers=h)
    assert r.status_code == 403
    assert "exam" in r.json()["detail"].lower()


def test_hints_available_in_practice(v2_setup, client):
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()
    r = client.post(f"/api/sessions/{sid}/attempts/{attempt['id']}/questions/check_1/hint", headers=h)
    assert r.status_code == 200
    assert r.json()["number"] == 1


def test_exam_mode_timer_from_lab_yaml(client, db, make_student, make_lab, monkeypatch):
    """CKA mock exam carries time_limit_minutes; attempts get a server-side timer."""
    st = make_student()
    lab = make_lab(lab_id=CKA_MOCK_EXAM_ID, points=100)
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    r = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "exam"}, headers=h)
    body = r.json()
    assert body["mode"] == "exam"
    assert body["questions_total"] == 18
    assert body["remaining_seconds"] is not None
    assert 0 < body["remaining_seconds"] <= 120 * 60


def test_finish_grades_and_records_submission(v2_setup, client, db, monkeypatch):
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()
    aid = attempt["id"]
    # live checks pass Q1+Q2
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker(lab_pass_output(4, pass_idx=[0, 1])))
    client.post(f"/api/sessions/{sid}/attempts/{aid}/questions/check_1/check", headers=h)
    client.post(f"/api/sessions/{sid}/attempts/{aid}/questions/check_2/check", headers=h)

    # final authoritative run: Q1..Q3 pass
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker(lab_pass_output(4, pass_idx=[0, 1, 2])))
    r = client.post(f"/api/sessions/{sid}/attempts/{aid}/finish", headers=h)
    body = r.json()
    assert body["status"] == "completed"
    assert body["score_earned"] == 80  # 25+30+25
    assert body["score_total"] == 100
    assert body["passed"] is True  # pass_mark 70

    sub = db.query(models.Submission).filter_by(student_id=st.id, lab_id=lab.id).first()
    assert sub is not None and sub.passed is True and sub.score == 80
    earned = {a.achievement_id for a in db.query(models.StudentAchievement).filter_by(student_id=st.id).all()}
    assert "first_deploy" in earned


def test_finish_below_pass_mark_fails(v2_setup, client, monkeypatch):
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()
    aid = attempt["id"]
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker(lab_pass_output(4, pass_idx=[0])))
    r = client.post(f"/api/sessions/{sid}/attempts/{aid}/finish", headers=h)
    body = r.json()
    assert body["score_earned"] == 25
    assert body["passed"] is False


def test_finish_with_container_gone_grades_from_states(v2_setup, client, monkeypatch):
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()
    aid = attempt["id"]
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker(lab_pass_output(4, pass_idx=[0])))
    client.post(f"/api/sessions/{sid}/attempts/{aid}/questions/check_1/check", headers=h)

    def _gone(container_name, command):
        raise sessions_mod.HTTPException(400, "Container not found — it may have expired")
    monkeypatch.setattr(sessions_mod, "exec_in_container", _gone)
    r = client.post(f"/api/sessions/{sid}/attempts/{aid}/finish", headers=h)
    body = r.json()
    assert body["status"] == "completed"
    assert body["score_earned"] == 25  # from persisted per-question states


def test_review_payload_reveals_solutions(v2_setup, client, monkeypatch):
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker(lab_pass_output(4, pass_idx=[0])))
    client.post(f"/api/sessions/{sid}/attempts/{attempt['id']}/finish", headers=h)
    r = client.get(f"/api/sessions/{sid}/attempts/{attempt['id']}", headers=h)
    body = r.json()
    assert body["status"] == "completed"
    q = body["questions"][0]
    assert "solution" in q
    assert "explanation" in q


def test_retry_failed_creates_subset_attempt(v2_setup, client, monkeypatch):
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()
    aid = attempt["id"]
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker(lab_pass_output(4, pass_idx=[0, 3])))
    client.post(f"/api/sessions/{sid}/attempts/{aid}/finish", headers=h)
    r = client.post(f"/api/sessions/{sid}/attempts/{aid}/retry-failed", headers=h)
    body = r.json()
    assert body["status"] == "active"
    assert body["questions_total"] == 2
    ids = {q["id"] for q in body["questions"]}
    assert ids == {"check_2", "check_3"}
    assert body["score_total"] == 55  # 30+25


def test_retry_rejected_with_nothing_failed(v2_setup, client, monkeypatch):
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()
    monkeypatch.setattr(sessions_mod, "exec_in_container",
                        fake_checker(lab_pass_output(4)))
    client.post(f"/api/sessions/{sid}/attempts/{attempt['id']}/finish", headers=h)
    r = client.post(f"/api/sessions/{sid}/attempts/{attempt['id']}/retry-failed", headers=h)
    assert r.status_code == 400


def test_expired_exam_auto_finishes(client, db, make_student, make_lab):
    """A stale exam attempt is finished (server-side timer) on next read."""
    st = make_student()
    lab = make_lab(lab_id=CKA_LAB_ID, points=100)
    h = login_headers(st.email, "Passw0rd!")
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "exam"}, headers=h).json()
    aid = attempt["id"]
    s = db.query(models.ExamAttempt).filter_by(id=aid).first()
    s.expires_at = datetime.utcnow() - timedelta(seconds=1)
    db.commit()
    db.commit()

    r = client.get(f"/api/sessions/{sid}/attempts/active", headers=h)
    body = r.json()
    assert body["status"] == "completed"
    # active lookup then 404s — attempt no longer active
    r2 = client.get(f"/api/sessions/{sid}/attempts/active", headers=h)
    assert r2.status_code == 404


def test_check_before_session_running_rejected(v2_setup, client, db, monkeypatch):
    st, lab, sid, h = v2_setup()
    attempt = client.post(f"/api/sessions/{sid}/attempts", json={"mode": "practice"}, headers=h).json()
    s = db.query(models.LabSession).filter_by(id=sid).first()
    s.status = "starting"
    s.container_name = None
    db.commit()
    r = client.post(f"/api/sessions/{sid}/attempts/{attempt['id']}/questions/check_1/check", headers=h)
    assert r.status_code == 400
