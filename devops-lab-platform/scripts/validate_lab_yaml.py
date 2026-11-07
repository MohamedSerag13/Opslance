#!/usr/bin/env python3
"""Validate lab.yaml (schema v2) for every lab — schema + byte-identical grading contract.

For each lab dir (docker-compose.yml + metadata.json + check.sh + lab.yaml):
- lab.yaml parses; required fields present; types sane;
- lab == metadata.json id;
- questions: unique ids, order 1..N contiguous, hints <= 3 with title+content,
  weights positive ints, prompt non-empty;
- check contract: re-parsing check.sh gives the SAME number of checks, and for
  each question the recorded check.index/kind/weight/description match exactly
  (this is what keeps per-question grading byte-identical to the full run);
- grading: total == sum(weights); pass_mark matches the pass mark parsed from
  check.sh (linux "-ge N", CKA "finish N").

Exit code 1 if any lab fails. --quiet prints only failures + summary.
"""
import json
import os
import re
import sys

import yaml

REPO_LABS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "labs")
CHECK_CALL_RE = re.compile(r'(?:^|\n)(?:\s*|chk_\d+\(\)\s*\{\s*)(run_check|task)\s+(\d+)\s+"((?:[^"\\]|\\.)*)"')
LINUX_PASS_RE = re.compile(r'-ge\s+(\d+)')
CKA_PASS_RE = re.compile(r'finish\s+(\d+)')

REQUIRED_LAB = {"schema_version", "lab", "title", "category", "domain", "pass_mark",
                "grading_scale", "total", "questions"}
REQUIRED_Q = {"id", "order", "domain", "weight", "prompt", "hints", "check", "time_target_minutes"}
REQUIRED_CHECK = {"script", "index", "kind", "description"}

errors = []
warnings = []


def fail(lab, msg):
    errors.append(f"{lab}: {msg}")


