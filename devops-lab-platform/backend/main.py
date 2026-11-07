import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import (
    auth, admin_groups, admin_students, admin_labs, admin_environments,
    labs, sessions, progress, websocket, gamification, billing, admin_analytics
)
from security import SecurityHeadersMiddleware

app = FastAPI(title="DevOps Lab Platform API")

# Build stamp: lets any deployment be identified unambiguously via /api/health
try:
    with open(os.path.join(os.path.dirname(__file__), "VERSION")) as _fh:
        BUILD = _fh.read().strip()
except OSError:
    BUILD = "unknown"

# Hardening headers on every API response (CSP for HTML lives in nginx).
app.add_middleware(SecurityHeadersMiddleware)

# CORS: the app is same-origin through nginx, so cross-origin access is only
# needed for external integrations. Set CORS_ORIGINS="https://a.com,https://b.com"
# to allow listed origins with credentials; anything else gets no CORS grant
# (allow_credentials=False — the app authenticates with Bearer headers, not cookies).
_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=bool(_cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(admin_groups.router, prefix="/api/admin/groups", tags=["admin_groups"])
app.include_router(admin_students.router, prefix="/api/admin/students", tags=["admin_students"])
app.include_router(admin_labs.router, prefix="/api/admin/labs", tags=["admin_labs"])
app.include_router(admin_environments.router, prefix="/api/admin/environments", tags=["admin_environments"])
app.include_router(admin_analytics.router, prefix="/api/admin/analytics", tags=["admin_analytics"])
app.include_router(labs.router, prefix="/api/labs", tags=["student_labs"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(progress.router, prefix="/api", tags=["progress"])
app.include_router(gamification.router, prefix="/api/gamification", tags=["gamification"])
app.include_router(websocket.router, prefix="/api/ws", tags=["websocket"])

@app.get("/api/health")
def health_check():
    return {"status": "ok", "build": BUILD}
