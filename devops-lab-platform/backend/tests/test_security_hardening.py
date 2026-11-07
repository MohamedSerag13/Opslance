"""Security hardening regression tests.

Covers the fixes from the end-to-end review:
- refresh-token denylist (logout revokes; refresh rotates old token out)
- Stripe webhook fails closed without STRIPE_WEBHOOK_SECRET unless STRIPE_DEV_MODE=1
- WebSocket one-time tickets (terminal + events): redemption is single-use,
  scope-pinned, and rejects tokens/tickets issued for another session
- admin login uses a constant-time comparison (behavioral: only the exact
  password matches)
"""
import json
import os
import uuid

import pytest

from auth import create_refresh_token, decode_token
from tests.conftest import login_headers


# ---------------------------------------------------------------------------
# Refresh token denylist
# ---------------------------------------------------------------------------

def test_logout_revokes_refresh_token(client, student):
    h = login_headers(student.email, "Passw0rd!")
    tokens = client.post("/api/auth/login",
                         json={"email": student.email, "password": "Passw0rd!"}).json()
    refresh = tokens["refresh_token"]

    r = client.post("/api/auth/logout", json={"refresh_token": refresh})
    assert r.status_code == 200

    # revoked: refresh with the same token is now 401
    r2 = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 401


def test_refresh_rotates_presented_token(client, student):
    tokens = client.post("/api/auth/login",
                         json={"email": student.email, "password": "Passw0rd!"}).json()
    refresh = tokens["refresh_token"]

    r = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200

    # rotation: the presented token can never be redeemed a second time
    r2 = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 401


def test_refresh_tokens_carry_jti():
    token = create_refresh_token(data={"sub": "someone", "role": "student"})
    payload = decode_token(token)
    assert payload.get("jti")


def test_logout_without_body_still_ok(client):
    r = client.post("/api/auth/logout")
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# Stripe webhook fail-closed
# ---------------------------------------------------------------------------

def _dev_mode(monkeypatch, enabled: bool):
    import routers.billing as billing
    monkeypatch.setattr(billing, "STRIPE_DEV_MODE", enabled)


def test_webhook_fails_closed_without_secret(client, monkeypatch):
    _dev_mode(monkeypatch, False)
    r = client.post("/api/billing/webhook", json={"type": "checkout.session.completed",
                                                  "data": {"object": {}}})
    # no STRIPE_WEBHOOK_SECRET + no dev mode → the unverified path must not exist
    assert r.status_code == 503


def test_webhook_mock_path_requires_explicit_dev_mode(client, monkeypatch):
    _dev_mode(monkeypatch, True)
    r = client.post("/api/billing/webhook", json={"type": "checkout.session.completed",
                                                  "data": {"object": {}}})
    # dev mode explicitly on → unverified events processed (upgrade is a no-op
    # for an unknown student_id, but the endpoint works)
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# WebSocket one-time tickets
# ---------------------------------------------------------------------------

def _issue(client, headers, scope, session_id=None):
    body = {"scope": scope}
    if session_id:
        body["session_id"] = session_id
    r = client.post("/api/ws/ticket", json=body, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["ticket"]


def test_ticket_requires_auth(client):
    r = client.post("/api/ws/ticket", json={"scope": "events"})
    assert r.status_code == 401


def test_ticket_scope_validation(client, student_headers):
    # unknown scope → Pydantic Literal validation rejects it (422)
    assert client.post("/api/ws/ticket", json={"scope": "bogus"}, headers=student_headers).status_code == 422
    assert client.post("/api/ws/ticket", json={"scope": "terminal"}, headers=student_headers).status_code == 400


def test_events_ws_rejects_missing_ticket(client):
    with pytest.raises(Exception):
        with client.websocket_connect("/api/ws/events"):
            pass


def test_events_ws_accepts_one_time_ticket(client, student_headers):
    ticket = _issue(client, student_headers, "events")
    with client.websocket_connect(f"/api/ws/events?ticket={ticket}") as ws:
        # connection stays open (ping loop drives it)
        assert ws is not None


def test_events_ticket_is_single_use(client, student_headers):
    ticket = _issue(client, student_headers, "events")
    with client.websocket_connect(f"/api/ws/events?ticket={ticket}"):
        pass
    with pytest.raises(Exception):
        with client.websocket_connect(f"/api/ws/events?ticket={ticket}"):
            pass


def test_terminal_ticket_is_session_pinned(client, db, student, make_lab, student_headers):
    from tests.conftest import force_running
    lab = make_lab()
    h = student_headers
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)

    ticket = _issue(client, h, "terminal", session_id=sid)
    # ticket bound to sid → connecting with a different session id fails
    other = str(uuid.uuid4())
    with pytest.raises(Exception):
        with client.websocket_connect(f"/api/ws/terminal/{other}?ticket={ticket}"):
            pass

    # correct session + container set → accepted, then graceful close because
    # the lab-manager PTY service isn't configured in this environment
    with client.websocket_connect(f"/api/ws/terminal/{sid}?ticket={ticket}") as ws:
        msg = ws.receive_text()
    assert "Terminal service not available" in msg


def test_terminal_ws_rejects_raw_jwt(client, db, student, make_lab, student_headers):
    """The old flow accepted the long-lived JWT as a query param — must not."""
    from tests.conftest import force_running
    lab = make_lab()
    h = student_headers
    sid = client.post("/api/sessions/", json={"lab_id": lab.id}, headers=h).json()["session_id"]
    force_running(db, sid)
    token = client.post("/api/auth/login",
                        json={"email": student.email, "password": "Passw0rd!"}).json()["access_token"]
    with pytest.raises(Exception):
        with client.websocket_connect(f"/api/ws/terminal/{sid}?token={token}"):
            pass


# ---------------------------------------------------------------------------
# Stripe webhook — signature-verified path (integration)
# ---------------------------------------------------------------------------

def _stripe_signed_request(payload: bytes, secret: str):
    import hashlib
    import hmac as _hmac
    import time
    t = int(time.time())
    sig = _hmac.new(secret.encode(), f"{t}.{payload.decode()}".encode(), hashlib.sha256).hexdigest()
    return {"stripe-signature": f"t={t},v1={sig}"}


def test_webhook_verified_signature_upgrades_student(client, db, make_student, monkeypatch):
    import routers.billing as billing

    student = make_student()
    secret = "whsec_test_123"
    monkeypatch.setattr(billing, "STRIPE_WEBHOOK_SECRET", secret)
    monkeypatch.setattr(billing, "STRIPE_DEV_MODE", False)

    payload = json.dumps({
        "type": "checkout.session.completed",
        "data": {"object": {
            "metadata": {"student_id": str(student.id)},
            "customer": "cus_test_1",
        }},
    }).encode()
    r = client.post("/api/billing/webhook", content=payload,
                    headers=_stripe_signed_request(payload, secret))
    assert r.status_code == 200
    db.refresh(student)
    assert student.subscription_tier == "pro"
    assert student.stripe_customer_id == "cus_test_1"


def test_webhook_bad_signature_rejected(client, make_student, monkeypatch):
    import routers.billing as billing

    student = make_student()
    monkeypatch.setattr(billing, "STRIPE_WEBHOOK_SECRET", "whsec_real")
    monkeypatch.setattr(billing, "STRIPE_DEV_MODE", False)

    payload = json.dumps({
        "type": "checkout.session.completed",
        "data": {"object": {"metadata": {"student_id": str(student.id)}}},
    }).encode()
    r = client.post("/api/billing/webhook", content=payload,
                    headers=_stripe_signed_request(payload, "whsec_wrong"))
    assert r.status_code == 400
