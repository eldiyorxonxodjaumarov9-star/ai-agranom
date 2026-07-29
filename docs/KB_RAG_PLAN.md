# Agro Olam Knowledge Base & RAG — Implementation Plan

## Current state (Phase 1 shipping)

- Live chat uses `KnowledgeRagProvider` via `retrieveContext()` → verified KB context in the system prompt.
- File-backed store under `data/kb/` + curated seeds in `server/kb/seed.ts` (no Postgres required).
- Marketplace catalog remains static TS (`lib/platform/marketplace-catalog.ts`).
- Public API contract: `POST /api/agronom/chat` stays backward-compatible.

## Architecture (target)

```
User message / images
  → language + crop + symptom extract
  → hybrid retrieval (vector + keyword + filters)
  → verified KnowledgeChunks + Sources
  → AI context (citations required)
  → answer + optional diagnosis/products/sources
  → Marketplace product match (catalog IDs only)
```

No model fine-tuning. RAG only.

## Phases

### PHASE 1 (this release) — Foundation

| Deliverable | Status |
|-------------|--------|
| TypeScript domain schema (Crop, Disease, Pest, Symptom, Treatment, Product, Source, KnowledgeChunk, …) | Shipping |
| Source registry (allowed official sources only) | Shipping |
| File-backed store + seed verified chunks | Shipping |
| Manual JSON/CSV ingestion CLI | Shipping |
| Embeddings (OpenAI) + hybrid search | Shipping |
| Pluggable `KnowledgeRagProvider` behind existing `retrieveContext` | Shipping |
| Citation rules in system prompt | Shipping |
| Optional response fields (`sources`, `confidence`, …) — backward compatible | Shipping |
| Protected admin import API | Shipping |
| Prisma schema draft for future Postgres/pgvector | Shipping |
| Docs + tests | Shipping |

**Runtime without Postgres:** Phase 1 uses `data/kb/` JSON store so Vercel keeps working. When `DATABASE_URL` is added later, Phase 2 swaps the store.

### PHASE 2 — Official adapters & sync

- FAO / EPPO / USDA adapters (license-checked)
- Scheduled sync, checksum/ETag, normalization, dedup

### PHASE 3 — Multimodal diagnosis

- Image upload pipeline, symptom extraction, differential diagnosis, confidence

### PHASE 4 — Product registry & treatments

- Official PPP registry (KZ), label validation, Marketplace matching, safety gates

### PHASE 5 — Admin verification & hardening

- Full admin UI, VERIFIED workflow, monitoring, analytics

## Non-negotiables

- Do not change `POST /api/agronom/chat` URL or required request/response fields.
- Never put `OPENAI_API_KEY` / `AGRO_API_KEY` in the frontend.
- Never invent doses or unregistered products.
- Only ingest sources with `allowedForIngestion: true`.
- Unpublished chunks stay `DRAFT` / `NEEDS_REVIEW` until `VERIFIED`.

## Insertion points

1. `server/kb/*` — domain, store, retrieval, ingestion  
2. `server/rag/provider.ts` — register `KnowledgeRagProvider`  
3. `server/prompts/system.ts` — RAG citation + safety rules  
4. `lib/agronom/chat-handler.ts` / `api-types.ts` — optional response enrichment  
5. `app/api/admin/kb/*` — Bearer-protected import/list  

## Safety defaults

- Low retrieval confidence → ask for more info; do not assert a single diagnosis.  
- Treatment doses only if chunk is VERIFIED and cites an official label.  
- Always list sources used in the answer.
