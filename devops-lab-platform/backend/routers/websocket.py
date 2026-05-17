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
    session = db.query(models.LabSession).filter_by(id=session_id).first()
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
        
        # We use run_in_executor because docker-py socket might not be a pure _socket.socket
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
            while True:
                try:
                    data = await websocket.receive_text()
                    await loop.run_in_executor(None, blocking_write, data.encode('utf-8'))
                except WebSocketDisconnect:
                    break
                except Exception as e:
                    print(f"Write error: {e}")
                    break
                    
        await asyncio.gather(read_from_docker(), write_to_docker())
    except Exception as e:
        print(f"Terminal error: {e}")

@router.websocket("/events")
async def websocket_events(websocket: WebSocket, token: str):
    await websocket.accept()
    try:
        while True:
            await asyncio.sleep(10)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
