# NAUTOS FOLDER STRUCTURE

Clean pnpm monorepo layout for solo dev + future team growth.

---

## TOP-LEVEL VIEW

```
nautos/
├── apps/              ← Deployable services (web + worker)
├── packages/          ← Shared packages (database schema)
├── docs/              ← Documentation (this file lives here)
├── pnpm-workspace.yaml ← Monorepo config
├── docker-compose.yml ← Single deployment config
├── CLAUDE.md          ← Claude documentation
├── AUDIT.md           ← Security audit log
├── ROADMAP.md         ← Feature roadmap
└── Makefile           ← Dev commands
```

---

## APPS/ — DEPLOYABLE SERVICES

### `apps/web/`
**Next.js full-stack** — Frontend UI + REST API + authentication.

```
apps/web/
├── src/
│   ├── middleware.ts    ← JWT validation on every request
│   ├── app/             ← Next.js App Router (pages + API routes)
│   │   ├── page.tsx     ← Landing page
│   │   ├── layout.tsx   ← Root HTML + service worker
│   │   ├── globals.css  ← Tailwind + design tokens
│   │   ├── auth/        ← Login, register, profile
│   │   ├── dashboard/   ← Protected pages (query, documents, vessels)
│   │   └── api/         ← REST endpoints (/api/documents, /api/query, etc.)
│   ├── components/      ← React components (UI + layout)
│   └── lib/             ← Utilities & server logic
│       ├── db/          ← Drizzle ORM (imports from @nautos/db)
│       ├── auth/        ← JWT sign/verify
│       ├── clients/     ← S3, Redis, Worker API
│       └── server/      ← Rate limiting, multi-tenancy
├── __tests__/           ← Vitest tests
├── public/              ← Static assets
├── package.json         ← Includes @nautos/db dependency
├── tsconfig.json        ← Path alias: @/* → src/*
├── next.config.ts
└── Dockerfile           ← Production build
```

**What lives here:**
- All UI pages + components
- All REST endpoints (`/api/*`)
- Database access (via @nautos/db)
- Auth logic (JWT)
- External service clients

**What does NOT live here:**
- Python code (that's apps/worker/)
- Database migrations (that's packages/db/)
- Raw SQL (that's packages/db/)

---

### `apps/worker/`
**Python FastAPI + Celery** — Async processing, OCR, embeddings, RAG, LLM.

```
apps/worker/
├── app/
│   ├── main.py          ← FastAPI app + routes
│   ├── celery_app.py    ← Celery instance (Redis broker)
│   ├── config.py        ← Settings & all env vars
│   ├── routes/          ← FastAPI endpoints
│   │   └── query.py     ← POST /api/query/stream (SSE)
│   ├── tasks/           ← Celery background tasks
│   │   ├── ingestion.py ← ingest_document (full PDF pipeline)
│   │   └── query.py     ← run_query (async batch queries)
│   └── services/        ← Pure business logic
│       ├── ingestion/   ← OCR, chunking, embeddings
│       ├── retrieval/   ← Search, vectordb, RAG, LLM
│       ├── privacy.py   ← PII stripping
│       └── db.py        ← Database helpers
├── pyproject.toml       ← Python dependencies
├── Dockerfile           ← Builds both worker-api & worker-celery
└── README.md
```

**Clear boundary:**
- `app/services/` = pure logic (reusable from anywhere)
- `app/tasks/` = Celery decorators + task wrappers
- `app/routes/` = FastAPI decorators + endpoint wrappers

---

## PACKAGES/ — SHARED CODE

### `packages/db/`
**Database schema & migrations** — Single source of truth.

```
packages/db/
├── src/
│   ├── index.ts         ← Exports schema + utilities
│   └── schema.ts        ← Drizzle table definitions
├── migrations/
│   ├── 001_initial_schema.sql       ← All 14 tables + indexes
│   ├── 002_hnsw_indexes.sql         ← Vector search indexes
│   └── 003_chat_sessions.sql        ← Chat history tables
├── package.json         ← Published as @nautos/db
└── drizzle.config.ts    ← Migration config
```

**What lives here:**
- **Nothing else.** This is schema + migrations only.
- `apps/web` imports the schema: `import { schema } from "@nautos/db"`
- `apps/worker` reads migrations from this package

**Why separate?**
- Single source of truth (no duplication)
- Both apps stay in sync
- Easy migration versioning

---

## DOCS/ — DOCUMENTATION

```
docs/
├── STRUCTURE.md         ← This file (folder layout)
├── API.md               ← REST API endpoints
├── DEVELOPMENT.md       ← Local setup guide
└── DEPLOYMENT.md        ← Production deploy
```

---

## PNPM WORKSPACE

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

This makes:
- `@nautos/db` importable from any app
- Independent `node_modules` (hoisted at root)
- Unified lockfile (`pnpm-lock.yaml`)

---

## HOW TO TRACK WHAT CLAUDE UPDATES

When Claude makes changes:

| Path | What changed | Why it matters |
|------|--------------|---|
| `apps/web/src/app/` | Pages, API routes | Affects frontend & backend |
| `apps/web/src/components/` | React components | Affects what users see |
| `apps/web/src/lib/` | Database queries, auth | Affects backend logic |
| `apps/worker/app/services/` | OCR, embeddings, RAG | Affects document processing |
| `apps/worker/app/tasks/` | Background job logic | Affects job execution |
| `packages/db/migrations/` | Database schema | Affects data structure |
| `docker-compose.yml` | Deployment config | Affects how services run |
| `docs/` | Documentation | Affects understanding |

---

## QUICK REFERENCE

**Start development:**
```bash
docker compose up
```

**Where is the [thing]?**
- UI pages? → `apps/web/src/app/`
- REST endpoint? → `apps/web/src/app/api/`
- Database query? → `apps/web/src/lib/db/`
- Document processing? → `apps/worker/app/services/ingestion/`
- LLM calls? → `apps/worker/app/services/retrieval/llm.py`
- Background jobs? → `apps/worker/app/tasks/`
- Database schema? → `packages/db/migrations/`
- Deployments? → `docker-compose.yml`

---

## IMPORTANT NOTES

- **Source of truth** is `apps/` + `packages/` + `docker-compose.yml`
- **pnpm is required** (not npm, not yarn)
- **When the team grows**, this structure scales:
  - Add new apps: `apps/new-service/`
  - Add new packages: `packages/new-lib/`
  - Independent deployments per app
  - Clear team boundaries (frontend owns `apps/web/`, backend owns `apps/worker/`)
