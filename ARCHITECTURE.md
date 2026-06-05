# NAUTOS AI — Architecture & Code Map

> Read this first. It explains where every piece of code lives and why.

---

## 1. The big picture

NAUTOS AI is split into **3 deployable services** plus **1 shared schema package**:

```
nautos/
├── apps/
│   ├── web/            ← Next.js (frontend + API routes + auth)        [TypeScript]
│   └── worker/         ← Python (OCR, embeddings, RAG, ML tasks)        [Python]
├── packages/
│   └── db/             ← Database schema & migrations (shared)           [SQL]
├── docker-compose.yml  ← Spins up: postgres, redis, elasticsearch, all 3 services
└── Makefile            ← Convenience commands (make up, make seed, etc.)
```

### Why split this way?

- **`apps/web`** does everything user-facing: pages, auth, REST APIs, uploads. JavaScript ecosystem is best for this.
- **`apps/worker`** does ML-heavy work: OCR, embeddings, vector search, LLM calls. Python has the libraries.
- **`packages/db`** holds the database schema and migrations both services connect to.

The two services **never share code**. They communicate only via:
1. **HTTP** — `apps/web` calls `apps/worker` for ingestion + query
2. **PostgreSQL** — both read/write the same tables
3. **Redis** — Celery queue (worker only) + rate limiting (app only)
4. **S3** — both read/write document files

---

## 2. Request flow — what happens when you upload a PDF

```
1.  User drops PDF in browser
       ↓
2.  apps/web /api/documents/upload  (Next.js route)
       ↓ uploads to S3
       ↓ inserts row in `documents` table (status: pending)
       ↓ inserts row in `ingestion_jobs` table (status: queued)
       ↓ calls apps/worker /tasks/ingest
       ↓
3.  apps/worker queues Celery task `ingest_document`
       ↓
4.  Celery worker picks up the task and runs the pipeline:
       a) Download PDF from S3
       b) Send to Azure Document Intelligence for OCR
       c) Chunk text (400 words, 60-word overlap)
       d) Embed each chunk with Voyage AI (1024-dim vectors)
       e) Store vectors in pgvector (`embeddings` table)
       f) Index chunks in Elasticsearch for BM25 keyword search
       g) Update `documents.ocr_status` → 'complete'
       ↓
5.  Browser polls /api/documents/:id/status every 2s for progress bar
```

## 3. Request flow — what happens when you ask a question

```
1.  User types question in /dashboard/query
       ↓
2.  apps/web /api/query (Next.js route)
       ↓ forwards to apps/worker /api/query/stream
       ↓
3.  apps/worker RAGService runs the pipeline:
       a) Embed the question (Voyage AI)
       b) Keyword search (Elasticsearch BM25)
       c) Vector search (pgvector cosine similarity)
       d) Reciprocal Rank Fusion to merge results
       e) Score boost by scope (vessel × 1.15, fleet × 1.05, master × 1.00)
       f) Strip PII from master library chunks
       g) Build context block with [Source: title, page X] labels
       h) Stream answer from LLM (Gemini or Claude)
       ↓
4.  SSE tokens stream back through Next.js → browser
```

---

## 4. `apps/web/` — the Next.js frontend & API

