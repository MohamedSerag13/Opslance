"""Admin platform settings: typed defaults, JSON persistence, audit trail."""
import json
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

import models


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat()


# key -> (default, validator). Validators raise ValueError on bad input.
SETTING_DEFS: dict[str, tuple[Any, Any]] = {
    "maintenance_mode": (False, lambda v: _bool(v)),
    "announcement": ("", lambda v: _str(v, 0, 280)),
    "support_email": ("", lambda v: _email_opt(v)),
    "default_session_minutes_free": (90, lambda v: _int(v, 15, 480)),
    "default_session_minutes_pro": (150, lambda v: _int(v, 15, 480)),
    "session_extend_minutes": (30, lambda v: _int(v, 5, 120)),
    "max_running_sessions_free": (1, lambda v: _int(v, 1, 10)),
    "max_running_sessions_pro": (3, lambda v: _int(v, 1, 10)),
    "spawn_window_limit": (8, lambda v: _int(v, 1, 100)),
    "hints_allowed": (True, lambda v: _bool(v)),
}

_CACHE: dict[str, Any] | None = None


def _bool(v: Any) -> bool:
    if not isinstance(v, bool):
        raise ValueError("expected a boolean")
    return v


def _str(v: Any, lo: int, hi: int) -> str:
    if not isinstance(v, str):
        raise ValueError("expected a string")
    if not lo <= len(v) <= hi:
        raise ValueError(f"length must be {lo}–{hi} characters")
    return v


def _email_opt(v: Any) -> str:
    v = _str(v, 0, 120)
    if v and ("@" not in v or " " in v):
        raise ValueError("must be a valid email address")
    return v


def _int(v: Any, lo: int, hi: int) -> int:
    if isinstance(v, bool) or not isinstance(v, int):
        raise ValueError("expected an integer")
    if not lo <= v <= hi:
        raise ValueError(f"must be between {lo} and {hi}")
    return v


def invalidate_cache() -> None:
    global _CACHE
    _CACHE = None


def get_all(db: Session) -> dict[str, Any]:
    """Effective settings = defaults overlaid with persisted overrides."""
    global _CACHE
    if _CACHE is not None:
        return dict(_CACHE)
    effective = {k: d for k, (d, _) in SETTING_DEFS.items()}
    for row in db.query(models.PlatformSetting).all():
        if row.key in SETTING_DEFS:
            try:
                effective[row.key] = json.loads(row.value)
            except Exception:
                pass  # corrupt row → fall back to the default
    _CACHE = dict(effective)
    return _CACHE


def get_setting(db: Session, key: str) -> Any:
    if key not in SETTING_DEFS:
        raise KeyError(key)
    return get_all(db)[key]


def set_many(db: Session, updates: dict[str, Any], actor_email: str) -> dict[str, Any]:
    """Validate + persist a partial update. Returns the effective settings after."""
    validated: dict[str, Any] = {}
    for key, value in updates.items():
        if key not in SETTING_DEFS:
            raise KeyError(f"Unknown setting: {key}")
        default, validator = SETTING_DEFS[key]
        validated[key] = validator(value)

    for key, value in validated.items():
        row = db.query(models.PlatformSetting).filter_by(key=key).first()
        if row is None:
            row = models.PlatformSetting(key=key)
            db.add(row)
        row.value = json.dumps(value)
        row.updated_by = actor_email
        row.updated_at = datetime.now(timezone.utc)
    db.commit()
    invalidate_cache()

    # audit each changed key
    for key, value in validated.items():
        write_audit(db, actor_email, "settings.update", key, {"value": value})
    return get_all(db)


def write_audit(db: Session, actor_email: str, action: str, target: Optional[str], detail: Optional[dict]) -> None:
    db.add(models.AdminAuditLog(
        actor_email=actor_email or "system",
        action=action,
        target=str(target) if target is not None else None,
        detail=json.dumps(detail) if detail is not None else None,
    ))
    db.commit()
