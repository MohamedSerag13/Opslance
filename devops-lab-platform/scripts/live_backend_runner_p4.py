#!/usr/bin/env python3
"""Live backend for the Playwright E2E suite (see docs/TESTING.md).

Real Postgres (pgserver), alembic migrations, admin seed, lab sync,
fakeredis, canned checker output — served on 127.0.0.1:8123.

Seeded world:
- admin@opslance.local / Admin@2025!            (seed_admin.py)
- Visual Tester  visual@opslance.local / VisualPass1!   Pro, 9 passes + 1 fail,
  running sessions, active CKA mock exam attempt with a 2h timer,
  two earned achievements (First Deploy, Zero Downtime)
- Rival Runner   rival@opslance.local  / VisualPass1!   6 passes, higher XP

Redis zsets leaderboard:{session,all_time}:{group_id} hold both students
(rival leads all-time, Visual leads session — proves the scope toggle).

Ready file: /tmp/opslance_e2e_ready
"""
import re
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
from datetime import datetime, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PLATFORM = os.path.dirname(SCRIPT_DIR)                       # devops-lab-platform/
REPO_ROOT = os.path.dirname(PLATFORM)                        # Opslance/
BACKEND = os.path.join(PLATFORM, "backend")
LABS = os.environ.get("LABS_REPO", os.path.join(REPO_ROOT, "labs"))
PG_DIR = "/tmp/opslance_e2e_pg"
READY = "/tmp/opslance_e2e_ready"

import pgserver  # noqa: E402
shutil.rmtree(PG_DIR, ignore_errors=True)
server = pgserver.get_server(PG_DIR)
DATABASE_URL = server.get_uri()

env = {**os.environ, "DATABASE_URL": DATABASE_URL, "SECRET_KEY": os.environ.get("SECRET_KEY", "stub_runner_secret_key"), "ADMIN_EMAIL": "admin@opslance.local",
       "ADMIN_PASSWORD": "Admin@2025!", "LABS_HOST_PATH": LABS}
r = subprocess.run(["sh", "-c",
                    'alembic upgrade head && PYTHONPATH="$PWD" python scripts/seed_admin.py '
                    '&& LABS_DIR="$LABS_HOST_PATH/linux" PYTHONPATH="$PWD" python scripts/seed_courses.py '
                    '&& LABS_HOST_PATH="$LABS_HOST_PATH" PYTHONPATH="$PWD" python scripts/sync_labs.py'],
                   cwd=BACKEND, env={**env, "LABS_HOST_PATH": LABS}, capture_output=True, text=True, timeout=600)
if r.returncode != 0:
    print((r.stdout + r.stderr)[-3000:])
    sys.exit("db-init steps FAILED")
print("migrations + seed + sync OK")

os.environ.update(env)
sys.path.insert(0, BACKEND)

import fakeredis  # noqa: E402
import dependencies  # noqa: E402
import models  # noqa: E402
import routers.sessions as rs  # noqa: E402
from achievements import ensure_achievement_catalog  # noqa: E402
from database import SessionLocal  # noqa: E402

fake = fakeredis.FakeRedis()
dependencies.redis_client = fake
rs.redis_client = fake
for name, mod in list(sys.modules.items()):
    if name.startswith("routers") and hasattr(mod, "redis_client"):
        mod.redis_client = fake

LINUX_OUT = (
    "=== Checking: Lost in the Filesystem ===\n"
    "✅ PASS [35%]: /home/intern/found.txt exists and contains 'I navigated the Linux filesystem'\n"
    "✅ PASS [35%]: /home/intern/etc-count.txt exists and is not empty\n"
    "✅ PASS [30%]: /home/intern/projects/alpha/beta/gamma/visited.txt exists\n"
    "SCORE: 100/100\n")
CKA_OUT = "\n".join(
    f"  PASS [+10 pts] task {i} verified against the live cluster" for i in range(1, 19)) + \
    "\nSCORE: 180/180\n"


def exec_in_container(container_name, command):
    # Command-aware stub: `bash /check.sh <n>` (single-task dispatch) returns
    # exactly one PASS line for that question; the full check returns one PASS
    # line per question of the session's lab.
    try:
        d = SessionLocal()
        s = d.query(models.LabSession).filter_by(container_name=container_name).first()
        lab_id = s.lab_id if s else None
        d.close()
    except Exception:
        lab_id = None
    qs = None
    if lab_id:
        import lab_content
        got = lab_content.get_questions(lab_id)
        if got:
            qs = got[1]
    if qs and all((q.get("check") or {}).get("kind") == "task" for q in qs):
        by_order = {int(q["order"]): q for q in qs}
        m = re.fullmatch(r"bash /check\.sh (\d+)", command.strip())
        if m and int(m.group(1)) in by_order:
            q = by_order[int(m.group(1))]
            return 0, f"  PASS [+{q['weight']} pts] task {q['order']} verified against the live cluster"
        total = sum(int(q["weight"]) for q in qs)
        out = "\n".join(
            f"  PASS [+{q['weight']} pts] task {q['order']} verified against the live cluster"
            for q in qs)
        return 0, out + f"\nSCORE: {total}/{total}\n"
    output = LINUX_OUT if "1" in container_name else CKA_OUT
    return 0, output


rs.exec_in_container = exec_in_container

db = SessionLocal()
from auth import pwd_context  # noqa: E402

ensure_achievement_catalog(db)

grp = db.query(models.Group).filter_by(name="Default Group").first()
if not grp:
    grp = models.Group(name="Default Group")
    db.add(grp)
    db.flush()