```
apps/web/
├── src/
│   ├── middleware.ts                        ← JWT check on every request, injects x-tenant-id header
│   │
│   ├── app/                                 ← Next.js App Router (pages + API routes)
│   │   ├── layout.tsx                       ← Root HTML shell, fonts, service worker
│   │   ├── page.tsx                         ← Landing page (/)
│   │   ├── globals.css                      ← Tailwind setup + design tokens
│   │   │
│   │   ├── auth/
│   │   │   ├── login/page.tsx               ← Login form
│   │   │   └── register/page.tsx            ← Sign-up + create tenant
│   │   │
│   │   ├── dashboard/                       ← All authenticated pages
│   │   │   ├── layout.tsx                   ← Sidebar wrapper for dashboard pages
│   │   │   ├── page.tsx                     ← Dashboard home (KPIs + onboarding actions)
│   │   │   ├── loading.tsx                  ← Spinner shown during route transitions
│   │   │   ├── error.tsx                    ← Error boundary for dashboard
│   │   │   ├── query/page.tsx               ← "Ask AI" chat interface
│   │   │   ├── documents/
│   │   │   │   ├── page.tsx                 ← Document list + upload dialog
│   │   │   │   └── [id]/page.tsx            ← Single document + processing progress
│   │   │   ├── vessels/
│   │   │   │   ├── page.tsx                 ← Fleet list + add-vessel dialog
│   │   │   │   └── [id]/page.tsx            ← Vessel detail + equipment + linked docs
│   │   │   └── analytics/page.tsx           ← Charts: query volume, doc status
│   │   │
│   │   └── api/                             ← All backend endpoints (no separate server)
│   │       ├── health/route.ts              ← GET — Kubernetes health probe
│   │       ├── auth/
│   │       │   ├── login/route.ts           ← POST — email+password → cookie
│   │       │   ├── register/route.ts        ← POST — create tenant + admin user
│   │       │   ├── logout/route.ts          ← POST — clears cookie
│   │       │   └── me/route.ts              ← GET — current user from JWT
│   │       ├── documents/
│   │       │   ├── route.ts                 ← GET — list tenant's documents
│   │       │   ├── upload/route.ts          ← POST — multipart OR presigned URL
│   │       │   └── [id]/
│   │       │       ├── route.ts             ← GET — single doc + download URL
│   │       │       └── status/route.ts      ← GET — ingestion job progress (polled)
│   │       ├── vessels/
│   │       │   ├── route.ts                 ← GET list, POST create
│   │       │   └── [id]/route.ts            ← GET detail, PATCH update
│   │       ├── equipment/route.ts           ← GET list (filterable), POST create
│   │       ├── analytics/route.ts           ← GET — aggregated metrics
│   │       └── query/route.ts               ← POST — proxies SSE stream from worker
│   │
│   ├── components/
│   │   ├── ui/                              ← shadcn/ui primitives (button, input, dialog, etc.)
│   │   └── layout/
│   │       └── sidebar.tsx                  ← Dashboard navigation
│   │
│   └── lib/                                 ← Shared utilities, grouped by concern
│       ├── db/                              ← Database layer
│       │   ├── index.ts                     ← Postgres connection (drizzle-orm)
│       │   └── schema.ts                    ← Drizzle table definitions (must match SQL migrations!)
│       ├── auth/                            ← Authentication primitives
│       │   ├── index.ts                     ← JWT sign/verify + bcrypt hash/compare
│       │   └── session.ts                   ← getSession() — read JWT from cookie
│       ├── clients/                         ← External service clients
│       │   ├── s3.ts                        ← uploadToS3, getUploadUrl, getDownloadUrl
│       │   ├── redis.ts                     ← Single ioredis client for rate limiting
│       │   └── worker.ts                    ← dispatchIngestion, streamQuery — calls Python worker
│       ├── server/                          ← Server-only helpers (never imported by client)
│       │   ├── api-helpers.ts               ← requireTenant() guard + standard error responses
│       │   └── rate-limit.ts                ← Redis-backed sliding window limiter
│       ├── constants.ts                     ← STATUS_STYLE, DOC_TYPES, VESSEL_TYPES, file size limits
│       └── utils.ts                         ← cn() — Tailwind class merging
│
├── __tests__/                               ← Vitest tests (lives outside src/)
│   ├── lib/
│   │   ├── auth.test.ts                     ← JWT + bcrypt round-trip tests
│   │   └── rate-limit.test.ts               ← Rate limiter unit tests
│   └── middleware.test.ts                   ← Middleware redirect + auth tests
│
├── public/                                  ← Static assets (favicon, manifest, sw.js)
├── Dockerfile                               ← Multi-stage build for prod
├── docker-compose.yml                       ← (used by parent compose file)
├── package.json                             ← pnpm dependencies
├── tsconfig.json                            ← Path alias: @/* → src/*
├── next.config.ts                           ← Next.js config (standalone output for Docker)
└── tailwind.config.ts                       ← Design tokens for shadcn/ui
```

### Key rules for `apps/web`

- **Every API route** must call `requireTenant(req)` first (from `lib/api-helpers.ts`). This pulls the tenant ID from middleware-injected headers and returns 401 if missing.
- **Every DB query** must filter by `tenantId`. The `requireTenant()` helper makes this hard to forget.
- **`lib/db/schema.ts`** must stay in sync with `packages/db/migrations/*.sql`. If you change one, change the other.
- **File uploads + SSE streaming** stay in plain REST routes. CRUD operations stay in plain REST routes. (We removed the unused tRPC layer.)

---

## 5. `apps/worker/` — the Python ML worker

This service has **two roles** that run side-by-side:

1. **FastAPI HTTP server** (`worker-api` container) — receives dispatch requests from apps/web
2. **Celery worker** (`worker-celery` container) — pulls tasks from Redis and runs them

