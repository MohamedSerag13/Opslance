"""Internal exec/PTY API for the backend.

The backend no longer holds the Docker socket: verification commands and the
interactive terminal are proxied here. This API binds only inside the compose
network (never published to the host) and requires the shared LAB_API_TOKEN,
which the entrypoint fills from the auto-generated SECRET_KEY.
"""
import asyncio
import json
import os
import docker
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect

LAB_API_TOKEN = os.getenv("LAB_API_TOKEN") or os.getenv("SECRET_KEY") or ""

app = FastAPI(title="Lab Manager Internal API")

try:
    docker_client = docker.from_env()
except Exception:  # no docker daemon in the current environment
    docker_client = None


def _authorized(token: str) -> bool:
    return bool(LAB_API_TOKEN) and token == LAB_API_TOKEN


@app.get("/internal/health")
def internal_health():
    return {"status": "ok", "service": "lab-manager-internal"}


@app.post("/internal/exec")
def internal_exec(body: dict, token: str = ""):
    if not _authorized(token or ""):
        raise HTTPException(status_code=403, detail="Forbidden")
    container_name = body.get("container") or ""
    cmd = body.get("cmd") or ""
    if not container_name or not cmd:
        raise HTTPException(status_code=400, detail="container and cmd are required")

    if docker_client is None:
        raise HTTPException(status_code=503, detail="Docker is not available")
    try:
        container = docker_client.containers.get(container_name)
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")

    exit_code, raw_output = container.exec_run(cmd, demux=False)
    output = raw_output.decode("utf-8", errors="replace") if raw_output else ""
    return {"exit_code": exit_code, "output": output}


@app.websocket("/internal/pty")
async def internal_pty(websocket: WebSocket, container: str = "", token: str = ""):
    if not _authorized(token):
        await websocket.accept()
        await websocket.close(code=1008)
        return
    await websocket.accept()

    try:
        exec_id = docker_client.api.exec_create(
            container, cmd=["/bin/bash"], stdin=True, tty=True)
        sock = docker_client.api.exec_start(
            exec_id["Id"], detach=False, tty=True, stream=True, socket=True)

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

        async def sock_to_ws():
            while True:
                data = await loop.run_in_executor(None, blocking_read)
                if not data:
                    break
                await websocket.send_text(data.decode("utf-8", errors="replace"))

        async def ws_to_sock():
            while True:
                data = await websocket.receive_text()
                await loop.run_in_executor(None, blocking_write, data.encode("utf-8"))

        done, pending = await asyncio.wait(
            [asyncio.create_task(sock_to_ws()),
             asyncio.create_task(ws_to_sock())],
            return_when=asyncio.FIRST_EXCEPTION,
        )
        for task in pending:
            task.cancel()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
