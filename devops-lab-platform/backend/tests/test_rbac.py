"""RBAC: unauthenticated, student-vs-admin boundaries on both route families."""
import pytest

import models


def test_admin_routes_reject_anonymous(client):
    for path in ("/api/admin/students", "/api/admin/groups", "/api/admin/environments",
                 "/api/gamification/admin/leaderboard", "/api/admin/analytics"):
        assert client.get(path).status_code == 401, path


def test_admin_routes_reject_students(client, student_headers):
    for path in ("/api/admin/students", "/api/admin/groups", "/api/admin/environments",
                 "/api/gamification/admin/leaderboard", "/api/admin/analytics"):
        assert client.get(path, headers=student_headers).status_code == 403, path


def test_admin_challenge_mode_rejects_students(client, student_headers):
    r = client.post("/api/gamification/challenge_mode?active=true&group_id=global",
                    headers=student_headers)
    assert r.status_code == 403


def test_student_routes_reject_admin(client, admin_headers):
    r = client.get("/api/progress", headers=admin_headers)
    assert r.status_code == 403
    r = client.get("/api/labs", headers=admin_headers)
    assert r.status_code == 403


def test_student_routes_reject_anonymous(client):
    assert client.get("/api/progress").status_code == 401
    assert client.get("/api/sessions/active/nope").status_code == 401


def test_admin_access_granted(client, admin_headers):
    r = client.get("/api/admin/students", headers=admin_headers)
    assert r.status_code == 200


def test_garbage_session_id_404(client, student_headers):
    r = client.get("/api/sessions/not-a-uuid", headers=student_headers)
    assert r.status_code == 404


def test_other_students_session_invisible(client, db, make_student, make_lab):
    """A student cannot read or stop someone else's session."""
    import tests.conftest as c
    owner = make_student()
    stranger = make_student()
    lab = make_lab()
    r = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=c.login_headers(owner.email, "Passw0rd!"))
    sid = r.json()["session_id"]
    sh = c.login_headers(stranger.email, "Passw0rd!")
    assert client.get(f"/api/sessions/{sid}", headers=sh).status_code == 404
    assert client.delete(f"/api/sessions/{sid}", headers=sh).status_code == 404
    assert client.post(f"/api/sessions/{sid}/check", headers=sh).status_code == 404