for gl_lab in db.query(models.Lab).all():
    if not db.query(models.GroupLab).filter_by(group_id=grp.id, lab_id=gl_lab.id).first():
        db.add(models.GroupLab(group_id=grp.id, lab_id=gl_lab.id, is_visible=True,
                               unlock_order=gl_lab.module_number * 10))
db.flush()

labs = {l.id: l for l in db.query(models.Lab).all()}
linux_labs = sorted([l for l in labs.values() if l.category == "linux"],
                    key=lambda l: (l.module_number, l.id))
mock_id = next(i for i in labs if "mock" in i)

student = models.Student(
    full_name="Visual Tester", email="visual@opslance.local",
    password_hash=pwd_context.hash("VisualPass1!"),
    group_id=grp.id, must_reset_password=False, subscription_tier="pro",
    xp=1240, level=3, current_streak=4, longest_streak=6)
db.add(student)
db.flush()

rival = models.Student(
    full_name="Rival Runner", email="rival@opslance.local",
    password_hash=pwd_context.hash("VisualPass1!"),
    group_id=grp.id, must_reset_password=False, subscription_tier="pro",
    xp=1980, level=4, current_streak=9, longest_streak=12)
db.add(rival)
db.flush()


def add_pass(st, lab, when, score=None, session=None):
    s = models.Submission(student_id=st.id, lab_id=lab.id, passed=True,
                          score=score if score is not None else lab.points,
                          hints_used=0, time_taken_minutes=lab.estimated_minutes,
                          submitted_at=when)
    if session:
        s.session_id = session.id
    db.add(s)


def add_fail(st, lab, when):
    db.add(models.Submission(student_id=st.id, lab_id=lab.id, passed=False,
                             score=45, hints_used=2, time_taken_minutes=10,
                             submitted_at=when))


now = datetime.utcnow()

# Visual Tester: pass 9 linux labs spread over 40 days (heatmap + module progress)
for k, lab in enumerate(linux_labs[:9]):
    when = now - timedelta(days=38 - k * 4, hours=k % 5)
    sess = models.LabSession(student_id=student.id, lab_id=lab.id, status="stopped",
                             container_name=f"done-{k}")
    db.add(sess)
    db.flush()
    add_pass(student, lab, when, session=sess)

# earned badges for the /achievements page (catalog + two unlocks)
db.add_all([
    models.StudentAchievement(student_id=student.id, achievement_id="first_deploy",
                              earned_at=now - timedelta(days=38)),
    models.StudentAchievement(student_id=student.id, achievement_id="zero_downtime",
                              earned_at=now - timedelta(days=38)),
])

# one failed lab (module 10) with a still-running session -> retry card
fail_lab = linux_labs[36]
s_fail = models.LabSession(student_id=student.id, lab_id=fail_lab.id, status="running",
                           container_name="fake-container-1")
db.add(s_fail)
add_fail(student, fail_lab, now - timedelta(days=1))

# a running linux session (module 11, untouched) -> classic resume card
next_lab = linux_labs[40]
s_next = models.LabSession(student_id=student.id, lab_id=next_lab.id, status="running",
                           container_name="fake-container-1")
db.add(s_next)

# ACTIVE exam attempt on the CKA mock -> continue card with live countdown
s_exam = models.LabSession(student_id=student.id, lab_id=mock_id, status="running",
                           container_name="fake-container-2")
db.add(s_exam)
db.flush()
attempt = models.ExamAttempt(
    session_id=s_exam.id, student_id=student.id, lab_id=mock_id, mode="exam",
    status="active", current_index=7, expires_at=now + timedelta(seconds=7200),
    pass_mark=66, score_total=180)
attempt.question_ids = json.dumps([f"task_{i}" for i in range(1, 19)])
db.add(attempt)

# a running CKA week-1 session WITHOUT an attempt -> mode picker + practice
w1_id = next(i for i in labs if "w1-lab-01" in i)
db.add(models.LabSession(student_id=student.id, lab_id=w1_id, status="running",
                         container_name="fake-container-w1"))

# Rival: pass 6 labs (module 1-6 first labs) recently + first_deploy badge
for k, lab in enumerate(linux_labs[:6]):
    add_pass(rival, lab, now - timedelta(days=10 - k))
db.add(models.StudentAchievement(student_id=rival.id, achievement_id="first_deploy",
                                 earned_at=now - timedelta(days=10)))

db.commit()

# Redis leaderboards for /gamification/leaderboard/{scope} (standalone page).
# Session scope: Visual leads. All-time: Rival leads — proves the toggle works.
def zadd(scope, sid, score):
    fake.zadd(f"leaderboard:{scope}:{grp.id}", {str(sid): score})

visual_points = sum(l.points for l in linux_labs[:9])
rival_points = sum(l.points for l in linux_labs[:6])
zadd("session", student.id, visual_points)
zadd("session", rival.id, max(1, rival_points - 20))
zadd("all_time", student.id, visual_points)
zadd("all_time", rival.id, rival_points + 400)

print("seeded:", json.dumps({
    "student_email": student.email, "rival_email": rival.email,
    "mock_lab": mock_id, "attempt_id": str(attempt.id),
    "fail_lab": fail_lab.id, "next_lab": next_lab.id,
    "session_scores": {student.full_name: visual_points, rival.full_name: max(1, rival_points - 20)}}))
db.close()


def run_server():
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8123, log_level="warning")


threading.Thread(target=run_server, daemon=True).start()

for _ in range(60):
    time.sleep(1)
    try:
        with urllib.request.urlopen("http://127.0.0.1:8123/api/health", timeout=2) as resp:
            if resp.status == 200:
                open(READY, "w").write("ok")
                print("BACKEND READY on :8123")
                break
    except Exception:
        continue
else:
    sys.exit("backend never became healthy")

while True:
    time.sleep(3600)
