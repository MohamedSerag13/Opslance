"""Question-by-question runner (lab.yaml schema v2 — see docs/AUTHORING_LABS.md)

Split out of sessions.py: session lifecycle lives there; everything about exam
attempts lives here. Both share the verification pipeline in verification.py.

One attempt per lab session; per-question state persisted server-side so it
survives refresh. Per-question checks run the SAME bash /check.sh as the
classic flow and map its output lines to questions by order; finish() does
one authoritative final run and records a Submission through the same
gamification path as the classic submit.
"""
import json
import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

import lab_content
import models
import verification
from auth import utcnow
from database import get_db
from dependencies import rate_limit_student, redis_client
from logging_setup import get_logger
from schemas import AttemptCreate, QuestionUpdate

logger = get_logger("runner")

router = APIRouter()


def _valid_uuid(value: str):
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        return None


def _get_session_or_404(db: Session, student, session_id: str) -> models.LabSession:
    valid_id = _valid_uuid(session_id)
    if not valid_id:
        raise HTTPException(404, "Invalid Session ID")
    s = db.query(models.LabSession).filter_by(id=valid_id, student_id=student.id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    return s


def _get_attempt_or_404(db: Session, student, s: models.LabSession, attempt_id: str) -> models.ExamAttempt:
    valid_id = _valid_uuid(attempt_id)
    if not valid_id:
        raise HTTPException(404, "Attempt not found")
    attempt = db.query(models.ExamAttempt).filter_by(
        id=valid_id, session_id=s.id, student_id=student.id).first()
    if not attempt:
        raise HTTPException(404, "Attempt not found")
    return attempt


def _lab_questions_or_404(lab_id: str):
    content = lab_content.get_questions(lab_id)
    if not content or not content[1]:
        raise HTTPException(404, "This lab has no lab.yaml (schema v2) — the question runner is not available for it")
    return content  # (lab_meta, questions)


def _questions_for_attempt(attempt: models.ExamAttempt, questions: list) -> list:
    ids = json.loads(attempt.question_ids or "[]")
    return sorted([q for q in questions if q["id"] in set(ids)], key=lambda q: q.get("order", 0))


def _expire_if_needed(db: Session, s: models.LabSession, attempt: models.ExamAttempt,
                      lab_meta: dict, questions: list, student=None, background_tasks=None):
    if (attempt.status == "active" and attempt.mode == "exam" and attempt.expires_at
            and utcnow() >= attempt.expires_at.replace(tzinfo=None)):
        _finish_attempt(db, s, attempt, lab_meta, questions, student=student, background_tasks=background_tasks)


def _attempt_payload(db: Session, s: models.LabSession, attempt: models.ExamAttempt,
                     lab_meta: dict, questions: list) -> dict:
    states = {qs.question_id: qs for qs in attempt.question_states}
    items = []
    domains = {}
    live_earned = 0
    total_weight = 0

    for q in _questions_for_attempt(attempt, questions):
        st = states.get(q["id"])
        status = st.status if st else "unanswered"
        weight = int(q.get("weight") or 0)
        total_weight += weight
        if status == "passed":
            live_earned += weight
        dom = q.get("domain") or lab_meta.get("domain") or "general"
        agg = domains.setdefault(dom, {"domain": dom, "earned": 0, "total": 0, "questions": 0})
        agg["total"] += weight
        agg["questions"] += 1
        if status == "passed":
            agg["earned"] += weight

        hints = q.get("hints") or []
        revealed = min(st.hints_revealed if st else 0, len(hints))
        item = {
            "id": q["id"],
            "order": q.get("order"),
            "domain": dom,
            "weight": weight,
            "prompt": q.get("prompt"),
            "description": q.get("description"),
            "context": q.get("context"),
            "time_target_minutes": q.get("time_target_minutes"),
            "check_description": (q.get("check") or {}).get("description"),
            "hints_total": len(hints),
            "hints_revealed": revealed,
            "hints": [{"number": i + 1, "title": h.get("title"), "content": h.get("content")}
                      for i, h in enumerate(hints[:revealed])],
            "flagged": bool(st.flagged) if st else False,
            "status": status,
            "checks_run": st.checks_run if st else 0,
            "last_output": st.last_output if st else None,
        }
        if attempt.status == "completed":
            # review mode: full walkthrough once the attempt is over
            item["solution"] = q.get("solution")
            item["explanation"] = q.get("explanation")
        items.append(item)

    remaining = None
    if attempt.status == "active" and attempt.mode == "exam" and attempt.expires_at:
        remaining = max(0, int((attempt.expires_at.replace(tzinfo=None) - utcnow()).total_seconds()))

    completed = attempt.status == "completed"
    return {
        "id": str(attempt.id),
        "session_id": str(attempt.session_id),
        "lab_id": attempt.lab_id,
        "mode": attempt.mode,
        "status": attempt.status,
        "current_index": attempt.current_index,
        "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
        "expires_at": attempt.expires_at.isoformat() if attempt.expires_at else None,
        "finished_at": attempt.finished_at.isoformat() if attempt.finished_at else None,
        "remaining_seconds": remaining,
        "duration_seconds": attempt.duration_seconds,
        "pass_mark": attempt.pass_mark,
        "lab_title": lab_meta.get("title"),
        "questions_total": len(items),
        "score_total": attempt.score_total,
        "score_earned": attempt.score_earned if completed else live_earned,
        "passed": attempt.passed,
        "questions": items,
        "domain_breakdown": sorted(domains.values(), key=lambda d: -d["total"]),
    }


def _apply_check_result(db: Session, attempt: models.ExamAttempt, questions: list, results, force: bool = False) -> int:
    """Write per-question states from a mapped check run. force=True marks every
    question (final finish run); otherwise only failed/passed transitions are
    written per question by the caller. Returns number of updated rows."""
    states = {qs.question_id: qs for qs in attempt.question_states}
    updated = 0
    now = utcnow()
    for q, r in zip(questions, results):
        st = states.get(q["id"])
        if st is None or r is None:
            continue
        st.last_passed = r["passed"]
        st.last_output = f"{'PASS' if r['passed'] else 'FAIL'}: {r['description']}"
        st.updated_at = now
        if r["passed"]:
            if st.status != "passed":
                st.status = "passed"
                if not st.first_passed_at:
                    st.first_passed_at = now
                updated += 1
        else:
            if st.status == "unanswered":
                st.status = "failed"
                updated += 1
            elif st.status == "passed" and force:
                st.status = "failed"
                updated += 1
    return updated


def _finish_attempt(db: Session, s: models.LabSession, attempt: models.ExamAttempt,
                    lab_meta: dict, questions: list, student=None, background_tasks=None):
    """Complete an attempt: one authoritative final check.sh run (when the
    container is reachable) re-maps live state onto every question, then scores
    against the pass mark. On a pass it records a Submission through the same
    gamification path as the classic submit."""
    if attempt.status != "active":
        return
    final_output = None
    if s.status == "running" and s.container_name:
        try:
            _exit_code, final_output = verification.exec_in_container(s.container_name, "bash /check.sh")
            results, mapped = lab_content.map_output_to_questions(final_output, questions)
            if mapped:
                _apply_check_result(db, attempt, questions, results, force=True)
        except HTTPException:
            final_output = None  # container gone — grade from stored per-question states

    states = {qs.question_id: qs for qs in attempt.question_states}
    ids = set(json.loads(attempt.question_ids or "[]"))
    score_total = 0
    score_earned = 0
    for q in questions:
        if q["id"] not in ids:
            continue
        w = int(q.get("weight") or 0)
        score_total += w
        st = states.get(q["id"])
        if st and st.status == "passed":
            score_earned += w

    attempt.score_total = score_total
    attempt.score_earned = score_earned
    percent = (score_earned / score_total * 100) if score_total else 0
    attempt.passed = percent >= attempt.pass_mark
    attempt.status = "completed"
    attempt.finished_at = utcnow()

    if attempt.passed and student is not None and background_tasks is not None:
        attempt_number = db.query(models.Submission).filter_by(
            session_id=s.id, student_id=student.id).count() + 1
        time_taken = None
        if attempt.started_at:
            delta = attempt.finished_at - attempt.started_at.replace(tzinfo=None)
            time_taken = int(delta.total_seconds() / 60)
        sub = models.Submission(
            session_id=s.id,
            student_id=student.id,
            lab_id=s.lab_id,
            attempt_number=attempt_number,
            passed=True,
            verification_output=final_output or "",
            score=score_earned,
            hints_used=0,
            time_taken_minutes=time_taken,
        )
        db.add(sub)
        verification.record_passed_submission(db, background_tasks, student, s, score_earned,
                                              final_output or "", hints_used=0,
                                              time_taken=time_taken, attempt_number=attempt_number)
    db.commit()


@router.post("/{session_id}/attempts")
def create_attempt(session_id: str, data: AttemptCreate | None = None, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    if s.status != "running":
        raise HTTPException(400, f"Session is not running (status: {s.status})")

    mode = data.mode if data else "practice"
    if mode not in ("practice", "exam"):
        raise HTTPException(400, "mode must be 'practice' or 'exam'")

    lab_meta, questions = _lab_questions_or_404(s.lab_id)

    existing = db.query(models.ExamAttempt).filter_by(session_id=s.id, status="active").first()
    if existing:
        _expire_if_needed(db, s, existing, lab_meta, questions)
        if existing.status == "active":
            return _attempt_payload(db, s, existing, lab_meta, questions)

    duration_seconds = None
    expires_at = None
    if mode == "exam" and lab_meta.get("time_limit_minutes"):
        duration_seconds = int(lab_meta["time_limit_minutes"]) * 60
        expires_at = utcnow() + timedelta(seconds=duration_seconds)

    attempt = models.ExamAttempt(
        session_id=s.id,
        student_id=student.id,
        lab_id=s.lab_id,
        mode=mode,
        question_ids=json.dumps([q["id"] for q in questions]),
        pass_mark=int(lab_meta.get("pass_mark") or 70),
        score_total=int(lab_meta.get("total") or 100),
        duration_seconds=duration_seconds,
        expires_at=expires_at,
    )
    db.add(attempt)
    db.flush()
    for q in questions:
        db.add(models.QuestionState(attempt_id=attempt.id, question_id=q["id"]))
    db.commit()
    db.refresh(attempt)
    return _attempt_payload(db, s, attempt, lab_meta, questions)


@router.get("/{session_id}/attempts/active")
def get_active_attempt(session_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = db.query(models.ExamAttempt).filter_by(session_id=s.id, student_id=student.id, status="active").first()
    if not attempt:
        raise HTTPException(404, "No active attempt")
    lab_meta, questions = _lab_questions_or_404(s.lab_id)
    _expire_if_needed(db, s, attempt, lab_meta, questions, student=student, background_tasks=background_tasks)
    db.refresh(attempt)
    return _attempt_payload(db, s, attempt, lab_meta, questions)


@router.get("/{session_id}/attempts/{attempt_id}")
def get_attempt(session_id: str, attempt_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = _get_attempt_or_404(db, student, s, attempt_id)
    lab_meta, questions = _lab_questions_or_404(s.lab_id)
    _expire_if_needed(db, s, attempt, lab_meta, questions, student=student, background_tasks=background_tasks)
    db.refresh(attempt)
    return _attempt_payload(db, s, attempt, lab_meta, questions)


@router.patch("/{session_id}/attempts/{attempt_id}/questions/{question_id}")
def update_question(session_id: str, attempt_id: str, question_id: str, data: QuestionUpdate,
                    db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = _get_attempt_or_404(db, student, s, attempt_id)
    if attempt.status != "active":
        raise HTTPException(400, "Attempt is completed")
    qs = db.query(models.QuestionState).filter_by(attempt_id=attempt.id, question_id=question_id).first()
    if not qs:
        raise HTTPException(404, "Question not part of this attempt")

    if data.flagged is not None:
        qs.flagged = data.flagged
    if data.current:
        _lab_meta, questions = _lab_questions_or_404(s.lab_id)
        idx = next((i for i, q in enumerate(_questions_for_attempt(attempt, questions))
                    if q["id"] == question_id), None)
        if idx is not None:
            attempt.current_index = idx
    db.commit()
    return {"ok": True, "question_id": question_id, "flagged": qs.flagged}


@router.post("/{session_id}/attempts/{attempt_id}/questions/{question_id}/check")
def check_question(session_id: str, attempt_id: str, question_id: str,
                   db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = _get_attempt_or_404(db, student, s, attempt_id)
    if attempt.status != "active":
        raise HTTPException(400, "Attempt is completed")
    if s.status != "running":
        raise HTTPException(400, f"Session is not running (status: {s.status})")
    if not s.container_name:
        raise HTTPException(400, "Container not assigned yet — lab may still be starting")

    # rate limit: max 40 checks / 5 min per attempt + 2s cooldown per question
    rl_key = f"qcheck:{student.id}:{attempt.id}"
    count = redis_client.get(rl_key)
    if count and int(count) >= 40:
        raise HTTPException(429, "Too many checks — wait a minute before checking again")
    pipe = redis_client.pipeline()
    pipe.incr(rl_key)
    pipe.expire(rl_key, 300)
    pipe.execute()
    gate_key = f"qcheck_gate:{student.id}:{attempt.id}:{question_id}"
    if not redis_client.set(gate_key, 1, nx=True, ex=2):
        raise HTTPException(429, "Slow down — you can re-check a question every 2 seconds")

    lab_meta, questions = _lab_questions_or_404(s.lab_id)
    q = next((q for q in _questions_for_attempt(attempt, questions) if q["id"] == question_id), None)
    if not q:
        raise HTTPException(404, "Question not part of this attempt")

    # Per-question validation: CKA checkers accept `bash /check.sh <n>` to grade a
    # single task — one check runs, not the whole lab. Falls back to a full check
    # + order mapping for checkers without single-task dispatch.
    _exit_code, output = verification.exec_in_container(s.container_name, f"bash /check.sh {q['order']}")
    single = lab_content.parse_check_output(output)
    result = single[0] if len(single) == 1 else None
    if result is None:
        _ec, full_output = verification.exec_in_container(s.container_name, "bash /check.sh")
        results, mapped = lab_content.map_output_to_questions(full_output, questions)
        result = results[q["order"] - 1] if mapped else None

    states = {qs.question_id: qs for qs in attempt.question_states}
    st = states.get(q["id"])
    if result is None:
        return {
            "question_id": q["id"],
            "mapped": False,
            "passed": None,
            "message": "Checker output could not be mapped to this question. "
                       "Per-question state was not changed.",
        }
    st.checks_run += 1
    st.last_passed = result["passed"]
    st.last_output = f"{'PASS' if result['passed'] else 'FAIL'}: {result['description']}"
    now = utcnow()
    if result["passed"]:
        st.status = "passed"
        if not st.first_passed_at:
            st.first_passed_at = now
    elif st.status != "failed":
        st.status = "failed"
    db.commit()

    live_earned = sum(int(qq.get("weight") or 0) for qq in _questions_for_attempt(attempt, questions)
                      if states[qq["id"]].status == "passed")
    return {
        "question_id": q["id"],
        "mapped": True,
        "passed": result["passed"],
        "status": st.status,
        "weight": q.get("weight"),
        "output": st.last_output,
        "score_earned": live_earned,
        "score_total": attempt.score_total,
        "message": f"✓ Passes — +{q.get('weight')} pts recorded for this question"
                   if result["passed"]
                   else "✕ Not passing yet — fix your cluster state, then check again.",
    }


@router.post("/{session_id}/attempts/{attempt_id}/questions/{question_id}/hint")
def reveal_question_hint(session_id: str, attempt_id: str, question_id: str,
                         db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = _get_attempt_or_404(db, student, s, attempt_id)
    if attempt.status != "active":
        raise HTTPException(400, "Attempt is completed")
    if attempt.mode == "exam":
        raise HTTPException(403, "Hints are disabled in exam mode")

    lab_meta, questions = _lab_questions_or_404(s.lab_id)
    q = next((q for q in _questions_for_attempt(attempt, questions) if q["id"] == question_id), None)
    if not q:
        raise HTTPException(404, "Question not part of this attempt")
    hints = q.get("hints") or []
    st = db.query(models.QuestionState).filter_by(attempt_id=attempt.id, question_id=question_id).first()
    if not st:
        raise HTTPException(404, "Question not part of this attempt")
    if st.hints_revealed >= len(hints):
        raise HTTPException(400, "No more hints for this question")

    st.hints_revealed += 1
    hint = hints[st.hints_revealed - 1]
    db.commit()
    return {
        "number": st.hints_revealed,
        "title": hint.get("title"),
        "content": hint.get("content"),
        "hints_revealed": st.hints_revealed,
        "hints_total": len(hints),
    }


@router.post("/{session_id}/attempts/{attempt_id}/finish")
def finish_attempt(session_id: str, attempt_id: str, background_tasks: BackgroundTasks,
                   db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = _get_attempt_or_404(db, student, s, attempt_id)
    if attempt.status != "active":
        raise HTTPException(400, "Attempt is already completed")
    lab_meta, questions = _lab_questions_or_404(s.lab_id)
    _finish_attempt(db, s, attempt, lab_meta, questions, student=student, background_tasks=background_tasks)
    db.refresh(attempt)
    return _attempt_payload(db, s, attempt, lab_meta, questions)


@router.post("/{session_id}/attempts/{attempt_id}/retry-failed")
def retry_failed_questions(session_id: str, attempt_id: str, db: Session = Depends(get_db), student=Depends(rate_limit_student)):
    s = _get_session_or_404(db, student, session_id)
    attempt = _get_attempt_or_404(db, student, s, attempt_id)
    if attempt.status != "completed":
        raise HTTPException(400, "Finish the current attempt before retrying failed questions")
    lab_meta, questions = _lab_questions_or_404(s.lab_id)

    failed_ids = [qs.question_id for qs in attempt.question_states if qs.status != "passed"]
    if not failed_ids:
        raise HTTPException(400, "Nothing to retry — every question passed")

    duration_seconds = None
    expires_at = None
    if attempt.mode == "exam" and attempt.duration_seconds:
        duration_seconds = attempt.duration_seconds
        expires_at = utcnow() + timedelta(seconds=duration_seconds)

    retry = models.ExamAttempt(
        session_id=s.id,
        student_id=student.id,
        lab_id=s.lab_id,
        mode=attempt.mode,
        question_ids=json.dumps(failed_ids),
        pass_mark=attempt.pass_mark,
        score_total=sum(int(q.get("weight") or 0) for q in questions if q["id"] in set(failed_ids)),
        duration_seconds=duration_seconds,
        expires_at=expires_at,
    )
    db.add(retry)
    db.flush()
    for qid in failed_ids:
        db.add(models.QuestionState(attempt_id=retry.id, question_id=qid))
    db.commit()
    db.refresh(retry)
    return _attempt_payload(db, s, retry, lab_meta, questions)
