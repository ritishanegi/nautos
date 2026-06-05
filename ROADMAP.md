# NAUTOS AI — LLM Quality Roadmap

Plan for the four features needed to make the chat experience production-grade.

Generated after cross-referencing the actual MAIN AIR COMPRESSOR PDF (5 pages, 57 parts)
against the LLM's output (stopped at ~part 17). This roadmap addresses the gap.

---

## The four problems we're solving

| # | Problem | Root cause |
|---|---------|-----------|
| 1 | **No chat history** | Stateless queries. React state lost on refresh. LLM never sees previous turns. |
| 2 | **No copy/paste UX** | Plain text in `<div>`. No markdown rendering. Tables show as raw syntax. |
| 3 | **LLM hallucinates / drifts** | Searches across ALL docs. Temperature 0.3. Generic system prompt. |
| 4 | **Incomplete extraction** | `max_output_tokens=2048` (table needs ~6000). TOP_K=10 squeezed out by other docs. |

---

## Roadmap — 4 phases, ~12 hours total

```
Phase 1 (1h)   ─→ LLM Quality Quick Wins
                  Bump tokens, lower temp, strengthen prompt, markdown + copy
                  Fixes Problem 2 + 70% of Problem 4

Phase 2 (3h)   ─→ Document Scoping
                  "Ask about THIS document" mode + retrieve all chunks
                  Fixes Problem 3 + remaining 30% of Problem 4

Phase 3 (4-5h) ─→ Chat History & Sessions
                  Sessions sidebar, persistent chats, multi-turn context
                  Fixes Problem 1

Phase 4 (3h)   ─→ Excel Export (killer differentiator)
                  "Extract table to .xlsx" — the CMMS data-entry feature
                  Bonus, not in original list but discovered during testing
```

---

## Phase 1 — LLM Quality Quick Wins  *(1 hour)*

**Goal:** Make the existing chat noticeably better with surgical edits.

### Backend changes

**`apps/worker/app/services/retrieval/llm.py`**
- `max_tokens=2048` → `max_tokens=8000` (Llama 3.3 70B supports it)
- `temperature=0.3` → `temperature=0.1` (less creative drift)
- Strengthen `SYSTEM_PROMPT`:
  - Add: *"Never infer or synthesize beyond the text. Quote part numbers, codes, and specifications EXACTLY as written."*
  - Add: *"For tables: output ALL rows. Never abbreviate with '...' or 'and so on'."*
  - Add: *"If you cannot find the answer in the context, say 'Not found in the provided documentation' — do not guess."*

### Frontend changes

**`apps/web/package.json`** — add deps:
- `react-markdown` — markdown rendering
- `remark-gfm` — tables, strikethrough, task lists
- `react-syntax-highlighter` — code block highlighting

**`apps/web/src/components/chat/`** — new directory:
- `message.tsx` — renders an assistant message with markdown + copy button
- `code-block.tsx` — code blocks with language label + copy
- `markdown-table.tsx` — styled tables with "copy as CSV" button

**`apps/web/src/app/dashboard/query/page.tsx`** — replace plain `<div>` rendering with `<Message>` component.

### Acceptance criteria

- [ ] Asking for the MAIN AIR COMPRESSOR parts list returns all 57 rows (or close — chunking permitting)
- [ ] Tables render as actual HTML tables, not markdown syntax
- [ ] Hovering an assistant message shows a copy button
- [ ] Code blocks have syntax highlighting + copy button

---

## Phase 2 — Document Scoping  *(3 hours)*

**Goal:** When user is on a specific document's page, queries answer ONLY from that document and retrieve ALL its chunks (no top-K filter).

### Backend changes

**`apps/worker/app/routes/query.py`**
- Add `document_id: str | None = None` to `QueryRequest`

**`apps/worker/app/services/retrieval/rag.py`**
- Add `document_id` parameter to `stream_query()` and `query()`
- When `document_id` is provided:
  - **Skip the hybrid search + RRF + score filter entirely**
  - Call new method `get_all_chunks_for_document(document_id)` from vectordb
  - Order chunks by `page_number ASC, chunk_index ASC`
  - Build context with framing: *"You are answering about ONE specific document. The complete content of this document is below."*

