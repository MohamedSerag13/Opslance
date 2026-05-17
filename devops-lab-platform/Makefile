.PHONY: up down build seed logs full clean migrate

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

seed:
	docker compose exec backend node -e "require('./src/db').runMigrations().then(() => require('./src/db').seedDatabase())"

logs:
	docker compose logs -f backend

full:
	docker compose --profile full up -d

monitoring:
	docker compose --profile monitoring up -d

clean:
	docker compose down -v
	docker system prune -f

migrate:
	docker compose exec backend node -e "require('./src/db').runMigrations()"

migrate:rollback:
	docker compose exec backend node -e "require('./src/db').rollbackMigration()"

status:
	docker compose ps
