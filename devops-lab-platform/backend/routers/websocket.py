from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import docker
import asyncio
from auth import decode_token
from database import SessionLocal
import models

router = APIRouter()

try:
    client = docker.from_env()
except:
    client = None

def flush_activity(session_id: str, timestamp: float):
    from database import SessionLocal
    from datetime import datetime
    import models
    import uuid
    db = SessionLocal()
    try:
        valid_uuid = uuid.UUID(session_id)
        sess = db.query(models.LabSession).filter_by(id=valid_uuid).first()
        if sess:
            sess.last_activity_at = datetime.fromtimestamp(timestamp)
            db.commit()
    except Exception as e:
        print(f"Error flushing activity to Postgres: {e}")
        db.rollback()
    finally:
        db.close()

@router.websocket("/terminal/{session_id}")
async def websocket_terminal(websocket: WebSocket, session_id: str, token: str):
    await websocket.accept()
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=1008)
        return
    
    if not client:
        await websocket.send_text("Docker client not available on server.\r\n")
        await websocket.close()
        return

    db = SessionLocal()
    try:
        import uuid
        valid_id = uuid.UUID(session_id)
    except ValueError:
        await websocket.send_text("Invalid session ID format.\r\n")
        await websocket.close()
        db.close()
        return

    session = db.query(models.LabSession).filter_by(id=valid_id).first()
    if not session or not session.container_name:
        await websocket.send_text("Session not found or container not assigned yet.\r\n")
        await websocket.close()
        db.close()
        return
        
    container_name = session.container_name
    db.close()
    
    try:
        exec_id = client.api.exec_create(container_name, cmd=["/bin/bash"], stdin=True, tty=True)
        sock = client.api.exec_start(exec_id["Id"], detach=False, tty=True, stream=True, socket=True)
        
        loop = asyncio.get_running_loop()
        
        def blocking_read():
            try:
                return sock._sock.recv(4096)
            except AttributeError:
                return sock.recv(4096)
            
        def blocking_write(d):
            try:
                sock._sock.sendall(d)
            except AttributeError:
                sock.send(d)

        async def read_from_docker():
            while True:
                try:
                    data = await loop.run_in_executor(None, blocking_read)
                    if not data:
                        break
                    await websocket.send_text(data.decode('utf-8', errors='replace'))
                except Exception as e:
                    print(f"Read error: {e}")
                    break

        async def write_to_docker():
            import time
            import redis
            import os
            redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"))
            last_flush_time = time.time()
            
            while True:
                try:
                    data = await websocket.receive_text()
                    await loop.run_in_executor(None, blocking_write, data.encode('utf-8'))
                    
                    curr_time = time.time()
                    redis_client.set(f"session_activity:{session_id}", curr_time)
                    
                    if curr_time - last_flush_time >= 60:
                        loop.run_in_executor(None, flush_activity, session_id, curr_time)
                        last_flush_time = curr_time
                except WebSocketDisconnect:
                    curr_time = time.time()
                    redis_client.set(f"session_activity:{session_id}", curr_time)
                    loop.run_in_executor(None, flush_activity, session_id, curr_time)
                    break
                except Exception as e:
                    print(f"Write error: {e}")
                    break
                    
        await asyncio.gather(read_from_docker(), write_to_docker())
    except Exception as e:
        print(f"Terminal error: {e}")

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
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

event_manager = EventManager()

@router.websocket("/events")
async def websocket_events(websocket: WebSocket, token: str):
    await event_manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(10)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        event_manager.disconnect(websocket)
