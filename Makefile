.PHONY: up down logs migrate seed test clean

up:
	docker compose up -d
	@echo "Waiting for services..."
	@timeout /t 5 /nobreak > nul 2>&1 || sleep 5
	@echo "Services started. App: http://localhost:3000 | Worker: http://localhost:8000"

down:
	docker compose down

logs:
	docker compose logs -f

logs-app:
	docker compose logs -f app

logs-worker:
	docker compose logs -f worker

migrate:
	docker compose exec postgres psql -U nautos_user -d nautos -f /docker-entrypoint-initdb.d/001_initial_schema.sql

seed:
	@echo "Seeding not yet implemented (Sprint 1)"

test:
	cd nautos-app && pnpm lint
	cd nautos-worker && uv run pytest

test-worker:
	cd nautos-worker && uv run pytest -v

clean:
	docker compose down -v
	@echo "Volumes removed"

restart:
	docker compose restart

status:
	docker compose ps

db-shell:
	docker compose exec postgres psql -U nautos_user -d nautos

redis-shell:
	docker compose exec redis redis-cli
