from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import (
    auth, admin_groups, admin_students, admin_labs, admin_environments,
    labs, sessions, progress, websocket
)

app = FastAPI(title="DevOps Lab Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin_groups.router, prefix="/api/admin/groups", tags=["admin_groups"])
app.include_router(admin_students.router, prefix="/api/admin/students", tags=["admin_students"])
app.include_router(admin_labs.router, prefix="/api/admin/labs", tags=["admin_labs"])
app.include_router(admin_environments.router, prefix="/api/admin/environments", tags=["admin_environments"])
app.include_router(labs.router, prefix="/api/labs", tags=["student_labs"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(progress.router, prefix="/api", tags=["progress"])
app.include_router(websocket.router, prefix="/api/ws", tags=["websocket"])

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