**`apps/worker/app/services/retrieval/vectordb.py`**
- New method: `get_all_chunks_for_document(document_id, tenant_id) -> list[dict]`
- SQL: `SELECT chunk_text, page_number, chunk_index FROM embeddings WHERE document_id = $1 AND tenant_id = $2 ORDER BY page_number, chunk_index`

### App-side changes

**`apps/web/src/app/api/query/route.ts`**
- Accept `documentId` in request body, forward to worker

**`apps/web/src/lib/clients/worker.ts`**
- Add `documentId` to `streamQuery` params

**`apps/web/src/app/dashboard/documents/[id]/page.tsx`**
- Add "Ask about this document" button (top-right, next to Download)
- Clicking it navigates to `/dashboard/query?docId=<id>&docTitle=<title>`

**`apps/web/src/app/dashboard/query/page.tsx`**
- Read `docId` from URL search params
- When present, show a pill at top: *"Asking about: [Document Title] × clear"*
- Include `documentId` in `/api/query` request body

### Acceptance criteria

- [ ] Clicking "Ask about this document" on any doc detail page opens query scoped to that doc
- [ ] The doc title is visible in the chat header
- [ ] Asking "list all parts" returns ALL 57 parts from MAIN AIR COMPRESSOR (no chunks dropped)
- [ ] Asking "what is in this document?" never references content from other documents
- [ ] User can clear the scope to go back to "all documents" mode

### Why this matters

This is the architectural fix that solves Problems 3 and 4 properly. Phase 1's prompt-tuning helps, but Phase 2 makes the model **incapable** of mixing documents because we only feed it one.

---

## Phase 3 — Chat History & Sessions  *(4-5 hours)*

**Goal:** Persistent multi-turn conversations like Claude/ChatGPT. Sessions sidebar, URLs you can bookmark, LLM sees previous turns.

### Database (new migration)

**`packages/db/migrations/003_chat_sessions.sql`** — new file:

```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vessel_id UUID REFERENCES vessels(id),          -- nullable: scope hint
  document_id UUID REFERENCES documents(id),       -- nullable: doc-scoped sessions
  title VARCHAR(255) NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,                       -- 'user' or 'assistant'
  content TEXT NOT NULL,
  sources JSONB,                                   -- array of {document_id, title, page}
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
```

**`apps/web/src/lib/db/schema.ts`** — add Drizzle table definitions matching the SQL.

### New API endpoints

**`apps/web/src/app/api/chat/sessions/route.ts`**
- `GET` — list current user's sessions (most recent first)
- `POST` — create new session, returns id

**`apps/web/src/app/api/chat/sessions/[id]/route.ts`**
- `GET` — fetch session + all messages
- `PATCH` — rename session
- `DELETE` — delete session

### Updates to existing query endpoint

**`apps/web/src/app/api/query/route.ts`**
- Accept `sessionId` in body
- If provided, fetch last 10 messages from `chat_messages`
- Pass `chat_history` array to worker
- After stream completes, save user message + assistant response to `chat_messages`
- Update `chat_sessions.updated_at`
- If session has no title yet, after first response: call LLM with "Generate a 5-word title for this conversation" and save

### Worker updates

**`apps/worker/app/routes/query.py`**
- Add `chat_history: list[dict] = []` to `QueryRequest` — each item `{role, content}`

**`apps/worker/app/services/retrieval/llm.py`** — each provider:
- Update `stream_answer` and `get_answer` signatures to accept `chat_history`
- Build messages array as: `[system, ...history, new_user_message]`
- Groq: pass directly in `messages=`
- Gemini: convert to Gemini's `contents` format
- Anthropic: pass in `messages=`

### Frontend

**`apps/web/src/app/dashboard/query/[sessionId]/page.tsx`** — new dynamic route

**`apps/web/src/components/chat/sessions-sidebar.tsx`** — new component:
- Lists past sessions grouped by Today / Yesterday / This week / Older
- Click → navigate to `/dashboard/query/[sessionId]`
- Active session highlighted
- "+ New chat" button at top
- Right-click context menu: Rename, Delete

