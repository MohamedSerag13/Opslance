.PHONY: up down build seed logs clean migrate status test test-e2e

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

# One-shot admin + default-group seeding (the db-init job does this on first
# boot already); the stack must be up.
seed:
	docker compose exec backend sh -c 'PYTHONPATH=/app python scripts/seed_admin.py'

logs:
	docker compose logs -f backend

clean:
	docker compose down -v
	docker system prune -f

migrate:
	docker compose exec backend sh -c 'alembic upgrade head'

status:
	docker compose ps

# Backend API suite (runs on the host, needs backend Python deps)
test:
	cd backend && PYTHONPATH="$PWD" python -m pytest tests/ -q

# Browser E2E against a live seeded backend on :8123 — see docs/TESTING.md
test-e2e:
	cd frontend && npx playwright test
