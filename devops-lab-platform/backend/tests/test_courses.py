"""Courses API: catalog, detail, per-day tick progress (auth + validation)."""
import importlib.util
import json
import os

import pytest

import models
from tests.conftest import login_headers

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture()
def seeded_courses(db):
    """Seed both courses in-process (the real seed script, not a copy)."""
    path = os.path.join(BACKEND_DIR, "scripts", "seed_courses.py")
    spec = importlib.util.spec_from_file_location("seed_courses", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.LABS_DIR = "/nonexistent-labs"  # keep the linux weeks deterministic
    from database import SessionLocal
    session = SessionLocal()
    try:
        mod.upsert_course(session, {
            "id": "cka-8-weeks", "slug": "cka-8-weeks", "title": "CKA in 8 Weeks",
            "subtitle": "exam-ready", "description": "# plan", "author": "@mohamed",
            "published_at": None, "duration_weeks": 8, "hours_per_week": 14,
            "exam_domain": "CKA", "pass_mark": 66, "difficulty": "advanced",
            "tags": json.dumps(["kubernetes"]), "is_active": True, "cover_color": "primary",
            "weeks": mod.CKA_WEEKS,
        })
        mod.upsert_course(session, {
            "id": "linux-fundamentals", "slug": "linux-fundamentals", "title": "Linux Fundamentals",
            "subtitle": "modules", "description": "# linux", "author": "@mohamed",
            "published_at": None, "duration_weeks": 15, "hours_per_week": 6,
            "exam_domain": "Linux", "pass_mark": None, "difficulty": "beginner",
            "tags": json.dumps(["linux"]), "is_active": True, "cover_color": "success",
            "weeks": mod._linux_module_weeks(),
        })
    finally:
        session.close()
    return True



def test_list_courses_returns_seeded_catalog(client, student_headers, seeded_courses):
    r = client.get("/api/courses", headers=student_headers)
    assert r.status_code == 200
    courses = r.json()
    slugs = {c["slug"] for c in courses}
    assert {"cka-8-weeks", "linux-fundamentals"} <= slugs
    cka = next(c for c in courses if c["slug"] == "cka-8-weeks")
    assert cka["duration_weeks"] == 8 and cka["pass_mark"] == 66
    assert cka["enrollment_pct"] == 0  # nothing ticked yet


def test_course_detail_has_all_56_days(client, student_headers, seeded_courses):
    r = client.get("/api/courses/cka-8-weeks", headers=student_headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body["weeks"]) == 8
    assert sum(len(w["days"]) for w in body["weeks"]) == 56
    w1 = body["weeks"][0]
    assert w1["days"][0]["items"][0]["tick"] == "read"
    assert w1["gate"]
    assert body["ticks_total"] > 100  # 3 ticks x 5 days x 8 weeks + extras


def test_course_detail_404_for_unknown_slug(client, student_headers, seeded_courses):
    assert client.get("/api/courses/nope", headers=student_headers).status_code == 404


def test_courses_require_auth(client, seeded_courses):
    assert client.get("/api/courses").status_code == 401
    assert client.get("/api/courses/cka-8-weeks").status_code == 401


def test_tick_roundtrip_and_persistence(client, student_headers, seeded_courses):
    h = student_headers
    body = {"week": 1, "day_index": 0, "tick": "read", "value": True}
    r = client.post("/api/courses/cka-8-weeks/progress", json=body, headers=h)
    assert r.status_code == 200
    assert r.json()["ticks"]["read"] is True

    # persisted: progress GET reflects it, catalog % recomputes
    prog = client.get("/api/courses/cka-8-weeks/progress", headers=h).json()
    assert prog["days"]["1:0"]["read"] is True
    listing = client.get("/api/courses", headers=h).json()
    cka = next(c for c in listing if c["slug"] == "cka-8-weeks")
    assert cka["enrollment_pct"] > 0

    # clearing the tick works too
    r2 = client.post("/api/courses/cka-8-weeks/progress",
                     json={**body, "value": False}, headers=h)
    assert r2.json()["ticks"]["read"] is False


def test_tick_second_day_of_same_week_is_a_separate_row(client, student_headers, seeded_courses):
    h = student_headers
    client.post("/api/courses/cka-8-weeks/progress",
                json={"week": 2, "day_index": 0, "tick": "course", "value": True}, headers=h)
    client.post("/api/courses/cka-8-weeks/progress",
                json={"week": 2, "day_index": 1, "tick": "lab", "value": True}, headers=h)
    days = client.get("/api/courses/cka-8-weeks/progress", headers=h).json()["days"]
    assert days["2:0"] == {"read": False, "course": True, "lab": False}
    assert days["2:1"] == {"read": False, "course": False, "lab": True}


def test_tick_validates_week_and_day(client, student_headers, seeded_courses):
    h = student_headers
    assert client.post("/api/courses/cka-8-weeks/progress",
                       json={"week": 9, "day_index": 0, "tick": "read", "value": True},
                       headers=h).status_code == 404
    assert client.post("/api/courses/cka-8-weeks/progress",
                       json={"week": 1, "day_index": 7, "tick": "read", "value": True},
                       headers=h).status_code == 404
    assert client.post("/api/courses/cka-8-weeks/progress",
                       json={"week": 1, "day_index": 0, "tick": "bogus", "value": True},
                       headers=h).status_code == 422
