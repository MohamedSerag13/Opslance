"""lab-manager unit tests.

The worker talks to the host Docker daemon, which CI/sandboxes don't have —
these cover the pure logic that runs around it. Run from the repo root:
  PYTHONPATH=lab-manager python -m pytest lab-manager/test_worker.py -q
"""
import pytest

pytest.importorskip("docker")  # module imports docker at top level

import worker  # noqa: E402


MOUNTINFO = """36 28 0:33 / / rw,relatime
38 36 0:35 /labs /labs-repo rw,nosuid,nodev,relatime
40 36 0:36 /etc/hosts /etc/hosts rw
"""


def test_resolve_labs_host_path_reads_host_source_from_mountinfo(tmp_path):
    f = tmp_path / "mountinfo"
    f.write_text(MOUNTINFO)
    assert worker._resolve_labs_host_path(str(f)) == "/labs"


def test_resolve_labs_host_path_falls_back_without_mount(tmp_path):
    """No /labs-repo entry in mountinfo → relative fallback, never a wrong
    absolute host path."""
    f = tmp_path / "mountinfo"
    f.write_text("36 28 0:33 / / rw,relatime\n")
    result = worker._resolve_labs_host_path(str(f))
    assert result is None or not str(result).startswith("/")


def test_utcnow_is_naive_utc():
    now = worker._utcnow()
    assert now.tzinfo is None
