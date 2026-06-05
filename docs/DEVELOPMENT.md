# LOCAL DEVELOPMENT SETUP

Get the project running locally.

---

## Prerequisites

- **Docker & Docker Compose** installed
- **Node.js 22+** (optional, for local TypeScript checks)
- **Python 3.12** (optional, for local tests)

---

## Start Development

```bash
# From repo root
docker compose up -d

# Watch logs
docker compose logs -f app      # Next.js frontend + API
docker compose logs -f worker-celery  # Background jobs

# Stop everything
docker compose down
```

The app starts at **http://localhost:3000**

---

## Inside Containers

```bash
# TypeScript type check (in app container)
docker compose exec app npx tsc --noEmit

# Run tests
docker compose exec app npm test

# Database shell
docker compose exec postgres psql -U nautos_user -d nautos

# Python type check
docker compose exec worker-api mypy app/

# View Celery tasks
docker compose exec worker-celery celery -A app.celery_app inspect active
```

---

## Troubleshooting

**Port 3000 already in use?**
```bash
# Stop containers
docker compose down

# Or change port in docker-compose.yml: 3000:3000 → 3001:3000
```

**Database migration failed?**
```bash
# Reset database (deletes all data)
docker volume rm nautos_pgdata
docker compose up postgres  # Start only postgres
```

**Node modules out of sync?**
```bash
# Inside app container:
docker compose exec app pnpm install
```

**Python dependencies out of sync?**
```bash
# Rebuild worker images:
docker compose build worker-api worker-celery
docker compose restart worker-api worker-celery
```

---

## File Structure

When working locally, remember:
- **Frontend code:** `apps/web/src/app/` + `apps/web/src/components/`
- **API endpoints:** `apps/web/src/app/api/`
- **Worker jobs:** `apps/worker/app/`
- **Database schema:** `db/migrations/`

See `docs/STRUCTURE.md` for full layout.