def validate(lab_dir):
    lab = os.path.relpath(lab_dir, LABS_ROOT)
    ypath = os.path.join(lab_dir, "lab.yaml")
    meta = json.load(open(os.path.join(lab_dir, "metadata.json"), encoding="utf-8"))
    check_src = open(os.path.join(lab_dir, "check.sh"), encoding="utf-8").read()

    if not os.path.exists(ypath):
        fail(lab, "lab.yaml missing")
        return
    doc = yaml.safe_load(open(ypath, encoding="utf-8"))
    if not isinstance(doc, dict):
        fail(lab, "lab.yaml is not a mapping")
        return

    missing = REQUIRED_LAB - set(doc)
    if missing:
        fail(lab, f"missing lab fields: {sorted(missing)}")
        return
    if doc["schema_version"] != 2:
        fail(lab, f"schema_version must be 2, got {doc['schema_version']!r}")
    if doc["lab"] != meta.get("id"):
        fail(lab, f"lab {doc['lab']!r} != metadata.json id {meta.get('id')!r}")

    calls = [{"kind": m.group(1), "weight": int(m.group(2)), "description": m.group(3)}
             for m in CHECK_CALL_RE.finditer(check_src)]
    qs = doc["questions"]
    if not isinstance(qs, list) or not qs:
        fail(lab, "questions must be a non-empty list")
        return
    if len(qs) != len(calls):
        fail(lab, f"{len(qs)} questions but check.sh has {len(calls)} checks")
        return

    ids = set()
    earned = 0
    for q in qs:
        qid = q.get("id", "<no-id>")
        where = f"{lab}/{qid}"
        miss = REQUIRED_Q - set(q)
        if miss:
            fail(where, f"missing question fields: {sorted(miss)}")
            continue
        if q["id"] in ids:
            fail(where, "duplicate question id")
        ids.add(q["id"])
        if not isinstance(q["order"], int) or q["order"] < 1 or q["order"] > len(qs):
            fail(where, f"order out of range: {q['order']!r}")
        if not isinstance(q["weight"], int) or q["weight"] <= 0:
            fail(where, f"weight must be a positive int, got {q['weight']!r}")
        if not str(q["prompt"] or "").strip():
            fail(where, "empty prompt")
        if not (isinstance(q["hints"], list) and len(q["hints"]) <= 3):
            fail(where, f"hints must be a list of at most 3, got {len(q['hints'])!r}")
        else:
            for h in q["hints"]:
                if not (isinstance(h, dict) and str(h.get("content") or "").strip()):
                    fail(where, f"hint without content: {h!r}")
                    break
        if q.get("solution") and not str(q["solution"]).strip():
            fail(where, "solution present but empty")
        ttm = q["time_target_minutes"]
        if ttm is not None and not (isinstance(ttm, int) and ttm > 0):
            fail(where, f"time_target_minutes must be null or positive int, got {ttm!r}")

        chk = q.get("check") or {}
        missc = REQUIRED_CHECK - set(chk)
        if missc:
            fail(where, f"check missing fields: {sorted(missc)}")
            continue
        i = q["order"] - 1
        call = calls[i]
        if chk["index"] != q["order"]:
            fail(where, f"check.index {chk['index']} != order {q['order']}")
        if chk["kind"] != call["kind"]:
            fail(where, f"check.kind {chk['kind']!r} != checker {call['kind']!r}")
        if chk["description"] != call["description"]:
            fail(where, "check.description differs from check.sh (grading would not be byte-identical)")
        if q["weight"] != call["weight"]:
            fail(where, f"weight {q['weight']} != checker weight {call['weight']}")
        earned += q["weight"]

    if doc["total"] != earned:
        fail(lab, f"total {doc['total']} != sum of weights {earned}")

    # Pass-mark expression by check kind: `task` checkers end with `finish N`
    # (percent), `run_check` checkers use a `-ge N` threshold. A `-ge N` can
    # also appear inside a task snippet (etcd snapshot size, pod-name count),
    # so kind — not regex order — decides which expression is the pass mark.
    if calls and calls[0]["kind"] == "task":
        m = CKA_PASS_RE.search(check_src)
    else:
        m = LINUX_PASS_RE.search(check_src) or CKA_PASS_RE.search(check_src)
    if m and doc["pass_mark"] != int(m.group(1)):
        fail(lab, f"pass_mark {doc['pass_mark']} != checker pass mark {m.group(1)}")
    if doc["grading_scale"] not in ("percent", "points"):
        fail(lab, f"grading_scale invalid: {doc['grading_scale']!r}")
    if doc["grading_scale"] == "percent" and earned != 100:
        fail(lab, f"percent-scale weights sum to {earned}, not 100")

    tlm = doc.get("time_limit_minutes")
    if tlm is not None and not (isinstance(tlm, int) and tlm > 0):
        fail(lab, f"time_limit_minutes must be null or positive int, got {tlm!r}")
    if "mock" in str(meta.get("id", "")).lower() and tlm is None:
        warnings.append(f"{lab}: mock-exam lab without time_limit_minutes (exam mode will have no timer)")


def main():
    global LABS_ROOT
    quiet = "--quiet" in sys.argv
    LABS_ROOT = os.path.normpath(next((a for a in sys.argv[1:] if not a.startswith("-")), REPO_LABS))
    lab_dirs = []
    for root, _dirs, files in os.walk(LABS_ROOT):
        if {"docker-compose.yml", "metadata.json", "check.sh"} <= set(files):
            lab_dirs.append(root)
    lab_dirs.sort()

    n_yaml = 0
    for d in lab_dirs:
        before = len(errors)
        validate(d)
        n_yaml += 1 if os.path.exists(os.path.join(d, "lab.yaml")) else 0
        if quiet and len(errors) == before:
            continue

    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"FAIL  {e}")
    print(f"\n{len(lab_dirs)} labs checked, {n_yaml} with lab.yaml, {len(errors)} errors")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
