"""Backend API suite — real Postgres (pgserver), fakeredis, canned Docker exec.

The suite exercises the app end to end through TestClient: auth, RBAC, the
lab session lifecycle, grading + gamification, hints, the question-by-question
runner, progress/dashboard aggregates, achievements, admin endpoints and the
rate limiters. Only the Docker exec layer is stubbed — everything else runs
the real code paths against an ephemeral Postgres (alembic migrations applied).

Run:  cd backend && PYTHONPATH="$PWD" python -m pytest tests/ -q
"""

import os
import sys
import uuid
from datetime import datetime, timedelta

import pytest

# ---------------------------------------------------------------------------
# Environment BEFORE any app import (routers read env at import time).
# ---------------------------------------------------------------------------
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATFORM_DIR = os.path.dirname(BACKEND_DIR)
REPO_ROOT = os.path.dirname(PLATFORM_DIR)
LABS_DIR = os.path.join(REPO_ROOT, "labs")

os.environ["SECRET_KEY"] = "test_secret_key"
os.environ["ADMIN_EMAIL"] = "admin@opslance.local"
os.environ["ADMIN_PASSWORD"] = "Admin@2025!"
os.environ["ADMIN_FULL_NAME"] = "Admin"
os.environ["LABS_HOST_PATH"] = LABS_DIR
os.environ.pop("SENDGRID_API_KEY", None)  # email tasks no-op without a key

import pgserver  # noqa: E402
import tempfile  # noqa: E402

_pg = pgserver.get_server(tempfile.mkdtemp(prefix="opslance-pgtest-"))
os.environ["DATABASE_URL"] = _pg.get_uri()

# Fakeredis replaces redis.from_url BEFORE the app modules run it at import.
import fakeredis  # noqa: E402
import redis as _redis_module  # noqa: E402

FAKE_REDIS = fakeredis.FakeStrictRedis()
_redis_module.from_url = lambda *a, **k: FAKE_REDIS

sys.path.insert(0, BACKEND_DIR)

# Alembic migrations onto the ephemeral Postgres (uses DATABASE_URL env).
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402

_cfg = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
_cfg.set_main_option("script_location", os.path.join(BACKEND_DIR, "alembic"))
command.upgrade(_cfg, "head")

import main as app_main  # noqa: E402
import models  # noqa: E402
from auth import get_password_hash  # noqa: E402
from database import SessionLocal  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import routers.sessions as sessions_mod  # noqa: E402
import verification as verification_mod  # noqa: E402

TEST_CLIENT = TestClient(app_main.app)

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

LAB_V2_ID = "module-13-lab-04-fingerprint-audit"  # lab.yaml, 4 questions (25/30/25/20)
CKA_LAB_ID = "cka-w1-lab-01-kubectl-speed-drill"  # lab.yaml, 34 questions, module 21
CKA_MOCK_EXAM_ID = "cka-w8-lab-01-mock-exam"      # lab.yaml, 18 questions, 120min timer


def login_headers(email: str, password: str) -> dict:
    r = TEST_CLIENT.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _clean_redis():
    FAKE_REDIS.flushall()
    yield
    FAKE_REDIS.flushall()


@pytest.fixture(scope="session")
def client():
    return TEST_CLIENT


@pytest.fixture()
def db():
    s = SessionLocal()
    yield s
    s.rollback()
    s.close()


@pytest.fixture()
def admin_headers():
    return login_headers(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture()
def make_student(db):
    def _make(email=None, full_name="Stu Dent", password="Passw0rd!", **kw):
        email = email or f"student-{uuid.uuid4().hex[:8]}@opslance.local"
        st = models.Student(
            full_name=full_name,
            email=email,
            password_hash=get_password_hash(password),
            must_reset_password=kw.pop("must_reset_password", False),
            **kw,
        )
        db.add(st)
        db.commit()
        db.refresh(st)
        return st
    return _make


@pytest.fixture()
def student(make_student):
    return make_student()


@pytest.fixture()
def student_headers(student):
    return login_headers(student.email, "Passw0rd!")


@pytest.fixture()
def make_lab(db):
    """Get-or-create: the suite shares one DB, so a fixed lab id (e.g. a real
    lab.yaml lab) must resolve to the same row across tests."""
    def _make(lab_id=None, module_number=1, points=100, active=True, **kw):
        lab_id = lab_id or f"test-lab-{uuid.uuid4().hex[:8]}"
        lab = db.query(models.Lab).filter_by(id=lab_id).first()
        if lab:
            return lab
        lab = models.Lab(
            id=lab_id,
            module_number=module_number,
            module_title=kw.pop("module_title", "Module Testing"),
            title=kw.pop("title", lab_id.replace("-", " ").title()),
            difficulty=kw.pop("difficulty", "easy"),
            estimated_minutes=kw.pop("estimated_minutes", 10),
            points=points,
            category=kw.pop("category", "linux"),
            is_globally_active=active,
            **kw,
        )
        db.add(lab)
        db.commit()
        db.refresh(lab)
        return lab
    return _make


def force_running(db, session_id: str, container="container-x") -> None:
    """Push a session straight to `running` — the real worker path is a redis
    queue consumed out of process; tests simulate the worker's effect."""
    s = db.query(models.LabSession).filter_by(id=session_id).first()
    s.status = "running"
    s.container_name = container
    db.commit()


def fake_checker(output: str, exit_code: int = 0):
    """Stub for verification.exec_in_container with a canned check.sh output."""
    return lambda container_name, command: (exit_code, output)


LINUX_PASS_OUTPUT = (
    "✅ PASS [100%]: first check ok\n"
    "✅ PASS [100%]: second check ok\n"
    "✅ PASS [100%]: third check ok\n"
    "✅ PASS [100%]: fourth check ok\n"
    "SCORE: 100/100"
)


@pytest.fixture()
def full_pass_flow(client, db, make_student, make_lab, monkeypatch):
    """Classic flow for a fresh student + lab: session → running → passing
    submit. Returns (student, lab, session_id, submit_response)."""
    def _run(lab_kwargs=None, checker_output=None):
        st = make_student()
        lab = make_lab(**(lab_kwargs or {}))
        r = client.post("/api/sessions/", json={"lab_id": lab.id},
                        headers=login_headers(st.email, "Passw0rd!"))
        assert r.status_code == 200, r.text
        sid = r.json()["session_id"]
        force_running(db, sid)
        monkeypatch.setattr(verification_mod, "exec_in_container",
                            fake_checker(checker_output or
                                         "✅ PASS [100%]: all good\nSCORE: 100/100"))
        r = client.post(f"/api/sessions/{sid}/submit",
                        headers=login_headers(st.email, "Passw0rd!"))
        assert r.status_code == 200, r.text
        return st, lab, sid, r.json()
    return _run
