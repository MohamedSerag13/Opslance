FROM python:3.11-slim

WORKDIR /app

# worker.py prints diagnostics to stdout; without this Python block-buffers
# them into an 8KB pipe buffer and `docker compose logs lab-manager` stays empty
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    docker.io docker-compose \
    && rm -rf /var/lib/apt/lists/*

COPY lab-manager/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Entrypoint resolves the auto-generated secrets, then runs the CMD
COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy required shared backend files
COPY backend/database.py .
COPY backend/models.py .
COPY lab-manager/worker.py .
COPY lab-manager/api.py .
# Sudoers whitelist injected into student lab containers at runtime
COPY lab-manager/sudoers-lab-student .


CMD ["python", "worker.py"]
ENTRYPOINT ["docker-entrypoint.sh"]
