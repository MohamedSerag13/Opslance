"""Admin endpoints: students CRUD/bulk, groups, environments, analytics."""
import io
import uuid

import models


def test_students_crud(client, admin_headers):
    r = client.post("/api/admin/students", headers=admin_headers,
                    json={"full_name": "New Kid", "email": f"kid-{uuid.uuid4().hex[:6]}@opslance.local",
                          "password": "StartPass1!"})
    assert r.status_code == 200, r.text
    sid = r.json()["id"]

    r = client.put(f"/api/admin/students/{sid}", headers=admin_headers,
                   json={"full_name": "Renamed Kid", "email": r.json()["email"],
                         "group_id": None, "is_active": False})
    assert r.status_code == 200

    r = client.get("/api/admin/students", headers=admin_headers)
    assert any(s["id"] == sid for s in r.json())

    r = client.delete(f"/api/admin/students/{sid}", headers=admin_headers)
    assert r.status_code == 200


def test_create_duplicate_email_400(client, admin_headers, make_student):
    st = make_student()
    r = client.post("/api/admin/students", headers=admin_headers,
                    json={"full_name": "Dup", "email": st.email, "password": "StartPass1!"})
    assert r.status_code == 400


def test_bulk_create_from_csv(client, admin_headers, db):
    csv_data = "full_name,email,password\nBulk One,bulk1@opslance.local,Passw0rd!\nBulk Two,bulk2@opslance.local,Passw0rd!\n"
    r = client.post("/api/admin/students/bulk", headers=admin_headers,
                    files={"file": ("students.csv", io.BytesIO(csv_data.encode()), "text/csv")})
    assert r.status_code == 200
    assert r.json()["created"] == 2


def test_bulk_skips_duplicate_rows(client, admin_headers, make_student):
    st = make_student(email="bulk-dup@opslance.local")
    csv_data = "full_name,email,password\nA,bulk-dup@opslance.local,Passw0rd!\nB,bulk-new@opslance.local,Passw0rd!\n"
    r = client.post("/api/admin/students/bulk", headers=admin_headers,
                    files={"file": ("students.csv", io.BytesIO(csv_data.encode()), "text/csv")})
    assert r.json()["created"] == 1


def test_points_and_plan_updates(client, admin_headers, make_student):
    st = make_student()
    r = client.patch(f"/api/admin/students/{st.id}/points", headers=admin_headers, json={"xp": 1000})
    assert r.json()["xp"] == 1000 and r.json()["level"] == 3

    r = client.patch(f"/api/admin/students/{st.id}/plan", headers=admin_headers, json={"plan": "pro"})
    assert r.json()["plan"] == "pro"

    r = client.patch(f"/api/admin/students/{st.id}/plan", headers=admin_headers, json={"plan": "gold"})
    assert r.status_code == 400


def test_groups_lifecycle(client, admin_headers):
    name = f"Group-{uuid.uuid4().hex[:6]}"
    r = client.post("/api/admin/groups", headers=admin_headers, json={"name": name, "description": "d"})
    assert r.status_code == 200
    gid = r.json()["id"]

    r = client.get("/api/admin/groups", headers=admin_headers)
    assert any(g["name"] == name for g in r.json())

    r = client.put(f"/api/admin/groups/{gid}", headers=admin_headers, json={"name": name + "-x", "description": "d2"})
    assert r.status_code == 200

    r = client.post(f"/api/admin/groups/{gid}/labs/show-all", headers=admin_headers)
    assert r.status_code == 200

    r = client.get(f"/api/admin/groups/{gid}/labs", headers=admin_headers)
    assert r.status_code == 200

    r = client.delete(f"/api/admin/groups/{gid}", headers=admin_headers)
    assert r.status_code == 200


def test_environments_lists_running_sessions(client, admin_headers, db, make_student, make_lab):
    st = make_student()
    lab = make_lab()
    sess = models.LabSession(student_id=st.id, lab_id=lab.id, status="running",
                             container_name="env-check-1")
    db.add(sess)
    db.commit()
    r = client.get("/api/admin/environments", headers=admin_headers)
    rows = r.json()
    assert any(e["container_name"] == "env-check-1" for e in rows)
    assert rows[0]["student_name"] == st.full_name


def test_admin_lab_catalog_and_update(client, admin_headers, make_lab):
    lab = make_lab()
    r = client.get("/api/admin/labs", headers=admin_headers)
    assert any(l["id"] == lab.id for l in r.json())
    r = client.put(f"/api/admin/labs/{lab.id}", headers=admin_headers,
                   json={"points": 77, "difficulty": "hard"})
    assert r.status_code == 200
    assert r.json()["points"] == 77
    assert r.json()["difficulty"] == "hard"


def test_analytics_aggregate_shape_and_counts(client, admin_headers, db, make_student, make_lab):
    st = make_student()
    st2 = make_student(full_name="Second")
    lab = make_lab(points=100)
    other_lab = make_lab(points=50, module_number=2)
    db.add_all([
        models.Submission(student_id=st.id, lab_id=lab.id, attempt_number=1,
                          passed=True, score=90, submitted_at=__import__("datetime").datetime.utcnow()),
        models.Submission(student_id=st.id, lab_id=other_lab.id, attempt_number=1,
                          passed=False, score=0, submitted_at=__import__("datetime").datetime.utcnow()),
        models.Submission(student_id=st2.id, lab_id=lab.id, attempt_number=1,
                          passed=True, score=70, submitted_at=__import__("datetime").datetime.utcnow()),
    ])
    st.xp = 160
    db.commit()

    r = client.get("/api/admin/analytics?days=30", headers=admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    o = body["overview"]
    # shared DB: assert against our seeded deltas, not absolute totals
    assert o["students_total"] >= 2
    assert o["submissions_window"] >= 3
    assert o["passed_window"] >= 2
    assert 0 <= o["pass_rate_all_time"] <= 100
    assert o["xp_total_awarded"] >= 160
    assert len(body["daily"]) == 30
    top = next(l for l in body["top_labs"] if l["lab_id"] == lab.id)
    assert top["attempts"] == 2 and top["students"] == 2 and top["pass_rate"] == 100.0
    other = next(l for l in body["top_labs"] if l["lab_id"] == other_lab.id)
    assert other["attempts"] == 1 and other["pass_rate"] == 0.0
    assert len(body["recent"]) >= 3
    ours = [r_ for r_ in body["recent"] if r_["lab_id"] == lab.id]
    assert ours and {r_["student_name"] for r_ in ours} >= {"Stu Dent", "Second"}


def test_analytics_window_validation(client, admin_headers):
    assert client.get("/api/admin/analytics?days=3", headers=admin_headers).status_code == 422
    assert client.get("/api/admin/analytics?days=200", headers=admin_headers).status_code == 422


def test_analytics_rejects_students(client, student_headers):
    assert client.get("/api/admin/analytics", headers=student_headers).status_code == 403
