"""lab.yaml (schema v2) loader + check.sh output parser.

Question content is read from the labs repo on disk (mounted at /labs-repo in
compose; LABS_HOST_PATH elsewhere) and cached by file mtime. Grading output is
parsed from the SAME check.sh the classic flow runs, so per-question results
are attributable without touching any checker file. See docs/AUTHORING_LABS.md.
"""
import json
import os
import re
import threading

import yaml

CHECK_CALL_RE = re.compile(r'(?:^|\n)\s*(run_check|task)\s+(\d+)\s+"((?:[^"\\]|\\.)*)"')

# check.sh output lines — linux kind (run_check) and CKA kind (task via check_lib.sh)
LINUX_PASS_RE = re.compile(r'✅\s*PASS\s*\[(\d+)%\]:\s*(.*)')
LINUX_FAIL_RE = re.compile(r'❌\s*FAIL\s*\[(\d+)%\]:\s*(.*)')
CKA_PASS_RE = re.compile(r'PASS\s*\[\+(\d+)\s*pts\]\s*(.*)')
CKA_FAIL_RE = re.compile(r'FAIL\s*\[\s*(\d+)\s*\]\s*(.*)')

_cache: dict = {}
_lock = threading.Lock()


def labs_root() -> str:
    if os.path.exists("/labs-repo"):
        return "/labs-repo"
    root = os.environ.get("LABS_HOST_PATH") or "./labs"
    if not os.path.exists(root):
        for path in ("./labs", "../labs", "../../labs", "./labs-repo", "../labs-repo"):
            if os.path.exists(path):
                return path
    return root


def _scan_lab_dirs() -> dict:
    """lab_id -> directory (a lab dir has metadata.json + check.sh + compose)."""
    root = labs_root()
    found = {}
    for dirpath, _dirs, files in os.walk(root):
        if {"metadata.json", "check.sh"} <= set(files):
            try:
                with open(os.path.join(dirpath, "metadata.json"), encoding="utf-8") as f:
                    lab_id = json.load(f).get("id")
            except Exception:
                continue
            if lab_id:
                found[lab_id] = dirpath
    return found


def find_lab_dir(lab_id: str):
    with _lock:
        cached = _cache.get("lab_dirs")
    if cached is None:
        cached = _scan_lab_dirs()
        with _lock:
            _cache["lab_dirs"] = cached
    if lab_id in cached:
        return cached[lab_id]
    # unknown id: rescan once (new lab dropped into the repo without restart)
    with _lock:
        _cache["lab_dirs"] = None
    return _scan_lab_dirs().get(lab_id)


def load_lab_doc(lab_id: str):
    """Parsed lab.yaml for a lab id, cached by path+mtime. None if absent/invalid."""
    lab_dir = find_lab_dir(lab_id)
    if not lab_dir:
        return None
    path = os.path.join(lab_dir, "lab.yaml")
    if not os.path.exists(path):
        return None
    try:
        mtime = os.path.getmtime(path)
    except OSError:
        return None
    with _lock:
        entry = _cache.get(path)
    if entry and entry[0] == mtime:
        return entry[1]
    try:
        with open(path, encoding="utf-8") as f:
            doc = yaml.safe_load(f)
        if not isinstance(doc, dict) or doc.get("schema_version") != 2:
            doc = None
    except Exception:
        doc = None
    with _lock:
        _cache[path] = (mtime, doc)
    return doc


def get_questions(lab_id: str):
    """(lab_meta dict, [question dicts]) or None. Question dicts are the lab.yaml
    question mappings (id/order/domain/weight/prompt/context/hints/solution/
    explanation/check/time_target_minutes)."""
    doc = load_lab_doc(lab_id)
    if not doc:
        return None
    questions = doc.get("questions") or []
    lab_meta = {
        "lab": doc.get("lab"),
        "title": doc.get("title"),
        "category": doc.get("category"),
        "domain": doc.get("domain"),
        "pass_mark": int(doc.get("pass_mark") or 70),
        "grading_scale": doc.get("grading_scale") or "points",
        "total": int(doc.get("total") or sum(int(q.get("weight") or 0) for q in questions)),
        "time_limit_minutes": doc.get("time_limit_minutes"),
    }
    return lab_meta, questions


def parse_check_output(output: str):
    """Extract the per-check result lines, in order:
    [{index, passed, weight, description}]."""
    results = []
    for line in output.splitlines():
        for regex, passed in ((LINUX_PASS_RE, True), (LINUX_FAIL_RE, False),
                              (CKA_PASS_RE, True), (CKA_FAIL_RE, False)):
            m = regex.search(line)
            if m:
                results.append({
                    "index": len(results) + 1,
                    "passed": passed,
                    "weight": int(m.group(1)),
                    "description": (m.group(2) or "").strip(),
                })
                break
    return results


def map_output_to_questions(output: str, questions):
    """Align parsed check lines to questions by order.
    Returns (results, mapped): results is a list aligned 1:1 with `questions`
    (None at positions that could not be attributed); mapped is False when the
    checker emitted a different number of result lines than there are questions
    — in that case nothing is attributed and the raw output is shown instead."""
    lines = parse_check_output(output)
    mapped = len(lines) == len(questions)
    results = [lines[q["order"] - 1] if mapped and 0 < q.get("order", 0) <= len(lines) else None
               for q in questions]
    return results, mapped