**`apps/web/src/app/dashboard/query/page.tsx`** — refactor:
- Move chat UI to a reusable `<ChatInterface>` component
- This page becomes "new chat" (no sessionId yet — creates one on first message)

### Acceptance criteria

- [ ] Refreshing the page keeps the conversation
- [ ] Sessions sidebar lists past conversations with auto-generated titles
- [ ] Asking follow-up questions ("What about its weight?") works — LLM sees previous turns
- [ ] URL changes to `/dashboard/query/[sessionId]` and is bookmarkable
- [ ] Can rename and delete sessions
- [ ] Doc-scoped sessions show the doc title in the sidebar entry

---

## Phase 4 — Excel Export  *(3 hours, optional but high-value)*

**Goal:** The killer differentiator we discovered today — extract any table from a document and download as Excel. This is the CMMS/PMS data-entry workflow that Martech does manually.

### Backend

**`apps/worker/pyproject.toml`**
- Add `openpyxl>=3.1.0`

**`apps/worker/app/routes/documents.py`** — new file:
- `POST /api/documents/{document_id}/extract-table`
- Body: `{description: str}` — e.g. "the parts list with part numbers, names, and quantities"

**`apps/worker/app/services/extraction.py`** — new file:
- `extract_table(document_id, description, tenant_id) -> bytes`
- Retrieves ALL chunks for the document (same as Phase 2)
- Prompts LLM with: *"Extract the table the user described as JSON. Schema: array of objects. Return ONLY valid JSON, no commentary."*
- Parses JSON response
- Builds `.xlsx` with openpyxl
- Returns binary bytes

### Frontend

**`apps/web/src/app/dashboard/documents/[id]/page.tsx`**
- Add "Export table to Excel" button
- Modal asks: "Describe what to extract" (with examples: "parts list", "maintenance schedule", "spare parts catalog")
- Loading state while extraction runs (can take 10-30s)
- On success: triggers browser download of `.xlsx`

### Acceptance criteria

- [ ] Click "Export table" on MAIN AIR COMPRESSOR doc → get an .xlsx with all 57 parts
- [ ] Excel has proper column headers (Part-No, Designation, Quantity)
- [ ] Multilingual labels are handled (Designation column merges German/English/French or splits into 3 columns based on user prompt)

---

## Order of execution — strong recommendation

**Phase 1 → Phase 2 → Phase 3 → Phase 4**

Why this order:
1. **Phase 1 is risk-free quick wins** — surgical edits, no architecture change. Lets you re-test the extraction tonight.
2. **Phase 2 enables Phase 4** — Excel export needs the "get all chunks for document" method that Phase 2 builds.
3. **Phase 3 is the biggest scope** — needs a migration, new tables, 5 new endpoints, frontend refactor. Worth doing AFTER Phase 2 so the chat UI we refactor already has document scoping baked in.
4. **Phase 4 is optional sugar** — but it's the feature that turns NAUTOS from "Q&A on docs" into "automated data extraction", which is what Martech actually sells.

---

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Llama 3.3 70B may still produce incomplete tables even at 8K tokens for very long docs | Phase 2's "get all chunks" makes this rare; for extreme cases, Phase 4's structured extraction is more reliable than chat |
| Chat history makes prompt context huge over time → cost + latency | Cap history at 10 messages; truncate older ones; consider summarizing if hit limit |
| Excel export with bad schema produces malformed JSON from LLM | Use Pydantic for response validation; retry with explicit schema if JSON parse fails |
| Phase 3 migration affects production data | Migration is additive (new tables only), no risk to existing data |
| Document scoping breaks "search across vessels" use case | Keep both modes — scoped (when docId in URL) and unscoped (default) |

---

## Estimated total: ~12 hours focused work

Reasonable to do over 2-3 sessions:
- **Session A (today/tomorrow):** Phase 1 + 2 = 4 hours
- **Session B:** Phase 3 = 4-5 hours
- **Session C:** Phase 4 = 3 hours