```
apps/worker/
├── app/
│   ├── main.py                              ← FastAPI app — exposes /tasks/ingest and /api/query/stream
│   ├── celery_app.py                        ← Celery instance (Redis broker)
│   ├── config.py                            ← Pydantic Settings — all env vars in one place
│   │
│   ├── routes/                              ← FastAPI HTTP endpoints
│   │   └── query.py                         ← POST /api/query/stream (SSE) + POST /api/query
│   │
│   ├── tasks/                               ← Celery background tasks
│   │   ├── ingestion.py                     ← @app.task ingest_document — the full PDF pipeline
│   │   ├── query.py                         ← @app.task run_query — for async/batch queries
│   │   └── promotion.py                     ← @app.task promote_to_master — strip PII + re-embed
│   │
│   ├── services/                            ← Business logic (called by tasks and routes)
│   │   ├── ingestion/                       ← Everything in the upload → indexed pipeline
│   │   │   ├── storage.py                   ← Download PDFs from S3
│   │   │   ├── ocr.py                       ← Azure Document Intelligence — extracts text + tables
│   │   │   ├── chunker.py                   ← Split text into 400-word chunks with 60-word overlap
│   │   │   └── embeddings.py                ← Voyage AI — voyage-3-large → 1024-dim vectors
│   │   ├── retrieval/                       ← Everything in the question → answer pipeline
│   │   │   ├── search.py                    ← Elasticsearch BM25 keyword search
│   │   │   ├── vectordb.py                  ← pgvector — store + cosine similarity search
│   │   │   ├── rag.py                       ← THE 12-STEP RAG PIPELINE — most important file
│   │   │   └── llm.py                       ← Gemini OR Claude wrapper — swappable provider
│   │   ├── db.py                            ← psycopg connection helper (context manager)
│   │   └── privacy.py                       ← stripMasterMetadata — regex PII removal
│   │
│   └── models/
│       └── schemas.py                       ← Pydantic models for API request/response shapes
│
├── pyproject.toml                           ← Python dependencies (uv/pip)
├── Dockerfile                               ← Builds both worker-api and worker-celery images
└── README.md                                ← Worker-specific docs
```

### Key rules for `apps/worker`

- **`services/`** = pure logic. No HTTP, no Celery decorators. Reusable from anywhere.
- **`tasks/`** = Celery-decorated functions. They call services. Don't put logic here.
- **`routes/`** = FastAPI endpoints. They call services or queue tasks. Don't put logic here.
- **`config.py`** is the ONLY place that reads `os.environ` or env files. Everything else imports `settings`.
- **`services/retrieval/rag.py`** is the core IP — the 12-step hybrid retrieval pipeline. Don't touch unless you understand it end-to-end.

---

## 6. `packages/db/` — the database schema

```
packages/db/
├── src/
│   ├── index.ts                             ← Exports schema and utilities
│   └── schema.ts                            ← Drizzle table definitions
└── migrations/
    ├── 001_initial_schema.sql               ← All 14 tables + indexes
    └── 002_hnsw_indexes.sql                 ← Vector indexes (run after first data load)
```

**These SQL files are the source of truth for the database.** Both `apps/web/src/lib/db/schema.ts` (Drizzle) and `apps/worker/app/services/db.py` (raw SQL) must match what's defined here.

### The 14 tables (and what they're for)

| Table | Purpose |
|-------|---------|
| `tenants` | One row per client company. Top of multi-tenant tree. |
| `users` | Logins. Always belong to a tenant. |
| `vessels` | Ships in a tenant's fleet. |
| `equipment` | Engines, pumps, etc. on a vessel. |
| `documents` | Uploaded PDFs. Has `scope`: vessel / fleet / master. |
| `embeddings` | Vector chunks for tenant documents (pgvector 1024-dim). |
| `master_library` | PII-stripped versions of approved documents shared across tenants. |
| `master_embeddings` | Vector chunks for master library (no tenant_id). |
| `ingestion_jobs` | Progress tracking for OCR pipeline. Drives the progress bar. |
| `query_log` | Every Q&A logged for analytics. |
| `onboarding_progress` | Per-tenant step completion (vessel added, doc uploaded, etc.) |
| `invite_tokens` | Secure signup tokens. Expire in 7 days. |
| `tenant_branding` | White-label config: logo, colors, custom domain. |
| `master_rejection_log` | Audit trail of rejected master library submissions. |

### The golden rule

**Every tenant-scoped table has a `tenant_id` column.** Every query must filter by it. Cross-tenant data leaks are the #1 thing to prevent. The `requireTenant()` helper in `apps/web/src/lib/api-helpers.ts` makes this hard to forget.

---

## 7. The Docker stack — what runs where

