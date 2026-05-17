FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    docker.io docker-compose \
    && rm -rf /var/lib/apt/lists/*

COPY lab-manager/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy required shared backend files
COPY backend/database.py .
COPY backend/models.py .
COPY lab-manager/worker.py .

CMD ["python", "worker.py"]
