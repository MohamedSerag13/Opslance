FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run pending migrations, seed, sync labs, then start FastAPI
CMD ["sh", "-c", "alembic upgrade head && PYTHONPATH=/app python scripts/seed_admin.py && PYTHONPATH=/app python scripts/sync_labs.py && uvicorn main:app --host 0.0.0.0 --port 8000"]
