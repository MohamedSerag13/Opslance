"""WebSocket endpoints: terminal PTY + event broadcasts.

Auth model (fixes JWT-in-query-param leakage): clients first call
POST /api/ws/ticket (authenticated, normal Bearer header) and receive a
one-time ticket valid for 30 seconds. The WebSocket endpoints accept only that
ticket — it is redeemed atomically (get + delete in Redis) on connect, so a
ticket intercepted from a URL is useless afterwards and never contains the
long-lived JWT.

The terminal PTY itself is proxied to the lab-manager internal API — the
backend has no Docker socket and cannot exec in containers directly.
"""
import asyncio
import json
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session as DBSession

import models
from auth import utcnow
from database import SessionLocal, get_db
from dependencies import get_current_user, redis_client
from logging_setup import get_logger
from schemas import WsTicketData

logger = get_logger("websocket")

router = APIRouter()

TICKET_TTL_SECONDS = 30
TICKET_PREFIX = "ws_ticket:"

LAB_MANAGER_URL = os.getenv("LAB_MANAGER_URL", "").rstrip("/")
LAB_API_TOKEN = os.getenv("LAB_API_TOKEN", "")


def _validate_session_id(session_id: str):
    try:
        return uuid.UUID(session_id)
    except (ValueError, AttributeError):
        return None


def flush_activity(session_id: str, timestamp: float):
    db = SessionLocal()
    try:
        valid_uuid = _validate_session_id(session_id)
        if not valid_uuid:
            return
        sess = db.query(models.LabSession).filter_by(id=valid_uuid).first()
        if sess:
            sess.last_activity_at = datetime.fromtimestamp(timestamp)
            db.commit()
    except Exception as e:
        logger.error("activity_flush_failed", error=str(e), session_id=session_id)
        db.rollback()
    finally:
        db.close()


def _issue_ticket(user, scope: str, session_id: str | None = None) -> str:
    ticket = uuid.uuid4().hex
    payload = {"sub": str(user.id), "role": user.get("role") if isinstance(user, dict) else "student",
               "scope": scope}
    if session_id:
        payload["session_id"] = session_id
    redis_client.setex(f"{TICKET_PREFIX}{ticket}", TICKET_TTL_SECONDS, json.dumps(payload))
    return ticket


@router.post("/ticket")
def issue_ws_ticket(data: WsTicketData, current_user=Depends(get_current_user)):
    """Exchange a valid Bearer token for a short-lived one-time WS ticket.

    scope="terminal" additionally pins the ticket to one session id, so it can
    only be used for that session's terminal."""
    session_id = data.session_id if data.scope == "terminal" else None
    if data.scope == "terminal" and not _validate_session_id(session_id or ""):
        raise HTTPException(400, "session_id required for terminal tickets")
    return {"ticket": _issue_ticket(current_user, data.scope, session_id)}


def _redeem_ticket(ticket: str, scope: str, session_id: str | None = None):
    """Atomically redeem a one-time ticket. Returns the ticket payload or None.

    Scope and session-pin are validated BEFORE the delete, so a presentation
    with the wrong scope/session never burns the ticket for its legitimate
    user; the delete result decides the single-use race (only one connection
    can win)."""
    if not ticket:
        return None
    key = f"{TICKET_PREFIX}{ticket}"
    raw = redis_client.get(key)
    if not raw:
        return None
    try:
        payload = json.loads(raw)
    except Exception:
        redis_client.delete(key)
        return None
    if payload.get("scope") != scope:
        return None
    if scope == "terminal" and session_id and payload.get("session_id") != session_id:
        return None
    if not redis_client.delete(key):
        return None  # another connection redeemed it first
    return payload


