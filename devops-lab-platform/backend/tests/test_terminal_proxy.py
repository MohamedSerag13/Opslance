"""Terminal proxy regression tests.

Bug being pinned: every lab opened with "*** Connected to Terminal ***"
followed immediately by "*** Disconnected from Terminal ***".

Root cause chain (all fixed):
1. The backend container never received LAB_API_TOKEN — docker-compose.yml did
   not pass it and docker-entrypoint.sh did not derive it from SECRET_KEY — so
   the proxy authenticated to the lab-manager with an empty token and was
   closed (1008) right after connecting.
2. verification.py sent the token as an X-Lab-Token header while the
   lab-manager /internal/exec endpoint only read the ?token= query param, so
   grading execs would 403 even with a valid token.
3. Every failure mode was silent: the backend closed the client socket without
   writing a reason and the lab-manager swallowed PTY errors.

These tests run the REAL lab-manager app (docker_client is None in tests, so
it reports "Docker is unavailable") behind a real uvicorn server and drive the
backend's terminal WS end to end through TestClient.
"""

import os
import socket
import sys
import threading
import time

import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
PLATFORM_DIR = os.path.dirname(BACKEND_DIR)                               # devops-lab-platform/
LM_DIR = os.path.join(PLATFORM_DIR, "lab-manager")
if LM_DIR not in sys.path:
    sys.path.insert(0, LM_DIR)

LM_TOKEN = "lm-shared-test-token"
LM_PORT = 8131

import api as lm_api  # noqa: E402  (lab-manager internal API)
import models  # noqa: E402
import routers.websocket as ws_mod  # noqa: E402


@pytest.fixture(scope="module", autouse=True)
def _lm_token():
    # api.py resolves LAB_API_TOKEN at import time (falls back to SECRET_KEY);
    # pin it to the same value every test in this module authenticates with.
    lm_api.LAB_API_TOKEN = LM_TOKEN


@pytest.fixture(scope="module")
def lm_server():
    """Run the real lab-manager app on localhost for the terminal proxy."""
    lm_api.LAB_API_TOKEN = LM_TOKEN
    import uvicorn

    config = uvicorn.Config(lm_api.app, host="127.0.0.1", port=LM_PORT, log_level="error")
    server = uvicorn.Server(config)
    t = threading.Thread(target=server.run, daemon=True)
    t.start()
    for _ in range(100):
        try:
            with socket.create_connection(("127.0.0.1", LM_PORT), timeout=0.5):
                break
        except OSError:
            time.sleep(0.1)
    else:
        pytest.fail("lab-manager test server did not come up")
    yield f"http://127.0.0.1:{LM_PORT}"
    server.should_exit = True
    t.join(timeout=5)


@pytest.fixture()
def term_session(db, make_student, make_lab):
    """A student with a running lab session (container assigned)."""
    st = make_student()
    lab = make_lab()
    s = models.LabSession(student_id=st.id, lab_id=lab.id,
                          status="running", container_name="lab-term-test")
    db.add(s)
    db.commit()
    db.refresh(s)
    return st, s


def _login(client, email, password="Passw0rd!"):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _terminal_ticket(client, headers, session_id):
    r = client.post("/api/ws/ticket",
                    json={"scope": "terminal", "session_id": session_id},
                    headers=headers)
    assert r.status_code == 200, r.text
    return r.json()["ticket"]


# ---------------------------------------------------------------------------
# lab-manager internal exec auth: header AND query param must work
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("how", ["header", "query", "both"])
def test_exec_accepts_token_from_header_and_query(how):
    c = TestClient(lm_api.app)
    body = {"container": "c-x", "cmd": "echo hi"}
    headers = {"X-Lab-Token": LM_TOKEN} if how in ("header", "both") else {}
    url = "/internal/exec" + ("?token=" + LM_TOKEN if how in ("query", "both") else "")
    # 503 = auth passed, fails later because tests have no docker daemon;
    # 403 would mean the token did not reach the endpoint
    assert c.post(url, json=body, headers=headers).status_code == 503


def test_exec_rejects_missing_or_wrong_token():
    c = TestClient(lm_api.app)
    body = {"container": "c-x", "cmd": "echo hi"}
    assert c.post("/internal/exec", json=body).status_code == 403
    assert c.post("/internal/exec?token=wrong", json=body).status_code == 403
    assert c.post("/internal/exec", json=body, headers={"X-Lab-Token": "wrong"}).status_code == 403


# ---------------------------------------------------------------------------
# Terminal WS: full backend → lab-manager proxy chain
# ---------------------------------------------------------------------------

def test_terminal_proxies_to_lab_manager(client, term_session, lm_server, monkeypatch):
    """Happy path: ticket → session lookup → proxy auth OK → the lab-manager's
    diagnostic line is forwarded into the student's terminal."""
    st, s = term_session
    monkeypatch.setattr(ws_mod, "LAB_MANAGER_URL", lm_server)
    monkeypatch.setattr(ws_mod, "LAB_API_TOKEN", LM_TOKEN)
    h = _login(client, st.email)
    ticket = _terminal_ticket(client, h, str(s.id))
    with client.websocket_connect(f"/api/ws/terminal/{s.id}?ticket={ticket}") as ws:
        msg = ws.receive_text()
    # tests have no docker daemon — the LM's own message must arrive
    assert "Docker is unavailable" in msg


def test_terminal_token_mismatch_is_not_silent(client, term_session, lm_server, monkeypatch):
    """The reported bug: a backend/lab-manager token mismatch used to close the
    socket instantly and silently. Now the reason is written to the terminal."""
    st, s = term_session
    monkeypatch.setattr(ws_mod, "LAB_MANAGER_URL", lm_server)
    monkeypatch.setattr(ws_mod, "LAB_API_TOKEN", "deliberately-wrong-token")
    h = _login(client, st.email)
    ticket = _terminal_ticket(client, h, str(s.id))
    with client.websocket_connect(f"/api/ws/terminal/{s.id}?ticket={ticket}") as ws:
        msg = ws.receive_text()
    assert "authorization failed" in msg


def test_terminal_unreachable_lab_manager_is_not_silent(client, term_session, monkeypatch):
    """Lab-manager down → the student sees an explicit 'unreachable' line."""
    st, s = term_session
    monkeypatch.setattr(ws_mod, "LAB_MANAGER_URL", "http://127.0.0.1:59999")
    monkeypatch.setattr(ws_mod, "LAB_API_TOKEN", LM_TOKEN)
    h = _login(client, st.email)
    ticket = _terminal_ticket(client, h, str(s.id))
    with client.websocket_connect(f"/api/ws/terminal/{s.id}?ticket={ticket}") as ws:
        msg = ws.receive_text()
    assert "unreachable" in msg


def test_terminal_bad_ticket_rejected(client, term_session):
    st, s = term_session
    with pytest.raises(Exception):
        with client.websocket_connect(f"/api/ws/terminal/{s.id}?ticket=bogus"):
            pass
