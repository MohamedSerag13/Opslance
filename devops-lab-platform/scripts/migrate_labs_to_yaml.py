#!/usr/bin/env python3
"""One-shot adapter: metadata.json + check.sh  ->  lab.yaml (schema v2) per lab.

Adapter, not replacement (see docs/AUTHORING_LABS.md):
- each acceptance criterion becomes one question, in check.sh order;
- weight + exact checker description are parsed FROM check.sh (run_check/task
  lines) so grading stays byte-identical — no checker file is touched;
- prompt comes from the human acceptance-criterion description;
- per-question solution/explanation/context are left null for hand authoring;
- hints: the lab's first 3 hints, shared by every question;
- pass_mark parsed from the checker itself (linux "-ge 70", CKA "finish 66");
- exam timer only for mock-exam labs (time_limit_minutes = estimated_minutes).

Idempotent: overwrites the lab.yaml it previously generated.
"""
import datetime

import json
import os
import re
import sys

import yaml

REPO_LABS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "labs")
CHECK_CALL_RE = re.compile(r'(?:^|\n)\s*(run_check|task)\s+(\d+)\s+"((?:[^"\\]|\\.)*)"')
LINUX_PASS_RE = re.compile(r'-ge\s+(\d+)')
CKA_PASS_RE = re.compile(r'finish\s+(\d+)')


class _Dumper(yaml.SafeDumper):
    def ignore_aliases(self, data):
        return True


def find_calls(check_src: str):
    out = []
    for m in CHECK_CALL_RE.finditer(check_src):
        out.append({"kind": m.group(1), "weight": int(m.group(2)), "description": m.group(3)})
    return out


def parse_pass_mark(check_src: str, category: str) -> int:
    m = LINUX_PASS_RE.search(check_src) or CKA_PASS_RE.search(check_src)
    return int(m.group(1)) if m else (70 if category == "linux" else 66)


def migrate_lab(lab_dir: str) -> dict:
    meta = json.load(open(os.path.join(lab_dir, "metadata.json"), encoding="utf-8"))
    check_path = os.path.join(lab_dir, "check.sh")
    check_src = open(check_path, encoding="utf-8").read()

    calls = find_calls(check_src)
    ac = meta.get("acceptance_criteria") or []
    if not calls:
        return {"status": "skip", "reason": "no run_check/task calls found in check.sh"}
    if len(calls) != len(ac):
        return {"status": "error",
                "reason": f"check.sh has {len(calls)} calls but acceptance_criteria has {len(ac)}"}

    hints = [
        {"title": h.get("title"), "content": h.get("content")}
        for h in (meta.get("hints") or [])[:3]
    ]
    category = meta.get("category", "")
    est = int(meta.get("estimated_minutes") or 15)
    n = len(calls)
    is_mock = "mock" in str(meta.get("id", "")).lower()
    domain = meta.get("subcategory") or category if category == "linux" else (meta.get("module_title") or category)

    questions = []
    for i, (call, crit) in enumerate(zip(calls, ac), start=1):
        crit_desc = crit.get("description") if isinstance(crit, dict) else (crit or None)
        questions.append({
            "id": (crit.get("id") if isinstance(crit, dict) else None) or f"q{i:02d}",
            "order": i,
            "domain": domain,
            "weight": call["weight"],
            "prompt": crit_desc or call["description"],
            "context": None,
            "hints": hints,
            "solution": None,
            "explanation": None,
            "check": {"script": "/check.sh", "index": i, "kind": call["kind"],
                      "description": call["description"]},
            "time_target_minutes": max(1, round(est / n)),
        })

    doc = {
        "schema_version": 2,
        "lab": meta["id"],
        "title": meta.get("title"),
        "category": category,
        "domain": domain,
        "pass_mark": parse_pass_mark(check_src, category),
        "grading_scale": "percent" if calls[0]["kind"] == "run_check" else "points",
        "total": sum(q["weight"] for q in questions),
        "time_limit_minutes": est if is_mock else None,
        "generated": {
            "from": "metadata.json + check.sh",
            "at": datetime.date.today().isoformat(),
        },
        "questions": questions,
    }

    out_path = os.path.join(lab_dir, "lab.yaml")
    with open(out_path, "w", encoding="utf-8") as f:
        yaml.dump(doc, f, Dumper=_Dumper, allow_unicode=True, sort_keys=False, width=100)

    return {"status": "ok", "questions": n, "total": doc["total"], "path": out_path}


def main():
    labs_root = os.path.normpath(sys.argv[1] if len(sys.argv) > 1 else REPO_LABS)
    lab_dirs = []
    for root, _dirs, files in os.walk(labs_root):
        if {"docker-compose.yml", "metadata.json", "check.sh"} <= set(files):
            lab_dirs.append(root)
    lab_dirs.sort()

    ok = errors = skips = 0
    for d in lab_dirs:
        res = migrate_lab(d)
        if res["status"] == "ok":
            ok += 1
            print(f"  ok   {os.path.relpath(d, labs_root)}  ({res['questions']} questions, total {res['total']})")
        elif res["status"] == "skip":
            skips += 1
            print(f"  SKIP {os.path.relpath(d, labs_root)}: {res['reason']}")
        else:
            errors += 1
            print(f"  ERR  {os.path.relpath(d, labs_root)}: {res['reason']}")

    print(f"\nMigrated {ok} labs ({errors} errors, {skips} skipped) -> lab.yaml")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