@router.websocket("/terminal/{session_id}")
async def websocket_terminal(websocket: WebSocket, session_id: str, ticket: str = ""):
    payload = _redeem_ticket(ticket, "terminal", session_id)
    if not payload:
        # reject before accepting so the client sees a failed handshake
        await websocket.close(code=1008)
        return
    await websocket.accept()

    valid_id = _validate_session_id(session_id)
    if not valid_id:
        await websocket.send_text("Invalid session ID format.\r\n")
        await websocket.close()
        return

    db = SessionLocal()
    try:
        session = db.query(models.LabSession).filter_by(
            id=valid_id, student_id=payload.get("sub")).first()
    finally:
        db.close()
    if not session or not session.container_name:
        await websocket.send_text("Session not found or container not assigned yet.\r\n")
        await websocket.close()
        return

    container_name = session.container_name

    loop = asyncio.get_running_loop()

    if not LAB_MANAGER_URL:
        await websocket.send_text("Terminal service is not configured on this server.\r\n")
        await websocket.close()
        return

    try:
        import websockets
    except ImportError:
        logger.error("terminal_proxy_websockets_missing", session_id=session_id)
        await websocket.send_text("Terminal proxy is misconfigured on this server.\r\n")
        await websocket.close()
        return

    lm_url = (f"{LAB_MANAGER_URL.replace('http', 'ws', 1)}"
              f"/internal/pty?container={container_name}&token={LAB_API_TOKEN}")

    # Human-readable reason for a failed proxy session, written into the
    # student's terminal before the socket closes (None = clean exit, e.g.
    # the student typed `exit` or closed the page).
    failure: str | None = None
    client_gone = False
    lm_close_code = None
    try:
        async with websockets.connect(lm_url, open_timeout=10, max_size=None) as lm_ws:
            last_flush = 0.0

            async def client_to_lab():
                nonlocal last_flush
                while True:
                    data = await websocket.receive_text()
                    await lm_ws.send(data)
                    now = utcnow().timestamp()
                    redis_client.set(f"session_activity:{session_id}", now)
                    if now - last_flush >= 60:
                        loop.run_in_executor(None, flush_activity, session_id, now)
                        last_flush = now

            async def lab_to_client():
                async for data in lm_ws:
                    await websocket.send_text(data if isinstance(data, str) else data.decode("utf-8", errors="replace"))

            # FIRST_COMPLETED: when the lab-manager side ends (shell exited,
            # container gone, auth rejected) the proxy must close promptly —
            # FIRST_EXCEPTION hung because a normal close raises nothing.
            done, pending = await asyncio.wait(
                [asyncio.create_task(client_to_lab()),
                 asyncio.create_task(lab_to_client())],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
            for task in done:
                if task.cancelled():
                    continue
                if isinstance(task.exception(), WebSocketDisconnect):
                    client_gone = True
        lm_close_code = getattr(lm_ws, "close_code", None)
    except asyncio.TimeoutError:
        failure = "Terminal backend did not respond in time — please retry in a moment."
        logger.error("terminal_proxy_timeout", session_id=session_id)
    except OSError as e:
        failure = "Terminal backend is unreachable — please retry in a moment."
        logger.error("terminal_proxy_unreachable", error=str(e), session_id=session_id)
    except Exception as e:
        failure = "The terminal could not be started — please retry in a moment."
        logger.error("terminal_proxy_error", error=str(e), session_id=session_id)

    if not client_gone:
        if failure is None and lm_close_code == 1008:
            failure = ("Terminal service authorization failed — please contact "
                       "an administrator (token mismatch between backend and lab-manager).")
            logger.error("terminal_proxy_auth_rejected", session_id=session_id)
        elif failure is None and lm_close_code not in (None, 1000):
            failure = "The terminal connection was lost — please reopen this lab."
            logger.warning("terminal_proxy_lost", close_code=lm_close_code, session_id=session_id)
        if failure:
            try:
                await websocket.send_text(f"\r\n{failure}\r\n")
            except Exception:
                pass

    # flush activity on disconnect so idle cleanup sees fresh data
    now = utcnow().timestamp()
    redis_client.set(f"session_activity:{session_id}", now)
    loop.run_in_executor(None, flush_activity, session_id, now)


class EventManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # gather: slow clients can't serialize everyone else's fan-out
        results = await asyncio.gather(
            *(c.send_json(message) for c in list(self.active_connections)),
            return_exceptions=True,
        )
        for conn, res in zip(list(self.active_connections), results):
            if isinstance(res, Exception):
                self.disconnect(conn)


event_manager = EventManager()

@router.websocket("/events")
async def websocket_events(websocket: WebSocket, ticket: str = ""):
    if not _redeem_ticket(ticket, "events"):
        # reject before accepting so the client sees a failed handshake
        await websocket.close(code=1008)
        return
    await event_manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(10)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        event_manager.disconnect(websocket)
