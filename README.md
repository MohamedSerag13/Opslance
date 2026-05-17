# DevOps Lab Platform

Welcome to the **DevOps Lab Platform**! This is a state-of-the-art, full-stack application designed to provide interactive, isolated DevOps and Linux lab environments for students. It automates container orchestration, terminal multiplexing, and validation scoring on the fly.

---

## 🏗 Architecture Overview

The platform uses a heavily decoupled microservice architecture orchestrated by Docker Compose:

1. **Frontend (React/Vite)**: A sleek UI where students can view their modules, read lab briefs, and interact with the containerized environment via a fully integrated Web Terminal (`xterm.js`).
2. **Backend (FastAPI/Python)**: The core API that handles user authentication (JWT), Role-Based Access Control (RBAC), session tracking, and real-time WebSocket proxying to active lab containers.
3. **Database Layer**:
   - **PostgreSQL**: The source of truth for users (students/admins), lab metadata, active sessions, and submission scores.
   - **Redis**: The message broker used to power the asynchronous task queue for the lab worker.
4. **Lab Manager (Worker)**: A background Python worker running in its own container with access to the host's Docker socket (`/var/run/docker.sock`). It pops tasks from Redis and dynamically spins up, tears down, and verifies student lab environments.
5. **Nginx**: The reverse proxy that safely routes traffic between the frontend static files and the backend API, preventing CORS issues and unifying the domain.

---

## ✨ Core Features

*   **Dynamic Per-Student Orchestration**: When a student starts a lab, the `lab-manager` worker automatically spins up the lab's `docker-compose.yml` but dynamically enforces unique network isolation and container naming conventions based on the student's ID. This prevents naming collisions and allows multiple students to run the same lab concurrently on the same host.
*   **Web-based PTY Terminal**: Students don't need SSH clients. The backend establishes a low-latency WebSockets connection to the Docker Daemon (`docker exec`), piping the standard I/O directly into the browser.
*   **Automated Verification**: Labs come with an embedded `check.sh` script. When a student clicks "Submit Output", the `lab-manager` executes the script inside their isolated container and automatically grades them based on the exit code.
*   **Role-Based Dashboards**: 
    *   **Students**: View progress, assigned modules, and active labs.
    *   **Admins**: Manage student accounts, organize groups, and monitor active lab sessions.

---

## 📁 Repository Structure

```text
devops-lab-platform/
│
├── frontend/             # React (Vite, TypeScript, TailwindCSS) UI
├── backend/              # FastAPI application (SQLAlchemy, Uvicorn, Docker-py)
├── lab-manager/          # Background worker (Redis pop, Docker Compose execution)
├── nginx/                # Reverse proxy configuration
├── docker-compose.yml    # Main platform orchestration file
└── .env                  # Environment variables (Secrets, DB connection strings)

labs/                     # External directory containing the lab scenarios
├── linux/
│   ├── module-01-linux-fundamentals/
│   │   ├── lab-01-navigation/
│   │   │   ├── docker-compose.yml
│   │   │   ├── Dockerfile
│   │   │   └── check.sh
```

---

## 🔄 The Lab Lifecycle (How it Works)

1. **Initialization**: The student clicks "Start Lab" in the UI.
2. **Session Creation**: The backend verifies the user, creates a `LabSession` record in Postgres (status: `starting`), and pushes a `start_lab` job to Redis.
3. **Provisioning**: The `lab-manager` worker intercepts the job. It locates the lab files on the host, rewrites volume bind mounts to be absolute host paths, removes hardcoded container names, and executes `docker-compose up -d --build`.
4. **Connection**: Once the containers are healthy, the database status updates to `running`. The UI initiates a WebSocket connection to the backend.
5. **Terminal Proxy**: The backend uses the Docker API to spawn `/bin/bash` in the target container, bridging the container's TTY output directly back to the WebSocket.
6. **Validation**: When the student completes the objective, they submit. The worker runs `docker exec bash /check.sh`. A return code of `0` results in a perfect score being committed to the database.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Docker & Docker Compose** installed.
- The `labs/` directory located on your host machine (e.g., adjacent to the platform repo).

### 2. Environment Configuration
Create a `.env` file in the root of the project. Ensure you point `LABS_HOST_PATH` to the absolute path of your labs folder:

```ini
POSTGRES_PASSWORD=supersecurepassword
SECRET_KEY=your_jwt_signing_key
ADMIN_EMAIL=admin@opslance.com
ADMIN_PASSWORD=admin
LABS_HOST_PATH=/Users/yourname/Desktop/Opslance/labs
```

### 3. Launching the Platform
Spin up the entire stack using Docker Compose:

```bash
docker compose up -d --build
```

### 4. Accessing the Platform
- **UI Website**: `http://localhost`
- **Backend API Docs**: `http://localhost/api/docs`

> **Note on Updates**: If you modify the `lab-manager` Python scripts or `backend` routes, you must run `docker compose build --no-cache [service_name]` followed by `docker compose up -d` because the Python code is baked into the image rather than live-mounted.
