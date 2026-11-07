"""Auth: login, refresh, me, preferences, reset-password + brute-force throttle."""
import pytest

import models
from database import SessionLocal
from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD, login_headers


def test_login_success_returns_tokens(client, student):
    r = client.post("/api/auth/login", json={"email": student.email, "password": "Passw0rd!"})
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["must_reset_password"] is False
    assert body["access_token"] and body["refresh_token"]


def test_login_wrong_password_401(client, student):
    r = client.post("/api/auth/login", json={"email": student.email, "password": "nope"})
    assert r.status_code == 401


def test_login_unknown_email_401(client):
    r = client.post("/api/auth/login", json={"email": "ghost@nowhere.local", "password": "x"})
    assert r.status_code == 401


def test_login_inactive_account_401(client, make_student):
    st = make_student()
    # flip the flag through a real session
    s = SessionLocal()
    row = s.query(models.Student).filter_by(id=st.id).first()
    row.is_active = False
    s.commit()
    s.close()
    r = client.post("/api/auth/login", json={"email": st.email, "password": "Passw0rd!"})
    assert r.status_code == 401
    assert "inactive" in r.json()["detail"].lower()


def test_admin_login_works(client):
    r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    assert r.json()["must_reset_password"] is False


def test_login_bruteforce_throttled_after_10_failures(client, student):
    for i in range(10):
        r = client.post("/api/auth/login", json={"email": student.email, "password": "wrong"})
        assert r.status_code == 401
    r = client.post("/api/auth/login", json={"email": student.email, "password": "wrong"})
    assert r.status_code == 429
    # even the correct password is throttled once locked
    r = client.post("/api/auth/login", json={"email": student.email, "password": "Passw0rd!"})
    assert r.status_code == 429


def test_successful_login_resets_failure_counter(client, student):
    for _ in range(3):
        client.post("/api/auth/login", json={"email": student.email, "password": "wrong"})
    r = client.post("/api/auth/login", json={"email": student.email, "password": "Passw0rd!"})
    assert r.status_code == 200
    # counter cleared → failures start fresh
    for _ in range(10):
        client.post("/api/auth/login", json={"email": student.email, "password": "wrong"})
    r = client.post("/api/auth/login", json={"email": student.email, "password": "wrong"})
    assert r.status_code == 429


def test_me_roundtrip(client, student):
    headers = login_headers(student.email, "Passw0rd!")
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "student"
    assert body["email"] == student.email


def test_me_with_garbage_token_401(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401


def test_refresh_flow(client, student):
    r = client.post("/api/auth/login", json={"email": student.email, "password": "Passw0rd!"})
    refresh = r.json()["refresh_token"]
    r2 = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 200
    assert r2.json()["access_token"]


def test_refresh_with_garbage_token_401(client):
    r = client.post("/api/auth/refresh", json={"refresh_token": "garbage"})
    assert r.status_code == 401


def test_reset_password_clears_must_reset(client, db, make_student):
    st = make_student(must_reset_password=True)
    headers = login_headers(st.email, "Passw0rd!")
    # students with must_reset_password can still call reset-password
    r = client.put("/api/auth/reset-password", headers=headers,
                   json={"new_password": "NewPass123!", "confirm_password": "NewPass123!"})
    assert r.status_code == 200
    db.expire_all()  # the endpoint committed through its own session
    s = db.query(models.Student).filter_by(id=st.id).first()
    assert s.must_reset_password is False
    # login with the new password succeeds
    r = client.post("/api/auth/login", json={"email": st.email, "password": "NewPass123!"})
    assert r.status_code == 200


def test_reset_password_mismatch_400(client, make_student):
    st = make_student()
    headers = login_headers(st.email, "Passw0rd!")
    r = client.put("/api/auth/reset-password", headers=headers,
                   json={"new_password": "NewPass123!", "confirm_password": "Different123!"})
    assert r.status_code == 400


def test_preferences_opt_out_roundtrip(client, make_student):
    st = make_student()
    headers = login_headers(st.email, "Passw0rd!")
    r = client.put("/api/auth/preferences", headers=headers, json={"opt_out_completion": True})
    assert r.status_code == 200
    assert r.json()["opt_out_completion"] is True
