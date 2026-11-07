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

## 📚 Lab Catalog (72 labs — 64 Linux · 8 CKA Kubernetes)

Every lab ships as a self-contained directory under `labs/linux/<module>/<lab>/` with a
`metadata.json` (scenario, hints, acceptance criteria), a `Dockerfile` (the broken state), a
`docker-compose.yml`, a `check.sh` grader (70% to pass), a student `README.md` and a full `SOLUTION.md`.
New labs appear automatically: the backend's `sync_labs.py` walks `labs/` and upserts everything into Postgres.

### CKA Kubernetes track — Modules 21–28 (8 labs · 132 tasks)

One lab per week of the 8-week CKA plan, each running a **real single-node k3s cluster** per session
(`rancher/k3s`, privileged containers — keep Docker Desktop at 4 GB+ memory / 2 CPUs) with a
workstation shell where `kubectl` is preconfigured. Grading uses the **CKA pass mark of 66%**;
checks verify live cluster state and traffic (curl/wget/exec), not object lists.

| Module | Lab | Tasks | Points | Focus |
|---|---|---|---|---|
| 21 | Week 1 Speed Drill | 40 | 400 | exam-shell setup, pods, deployments, services — kubectl speed |
| 22 | Week 2 Challenge | 12 | 120 | rollouts, config injection, Jobs, nodeSelector, taints/tolerations, HPA |
| 23 | Week 3 Challenge | 12 | 120 | drain, etcd snapshot + restore (exam-style helper pod), logs/top/events |
| 24 | Week 4 Challenge | 12 | 120 | RBAC proven with `auth can-i --as`, CSR pipeline, kubeconfig, securityContext, PSA |
| 25 | Week 5 Challenge | 12 | 120 | all Service types, DNS, Ingress + TLS via real traffic, NetworkPolicy, Gateway API |
| 26 | Week 6 Challenge | 12 | 120 | PV/PVC, dynamic provisioning, Helm lifecycle, Kustomize overlay, CRDs |
| 27 | Week 7 Challenge | 14 | 140 | 14 deliberately broken scenarios fixed and verified by live behavior |
| 28 | Week 8 Mock Exam | 18 | 180 | timed 2-hour mock exam across all domains |

Notes: CKA labs are **Pro-tier** (modules 21+ are blocked for free-tier students by the platform's
tier gate). Each lab's dashboard README carries the task table and time-boxing rules; every
`SOLUTION.md` mirrors your weekly plan's gates (etcd backup under 10 minutes, fixes under 8 minutes,
etc.). First start of a CKA session pulls the k3s image and boots the cluster — allow 1–3 minutes;
the terminal tells you when the API is ready.

### Module 01 — Linux Fundamentals

- **Lost in the Filesystem** — pwd, ls, cd, absolute paths, relative paths · ⭐ beginner · 15 min · 100 pts
- **Command Not Found** — bashrc, alias, environment variables · ⭐ beginner · 15 min · 100 pts
- **What is My System?** — whoami, hostname, pwd, echo, file redirection · ⭐ beginner · 15 min · 100 pts
- **Copy, Move, Remove** — cp, mv, rm, mkdir, ls · ⭐ beginner · 15 min · 100 pts
- **Wildcards and Globbing** — wildcards, globbing, mv, rm, mkdir · ⭐ beginner · 15 min · 100 pts
- **Finding Things** — find, which, grep, file search · ⭐ beginner · 15 min · 100 pts
- **Links Hard and Soft** — ln, symlinks, hard links, inodes · ⭐ beginner · 15 min · 100 pts
- **Disk Space Detective** — df, du, disk usage, sorting · ⭐ beginner · 15 min · 100 pts

### Module 02 — File Navigation & Search

- **Finding Files Across the Linux Filesystem** — find, find -name, find -size, which, output redirection · ⭐ beginner · 15 min · 100 pts
- **Hunting Errors in Application Logs** — grep, grep -i, grep -c, grep -r, grep -n · ⭐ beginner · 15 min · 100 pts
- **Monitoring a Live Service Log** — head, head -n, tail, tail -f, tail -N · ⭐ beginner · 15 min · 100 pts
- **The Config Hunt (Capstone)** — find, find -name, grep, grep -r, grep -c · ⭐ beginner · 20 min · 100 pts

