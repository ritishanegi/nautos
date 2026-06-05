# Deployment Guide — Nautos

## Overview

The Nautos stack consists of six services orchestrated via Docker Compose:

| Service | Image / Build | Port | Role |
|---|---|---|---|
| `postgres` | `pgvector/pgvector:pg15` | `5432` | Primary database with vector extension |
| `redis` | `redis:7-alpine` | `6379` | Cache and Celery message broker |
| `elasticsearch` | `elasticsearch:8.17.0` | `9200` | Full-text search engine |
| `app` | `./nautos-app` | `3000` | Node.js web application |
| `worker-api` | `./nautos-worker` | `8000` | Python FastAPI worker |
| `worker-celery` | `./nautos-worker` | — | Celery background task processor |

---

## Prerequisites

- Docker Engine ≥ 24 and Docker Compose v2
- At least **4 GB RAM** available to Docker (Elasticsearch alone requires ~1 GB)
- Ports `3000`, `5432`, `6379`, `8000`, and `9200` free on the host

---

## Environment Configuration

Copy or create a `.env` file in the project root before starting any services. Required variables:

```env
# Database
DB_NAME=nautos
DB_USER=nautos_user
DB_PASS=nautos_dev_pass

# Add any secrets consumed by the app and worker here
# (e.g. ANTHROPIC_API_KEY, JWT_SECRET, etc.)
```

The `app`, `worker-api`, and `worker-celery` services all load this file via `env_file: .env`. The database credentials are also passed explicitly to those services as `DATABASE_URL` / `DB_HOST` environment variables, so make sure any values you set in `.env` match what the services expect.

> **Note:** The `worker-api` and `worker-celery` services have the database password hard-coded in their `DATABASE_URL` environment variable (`nautos_dev_pass`). Change both the `.env` value and the compose file before deploying to any non-development environment.

---

## Starting the Stack

```bash
# Build application images and start all services
docker compose up --build

# Run in the background
docker compose up --build -d
```

Services start in dependency order. `app`, `worker-api`, and `worker-celery` will not start until Postgres, Redis, and Elasticsearch all pass their health checks.

### Starting individual services

```bash
docker compose up postgres redis elasticsearch   # infra only
docker compose up app                            # app + its dependencies
docker compose up worker-api worker-celery       # workers + their dependencies
```

---

## Health Checks

Each infrastructure service has a built-in health check. The stack will not route traffic to dependent services until these pass.

| Service | Check | Interval | Retries |
|---|---|---|---|
| `postgres` | `pg_isready` | 5 s | 5 |
| `redis` | `redis-cli ping` | 5 s | 5 |
| `elasticsearch` | `GET /_cluster/health` | 10 s | 10 |

To inspect health status:

```bash
docker compose ps
```

---

## Database Migrations

Migrations under `./packages/db/migrations/` are mounted into the Postgres container at `/docker-entrypoint-initdb.d` and run automatically on **first start** (when the `pgdata` volume is empty).

To re-run migrations on a fresh database:

```bash
docker compose down -v          # removes volumes — destructive
docker compose up postgres -d
```

---

## Persistent Volumes

| Volume | Service | Purpose |
|---|---|---|
| `pgdata` | `postgres` | Database files |
| `redisdata` | `redis` | Redis persistence |
| `esdata` | `elasticsearch` | Elasticsearch indices |

Volumes survive `docker compose down`. To remove them entirely:

```bash
docker compose down -v
```

---

## Hot Reload (Development)

Source directories are bind-mounted into the application containers, so code changes on the host are reflected without rebuilding:

| Service | Host path | Container path |
|---|---|---|
| `app` | `./nautos-app/src` | `/app/src` |
| `app` | `./nautos-app/public` | `/app/public` |
| `worker-api` | `./nautos-worker/app` | `/worker/app` |
| `worker-celery` | `./nautos-worker/app` | `/worker/app` |

If the application server or Celery worker requires an explicit reload on file change, ensure the respective `Dockerfile` or startup command enables a watch mode (e.g. `--reload` for Uvicorn, `nodemon` for Node).

---

## Celery Worker

`worker-celery` runs with concurrency set to **2**:

```
celery -A app.celery_app:celery worker --loglevel=info --concurrency=2
```

To scale horizontally, add more replicas via Compose:

```bash
docker compose up --scale worker-celery=4 -d
```

---

## Useful Commands

```bash
# View logs for a specific service
docker compose logs -f app

# Open a psql shell
docker compose exec postgres psql -U nautos_user -d nautos

# Open a Redis CLI
docker compose exec redis redis-cli

# Query Elasticsearch cluster health
curl http://localhost:9200/_cluster/health?pretty

# Restart a single service
docker compose restart worker-celery

# Stop everything (volumes preserved)
docker compose down

# Stop everything and remove volumes
docker compose down -v
```

---

## Production Considerations

- **Secrets:** Do not commit `.env` to version control. Use a secrets manager or CI/CD environment variables to inject credentials at deploy time.
- **Elasticsearch security:** `xpack.security.enabled=false` is set for local development. Enable it and configure TLS before exposing Elasticsearch in production.
- **Database password:** The `DATABASE_URL` in `worker-api` and `worker-celery` contains a literal password. Move it to `.env` and reference it with variable substitution (`${DB_PASS}`) in the compose file.
- **Resource limits:** Add `deploy.resources.limits` to each service to prevent any one container from starving the host.
- **Reverse proxy:** Place a reverse proxy (nginx, Caddy, Traefik) in front of `app` (port 3000) and `worker-api` (port 8000) to handle TLS termination and routing.
- **Elasticsearch heap:** The `ES_JAVA_OPTS` is set to 512 MB (`-Xms512m -Xmx512m`). Increase this for production workloads, keeping it at no more than 50% of available RAM.