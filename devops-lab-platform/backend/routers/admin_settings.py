"""Admin settings API + public surface (announcement / support email)."""
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, StrictBool, StrictInt, StrictStr
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin
import models
import settings_service

router = APIRouter()
public_router = APIRouter()


class SettingsUpdate(BaseModel):
    """Partial update — only supplied keys are applied. Strict types keep
    pydantic from coercing "yes"/"1"/0.0 into booleans and integers."""
    maintenance_mode: Optional[StrictBool] = None
    announcement: Optional[StrictStr] = None
    support_email: Optional[StrictStr] = None
    default_session_minutes_free: Optional[StrictInt] = None
    default_session_minutes_pro: Optional[StrictInt] = None
    session_extend_minutes: Optional[StrictInt] = None
    max_running_sessions_free: Optional[StrictInt] = None
    max_running_sessions_pro: Optional[StrictInt] = None
    spawn_window_limit: Optional[StrictInt] = None
    hints_allowed: Optional[StrictBool] = None


def _settings_meta(db: Session) -> dict[str, dict]:
    """Per-key metadata (who changed it last, when) for the settings UI."""
    rows = {r.key: r for r in db.query(models.PlatformSetting).all()}
    return {
        key: {
            "updated_by": rows[key].updated_by if key in rows else None,
            "updated_at": rows[key].updated_at.isoformat() if key in rows and rows[key].updated_at else None,
        }
        for key in settings_service.SETTING_DEFS
    }


@router.get("")
def get_settings(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return {
        "settings": settings_service.get_all(db),
        "meta": _settings_meta(db),
    }


@router.put("")
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(422, "No settings supplied")
    try:
        effective = settings_service.set_many(db, updates, admin.get("email", "admin"))
    except KeyError as e:
        raise HTTPException(422, str(e))
    except ValueError as e:
        raise HTTPException(422, f"Invalid value: {e}")
    return {"settings": effective, "meta": _settings_meta(db)}


@router.get("/audit")
def get_audit(limit: int = 50, db: Session = Depends(get_db), admin=Depends(require_admin)):
    limit = max(1, min(200, limit))
    rows = db.query(models.AdminAuditLog).order_by(
        models.AdminAuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": str(r.id),
            "actor_email": r.actor_email,
            "action": r.action,
            "target": r.target,
            "detail": json.loads(r.detail) if r.detail else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@public_router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    """Unauthenticated surface: only fields safe to show pre-login."""
    s = settings_service.get_all(db)
    return {
        "announcement": s["announcement"],
        "support_email": s["support_email"],
        "maintenance_mode": s["maintenance_mode"],
        "hints_allowed": s["hints_allowed"],
    }