### Module 03 — File Permissions & Ownership

- **Permission Denied** — ls -l, chmod, file permissions, rwx notation · ⭐ beginner · 15 min · 100 pts
- **CI/CD Pipeline Failed** — ls -l, chmod, executable permissions, bash scripts · ⭐ beginner · 15 min · 100 pts
- **Application Cannot Write Logs** — ls -l, chown, file ownership, sudo · ⭐⭐ intermediate · 15 min · 100 pts
- **Production Troubleshooting Challenge** — ls -l, chmod, chown, sudo, whoami · ⭐⭐⭐ advanced · 25 min · 200 pts

### Module 04 — Processes & Services

- **Rogue Process Hunt** — ps, ps aux, grep, pgrep, kill · ⭐ beginner · 15 min · 100 pts
- **High CPU Investigation** — top, htop, ps aux, kill, pgrep · ⭐ beginner · 15 min · 100 pts
- **Recover a Crashed Service** — systemctl, systemctl status, systemctl start, systemctl enable, curl · ⭐ beginner · 15 min · 100 pts
- **Debug a Failed Systemd Service** — systemctl, journalctl, systemctl status, service debugging, ExecStart · ⭐⭐ intermediate · 25 min · 150 pts

### Module 05 — Network & Connectivity Troubleshooting

- **Service Unreachable — Nothing on Port 8080** — curl, ss -tulnp, port listening, connection refused, python3 http.server · ⭐ beginner · 15 min · 100 pts
- **App on the Wrong Port** — curl, ss -tulnp, port discovery, connection refused, port binding · ⭐ beginner · 15 min · 100 pts
- **Broken DNS Resolution** — dig, ping, resolv.conf, DNS troubleshooting, nameserver · ⭐⭐ intermediate · 20 min · 125 pts
- **Firewall Blocking Remote Access** — ufw, firewall troubleshooting, ss -tulnp, curl, remote access · ⭐⭐ intermediate · 25 min · 150 pts

### Module 06 — Users, Groups & Sudo

- **Who Am I? Account Triage** — whoami, id, groups, /etc/passwd, usermod · ⭐ beginner · 15 min · 100 pts
- **Onboard a New Developer** — useradd, usermod, groupadd, chpasswd, /etc/passwd · ⭐ beginner · 20 min · 100 pts
- **Shared Folder Access** — groupadd, usermod, chgrp, chmod, setgid bit · ⭐⭐ intermediate · 20 min · 125 pts
- **The Missing Sudo Grant** — sudo, usermod, groups, sudo -l, privilege audit · ⭐ beginner · 15 min · 100 pts

### Module 07 — Text Processing & Pipelines

- **Traffic Report from Raw Logs** — grep, wc, sort, uniq, awk · ⭐ beginner · 15 min · 100 pts
- **Config Surgery with sed** — sed, sed -i, backup copies, cp, grep · ⭐ beginner · 15 min · 100 pts
- **Sales Totals with awk** — awk, awk -F, NR, sum columns, printf · ⭐⭐ intermediate · 20 min · 125 pts
- **Message-of-the-Day Rescue** — nano, vim basics, tee -a, sed, tail · ⭐ beginner · 10 min · 100 pts

### Module 08 — Shell Scripting Basics

- **Your First Script** — shebang, chmod +x, echo, executing scripts · ⭐ beginner · 10 min · 100 pts
- **Scripts That Take Arguments** — $1, positional parameters, exit codes, if statements, usage messages · ⭐ beginner · 15 min · 100 pts
- **Debug the Backup Script** — bash -n, debugging, tar in scripts, conditionals, quoting · ⭐⭐ intermediate · 20 min · 125 pts
- **Clean Up with a Loop** — for loops, globbing in scripts, mv, mkdir, file glob patterns · ⭐⭐ intermediate · 20 min · 125 pts

### Module 09 — Package Management

- **Install the Missing Tool** — apt update, apt install, command -v, package verification · ⭐ beginner · 15 min · 100 pts
- **Remove the Rogue Package** — apt remove, apt purge, dpkg -s, dpkg -l, autoremove · ⭐ beginner · 15 min · 100 pts
- **Package Forensics** — dpkg -S, dpkg -l, dpkg -s, apt-cache policy, package queries · ⭐⭐ intermediate · 20 min · 125 pts
- **The Empty Package Index** — apt update, /var/lib/apt/lists, apt-cache policy, report writing · ⭐ beginner · 15 min · 100 pts

