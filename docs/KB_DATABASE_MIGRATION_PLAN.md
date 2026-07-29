# Knowledge Base → PostgreSQL Migration Plan

**Date:** 2026-07-30  
**Commit intent:** Migrate knowledge base to PostgreSQL and expand verified agronomy corpus

## Current state

- Runtime source of truth: committed TypeScript corpus (`server/kb/corpus/*`) + file/memory overlays
- Prisma schema exists as draft; **no** `@prisma/client` in dependencies; **no** live `DATABASE_URL`
- RAG works on VERIFIED corpus chunks (~2200)

## Target state

1. PostgreSQL + Prisma + `vector` + `pg_trgm` + `unaccent` as primary store  
2. Corpus remains **emergency fallback only** when DB unavailable  
3. Chat/API never breaks during migration  

## Phases

### PHASE 3.1 — Database foundation (this release)

| Item | Deliverable |
|------|-------------|
| Prisma schema (full entity set) | `prisma/schema.prisma` |
| SQL migration + extensions | `prisma/migrations/...` |
| Lazy Prisma client | `server/kb/db/client.ts` (null if no `DATABASE_URL`) |
| Corpus → DB migrator | `npm run kb:migrate-corpus` (idempotent) |
| Database-first retrieval | `retrieve.ts` → DB then corpus |
| Health enrichment | `database`, `pgvector`, `knowledgeBaseMode`, `recordCounts` |
| Env docs | `.env.example` |

**If `DATABASE_URL` unset:** deploy continues; mode = `corpus_fallback`; report `DATABASE_URL_REQUIRED`.

### PHASE 3.2 — Entity expansion

- Curated disease/pest growth (real attributed summaries only)
- Symptom + treatment entities in DB schema + migrator mapping

### PHASE 3.3 — Chunks / embeddings / indexes

- Richer chunk sections (not duplicate padding)
- Embedding jobs table + reindex CLI
- Vector / GIN / trigram indexes in SQL

### PHASE 3.4 — Product verification + admin

- Strict product verification pipeline
- Chat recommends only VERIFIED+ACTIVE+labelVerified
- Admin dashboard wired to DB when connected

## Non-negotiables

- No fake inventory inflation  
- No Google SERP scraping  
- `POST /api/agronom/chat` contract unchanged  
- Secrets never in frontend / git / logs  

## Rollback

1. Unset `DATABASE_URL` or set `KB_FORCE_CORPUS=1`  
2. RAG falls back to committed corpus  
3. Chat remains online  
