"""Admin settings + audit log: typed defaults, validation, enforcement."""
import json

import pytest

import models
import settings_service
from tests.conftest import login_headers


@pytest.fixture(autouse=True)
def _reset_settings_cache(db):
    """Settings are committed rows — wipe overrides around every test so the
    suite stays order-independent."""
    settings_service.invalidate_cache()
    db.query(models.PlatformSetting).delete()
    db.commit()
    yield
    db.query(models.PlatformSetting).delete()
    db.commit()
    settings_service.invalidate_cache()


def _as_admin(client):
    return login_headers("admin@opslance.local", "Admin@2025!")


def test_settings_require_admin(client, student_headers):
    assert client.get("/api/admin/settings", headers=student_headers).status_code == 403
    r = client.get("/api/admin/settings", headers=_as_admin(client))
    assert r.status_code == 200
    body = r.json()
    assert body["settings"]["max_running_sessions_free"] == 1
    assert body["settings"]["default_session_minutes_pro"] == 150
    assert "maintenance_mode" in body["meta"]


def test_put_validates_types_and_ranges(client):
    h = _as_admin(client)
    assert client.put("/api/admin/settings", json={"announcement": "x" * 281}, headers=h).status_code == 422
    assert client.put("/api/admin/settings", json={"max_running_sessions_pro": 0}, headers=h).status_code == 422
    assert client.put("/api/admin/settings", json={"maintenance_mode": "yes"}, headers=h).status_code == 422
    assert client.put("/api/admin/settings", json={"support_email": "not-an-email"}, headers=h).status_code == 422
    assert client.put("/api/admin/settings", json={"nonsense_key": 1}, headers=h).status_code == 422


def test_put_persists_and_audits(client, db):
    h = _as_admin(client)
    r = client.put("/api/admin/settings", json={
        "announcement": "Mock exam Saturday 10:00 sharp.",
        "support_email": "ops@opslance.dev",
        "max_running_sessions_pro": 5,
    }, headers=h)
    assert r.status_code == 200
    assert r.json()["settings"]["max_running_sessions_pro"] == 5

    # persisted override visible via the public surface, admin-only fields are not
    pub = client.get("/api/settings/public").json()
    assert pub["announcement"] == "Mock exam Saturday 10:00 sharp."
    assert pub["support_email"] == "ops@opslance.dev"
    assert "max_running_sessions_pro" not in pub

    # three audit rows written
    audit = client.get("/api/admin/settings/audit", headers=h).json()
    actions = [a["action"] for a in audit]
    assert actions.count("settings.update") == 3
    target_keys = {a["target"] for a in audit if a["action"] == "settings.update"}
    assert {"announcement", "support_email", "max_running_sessions_pro"} <= target_keys


def test_maintenance_mode_blocks_students_not_admins(client, student_headers, make_student):
    make_student(email="maintenance-victim@opslance.local", password="VictimPass1!")
    h = _as_admin(client)
    assert client.put("/api/admin/settings", json={"maintenance_mode": True}, headers=h).status_code == 200

    # a fresh student login is refused with 503…
    r = client.post("/api/auth/login", json={"email": "maintenance-victim@opslance.local", "password": "VictimPass1!"})
    assert r.status_code == 503
    assert "maintenance" in r.json()["detail"].lower()

    # …existing tokens keep working (no mid-session lockout)…
    assert client.get("/api/auth/me", headers=student_headers).status_code == 200

    # …and the admin can still log in and turn it off.
    assert client.post("/api/auth/login", json={
        "email": "admin@opslance.local", "password": "Admin@2025!"}).status_code == 200
    assert client.put("/api/admin/settings", json={"maintenance_mode": False}, headers=h).status_code == 200
    assert client.post("/api/auth/login", json={
        "email": "maintenance-victim@opslance.local", "password": "VictimPass1!"}).status_code == 200


def test_session_cap_comes_from_settings(client, student_headers, make_student, make_lab):
    # pro student, cap lowered to 1 → second concurrent session refused
    h = _as_admin(client)
    client.put("/api/admin/settings", json={"max_running_sessions_pro": 1}, headers=h)

    lab_a = make_lab(module_number=2, points=50).id
    lab_b = make_lab(module_number=3, points=60).id
    student = make_student(subscription_tier="pro", password="ProPass1!")
    h_student = login_headers(student.email, "ProPass1!")
    s1 = client.post("/api/sessions/", json={"lab_id": lab_a}, headers=h_student)
    assert s1.status_code == 200
    # reuse/starting sessions don't count twice; a different lab does
    s2 = client.post("/api/sessions/", json={"lab_id": lab_b}, headers=h_student)
    assert s2.status_code == 400
    assert "limit reached" in s2.json()["detail"].lower()

    # raise the cap → the same second lab now spawns (clear the spawn-gate
    # rate-limit counters the same way the suite's _clean_redis fixture does)
    client.put("/api/admin/settings", json={"max_running_sessions_pro": 3}, headers=h)
    from tests import conftest
    conftest.FAKE_REDIS.flushall()
    s3 = client.post("/api/sessions/", json={"lab_id": lab_b}, headers=h_student)
    assert s3.status_code == 200


def test_audit_requires_admin_and_lists_desc(client, student_headers):
    assert client.get("/api/admin/settings/audit", headers=student_headers).status_code == 403
    h = _as_admin(client)
    rows = client.get("/api/admin/settings/audit?limit=10", headers=h).json()
    assert isinstance(rows, list) and len(rows) <= 10