### Module 10 — Archiving & Compression

- **Tar Up the Logs** — tar czf, tar -t, gzip, archive verification · ⭐ beginner · 15 min · 100 pts
- **Deploy from a Tarball** — tar xzf, tar -C, mkdir -p, content verification · ⭐ beginner · 15 min · 100 pts
- **Zip the Webroot** — zip -r, unzip -l, exclude patterns, archive verification · ⭐⭐ intermediate · 20 min · 125 pts
- **The Date-Stamped Backup** — date +%F, command substitution $(), tar czf, mkdir -p · ⭐⭐ intermediate · 20 min · 125 pts

### Module 11 — Storage & Disk Usage

- **What's Eating the Disk?** — du, du -ah, sort -rh, find -size, rm · ⭐ beginner · 15 min · 100 pts
- **Read the Filesystem Report** — df -h, df -i, awk column extraction, report writing · ⭐ beginner · 15 min · 100 pts
- **Repair the Broken fstab** — /etc/fstab, filesystem table fields, awk field checks, sed · ⭐⭐ intermediate · 20 min · 125 pts
- **Build Cache Cleanup** — find -name, find -delete, glob patterns, du -sh, safe cleanup · ⭐ beginner · 15 min · 100 pts

### Module 12 — Shell Environment & Configuration

- **The Broken PATH** — PATH, export, .bashrc, which/command -v, env -i · ⭐ beginner · 15 min · 100 pts
- **Feed the App Its Environment** — export, environment variables, .bashrc, parameter expansion :? · ⭐ beginner · 15 min · 100 pts
- **Bring Back the Aliases** — alias, unalias, .bashrc, shell productivity · ⭐ beginner · 10 min · 100 pts
- **The Silent Login Shell** — login vs non-login shells, .profile, .bashrc, bash -l, startup file order · ⭐⭐ intermediate · 20 min · 125 pts

### Module 13 — SSH & Remote Access

- **Generate Your First SSH Key** — ssh-keygen, ed25519, key permissions, ~/.ssh layout · ⭐ beginner · 15 min · 100 pts
- **SSH Ignores My Key** — authorized_keys, chmod, chown, sshd strict modes, stat · ⭐⭐ intermediate · 20 min · 125 pts
- **Tame the Hostnames** — ~/.ssh/config, Host aliases, HostName, IdentityFile, Port · ⭐⭐ intermediate · 20 min · 125 pts
- **Fingerprints and Stale Hosts** — ssh-keygen -lf, known_hosts, ssh-keygen -R, host key rotation · ⭐ beginner · 15 min · 100 pts

### Module 14 — Job Scheduling & Automation

- **Schedule the Nightly Backup** — cron syntax, /etc/cron.d, crontab fields, scheduling · ⭐ beginner · 15 min · 100 pts
- **Fix the Broken Cron File** — cron syntax debugging, /etc/cron.d, field validation, awk · ⭐⭐ intermediate · 20 min · 125 pts
- **Modern Scheduling with systemd Timers** — systemd, timer units, OnCalendar, unit files, WantedBy=timers.target · ⭐⭐ intermediate · 20 min · 125 pts
- **Cron Log Forensics** — log analysis, grep, awk timestamps, cron logging · ⭐ beginner · 15 min · 100 pts

### Module 15 — System Monitoring & Logs

- **The Error Hunt** — grep -c, tail, awk timestamp extraction, log triage · ⭐ beginner · 15 min · 100 pts
- **Build the Crash Timeline** — log correlation, grep, awk, systemd log lines, incident timeline · ⭐⭐ intermediate · 20 min · 125 pts
- **Health Snapshot** — free -m, uptime, load average, health checks · ⭐ beginner · 10 min · 100 pts
- **Rotate Out the Rotated Logs** — gzip, for loops, mv, log hygiene, wildcards · ⭐⭐ intermediate · 20 min · 125 pts

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
No secrets are stored in the repo. The first `docker compose up -d` runs a one-shot `secrets-init` service that generates `POSTGRES_PASSWORD` and `SECRET_KEY`, persists them in the `app_secrets` volume, and reuses them on every subsequent start. The only thing you set in `.env` is the admin login (already present in this repo):