```
docker-compose.yml spins up 6 containers:

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   postgres      │    │     redis       │    │ elasticsearch   │
│  (pgvector ext) │    │  (queue + RL)   │    │  (BM25 search)  │
│   port 5432     │    │   port 6379     │    │   port 9200     │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                       │
         │                      │                       │
    ┌────┴──────────────────────┴───────────────────────┴────┐
    │                                                         │
┌───┴───────────┐  ┌─────────────────┐  ┌────────────────┐
│  apps/web     │  │   worker-api    │  │ worker-celery  │
│   (Next.js)   │──→│   (FastAPI)     │  │  (background)  │
│  port 3001    │  │   port 8000     │  │  (no port)     │
└───────────────┘  └─────────────────┘  └────────────────┘
        ↑                  ↑                      ↑
        └──────────────────┴──────────────────────┘
                           │
                    All read/write S3 (AWS)
```

**Communication paths:**
- `apps/web` → `worker-api` (HTTP) — for dispatching ingest + query
- `worker-api` → Redis (queue) — pushes tasks for `worker-celery` to pick up
- `worker-celery` ← Redis (queue) — pulls and executes tasks
- All three services → `postgres`, `redis`, `elasticsearch`, S3

---

## 8. Environment variables — what each one is for

All in `.env` at the repo root. Loaded by Docker Compose into all containers.

| Variable | Used by | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | app, worker | Postgres connection string |
| `REDIS_URL` | app, worker | Redis broker + rate limit storage |
| `ELASTICSEARCH_URL` | worker | BM25 search index |
| `JWT_SECRET` | app | Signs login tokens (64-char hex) |
| `NEXTAUTH_SECRET` | app | (reserved for future NextAuth migration) |
| `AWS_ACCESS_KEY_ID` | app, worker | S3 access |
| `AWS_SECRET_ACCESS_KEY` | app, worker | S3 access |
| `AWS_REGION` | app, worker | S3 region (ap-south-1) |
| `AWS_S3_BUCKET` | app, worker | Document bucket name |
| `AZURE_DI_ENDPOINT` | worker | OCR API endpoint |
| `AZURE_DI_KEY` | worker | OCR API key |
| `VOYAGE_API_KEY` | worker | Embeddings API (voyage-3-large) |
| `GEMINI_API_KEY` | worker | LLM provider (free tier — current default) |
| `ANTHROPIC_API_KEY` | worker | LLM provider (paid — optional fallback) |
| `LLM_PROVIDER` | worker | "gemini" or "anthropic" — picks which to use |
| `RESEND_API_KEY` | app | Transactional email |
| `WORKER_URL` | app | Internal URL of worker-api (http://worker-api:8000) |

---

## 9. Where to look when something breaks

| Symptom | Look here |
|---------|-----------|
| Login fails | `apps/web/src/app/api/auth/login/route.ts` + `lib/auth.ts` |
| Upload returns 401 | `apps/web/src/middleware.ts` — JWT not being injected |
| Upload returns 500 | `apps/web/src/app/api/documents/upload/route.ts` + S3 credentials |
| Document stuck in "pending" | `worker-celery` logs — is the task even running? |
| Document stuck in "processing" | `worker-celery` logs — which step failed? OCR, embed, or index? |
| Query returns "no results" | `apps/worker/app/services/retrieval/rag.py` — score threshold may be too high |
| Query crashes | LLM API key missing or wrong provider in `LLM_PROVIDER` |
| Tenant sees another tenant's data | **Critical security bug** — find the route missing `requireTenant()` |
| Vector dimension mismatch | `schema.ts` says 1024, voyage-3-large outputs 1024. Anywhere else and you're broken. |

### Useful commands

```bash
# See all logs
docker compose logs -f

# Just the worker
docker compose logs -f worker-celery

# Restart after .env change
docker compose down && docker compose up -d

# Rebuild after dependency change
docker compose build worker-api worker-celery && docker compose up -d

# Check Postgres directly
docker compose exec postgres psql -U nautos_user -d nautos -c "\dt"

# Tail Elasticsearch
docker compose logs -f elasticsearch
```

---

## 10. Gaps from the original handover doc

We've implemented the foundation but these features from the handover spec are **not yet built**:

- [ ] Master library promotion UI + approve/reject endpoints
- [ ] Onboarding flow (invite tokens, signup with token, checklist)
- [ ] White-label branding UI (logo upload, color picker, custom domain)
- [ ] Document PATCH/DELETE endpoints
- [ ] Equipment PATCH endpoint
- [ ] Vessel soft-delete endpoint
- [ ] Auth refresh tokens
- [ ] Admin user creation (`/auth/register-user`)
- [ ] Query filters (`doc_types`, `version_filter`)
- [ ] Master library version supersession
- [ ] PII stripping regex (`stripMasterMetadata`)
- [ ] Seed script for test data
- [ ] Structured data extraction (PDF → Excel — future feature, not in original spec)

The current state covers: auth, upload, full OCR + embedding pipeline, vector + keyword search, RAG query, basic analytics, and a working dashboard.