```ini
ADMIN_EMAIL=admin@opslance.com
ADMIN_PASSWORD=admin
```

Optional overrides — uncomment in `.env` only if you want to pin a value or your layout differs from the default:

```ini
# POSTGRES_PASSWORD=...              # pin the DB password instead of the generated one
# SECRET_KEY=...                     # pin the JWT signing key instead of the generated one
# LABS_HOST_PATH=/abs/path/to/labs   # only if labs/ is not the ../labs directory next to this repo
```

> **Labs path auto-detection:** the labs directory is mounted from `../labs` (relative to this repo) by default, and the lab-manager derives the exact host-absolute path from its own mount table — no per-machine configuration is needed. Set `LABS_HOST_PATH` only if your `labs/` folder lives somewhere else.

> **Existing deployments:** if your `postgres_data` volume was initialized with the old hardcoded password (`devops_super_secret`), either run `docker compose down -v` once to reset the database and generate fresh secrets, or uncomment `POSTGRES_PASSWORD=devops_super_secret` in `.env` to keep the existing data.

### 3. Launching the Platform
Spin up the entire stack using Docker Compose:

```bash
docker compose up -d --build
```

Startup order: `secrets-init` (generates secrets) → `postgres` → `db-init` (migrations + seeding, one-shot) → `backend` (waits for the DB, syncs labs, starts the API) → `nginx` (starts once the backend healthcheck passes). `docker compose up -d` finishes only when the API actually answers.

If startup fails, each step logs to its own container — read them in this order:

```bash
docker compose ps                      # which service exited / is unhealthy
docker compose logs db-init --tail=40  # migration + seeding errors land here
docker compose logs backend --tail=40  # uvicorn / API errors land here
curl -i http://localhost:8000/api/health   # backend directly, bypassing nginx
```

If host port 8000 is already taken by another dev server, set `BACKEND_PORT=9000` in `.env` and run `docker compose up -d` again — the UI on port 80 keeps working either way.

To retrieve the generated database password (e.g. for a manual `psql` session):

```bash
docker compose exec postgres cat /secrets/postgres_password
```

### 4. Accessing the Platform
- **UI Website**: `http://localhost`
- **Backend API Docs**: `http://localhost/api/docs`

> **Note on Updates**: If you modify the `lab-manager` Python scripts or `backend` routes, you must run `docker compose build --no-cache [service_name]` followed by `docker compose up -d` because the Python code is baked into the image rather than live-mounted.

---

## 🧪 Testing

Three layers, all documented in **[docs/TESTING.md](docs/TESTING.md)**:

- **Backend API suite** (`backend/tests/` / `make test`): 96 pytest checks against a real embedded Postgres — auth + login throttle, RBAC, sessions + tier gates, grading + gamification, the question-by-question runner, progress/dashboard aggregates, achievements, admin analytics, every rate limiter, security headers. Only the Docker exec layer is stubbed.
- **Component unit tests** (`frontend/tests/unit/` / `npm test`): 17 vitest + Testing Library checks over the UI kit and theme helper.
- **Frontend E2E** (Playwright): 26 specs driving the production build against a live seeded backend (`scripts/live_backend_runner_p4.py`) — landing + 3D hero, login, dashboard (exam countdown, CKA stepper, heatmap, leaderboard), ⌘K palette, progress history filters, leaderboard podium + scope reorder, achievements, admin analytics, theme persistence, `/design`, mobile overflow guard, lab-runner entry.

```bash
make test        # backend API suite
cd frontend && npm test        # component unit tests
make test-e2e    # Playwright (needs the seeded backend — see docs/TESTING.md)
```

## 📚 Documentation

| Doc | Contents |
|---|---|
| [docs/TESTING.md](docs/TESTING.md) | How to run all three test layers, seeded E2E world, coverage table |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Service map, request flow, data model, hardening (v2 as-built) |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, typography, component kit, motion, patterns |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Runbook: first deploy, env vars, backups, security posture, troubleshooting |
| [docs/AUTHORING_LABS.md](docs/AUTHORING_LABS.md) | `lab.yaml` schema v2, weights, validator |
| [docs/REDESIGN_PLAN.md](docs/REDESIGN_PLAN.md) | UI redesign phases, status and decisions |

