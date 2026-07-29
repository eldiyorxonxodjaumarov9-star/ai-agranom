# Knowledge Base Audit Report

**Date:** 2026-07-30  
**Scope:** Agro Olam AI Dehqon KB / RAG / adapters / admin / cron  
**Environment:** Next.js on Vercel (Hobby), file+seed store, Prisma draft unused

## Executive summary

Production chat RAG works on **~8 VERIFIED seed chunks** only. Phase 2 sync/adapters look complete locally but **do not durable-persist on Vercel**, and synced rows stay `AI_PARSED` so they **never enter retrieval**. Prisma/pgvector is scaffolding only until `DATABASE_URL` is provisioned.

Typecheck / unit tests / build were green at audit time. Lint: existing React `<img>` / hook warnings only (non-blocking).

---

## Critical findings

| ID | Issue | Cause | Impact | Fix plan |
|----|--------|-------|--------|----------|
| C1 | Imports/sync do not persist on Vercel | `store.ts` / `sync/persist.ts` write to gitignored FS; serverless FS read-only; silent catch | KB cannot grow beyond seeds after cold start | Dual store: commit expanded corpus in code + optional Postgres when `DATABASE_URL` set |
| C2 | Synced chunks never used in RAG | Adapters save `AI_PARSED`; `getVerifiedChunks()` filters `VERIFIED` only; no approve API | Sync is operational theater for chat quality | Curated corpus as `VERIFIED`; admin approve/reject; chemical stays `NEEDS_REVIEW` |
| C3 | Stale embeddings after update | `ensureChunkEmbeddings` skips existing ids; upsert does not invalidate | Wrong vector ranking after content change | Invalidate embedding when checksum changes |
| C4 | Cross-request RAG metadata race | Module-global `lastResult` in `provider.ts` | Wrong `sources`/`confidence` under concurrency | Request-scoped result (ALS / return with retrieve) |
| C5 | No production Postgres | No `@prisma/client`, no migrations, unused schema | Cannot meet durable large-KB requirement | Full schema + migration SQL; runtime switch on `DATABASE_URL` |

## High risks

| ID | Issue | Fix |
|----|--------|-----|
| H1 | Cron fails if `CRON_SECRET` unset | Document + constant-time auth; accept Vercel cron header |
| H2 | Cron/admin sync can exceed 60s (`broken_links`) | Queue + batch workers; lower HEAD concurrency |
| H3 | No rate limit on admin/cron | Add simple rate limit |
| H4 | Admin can POST `VERIFIED` for non-chemical entities | Gate: only agronom role / force `NEEDS_REVIEW` unless `forceVerify` |
| H5 | Concurrent upsert lost updates | Mutex / serial queue per isolate |
| H6 | Dedup conflicts re-appended every sync | Idempotent conflict ids |
| H7 | Soft-merge false positives on shared crop keywords | Tighten overlap (require scientific or EPPO) |

## Medium

- Sync `kind=diseases|pests` ignores type filter  
- `isPathAllowedByRobots` unused  
- Streaming chat omits sources/confidence  
- Catalog paraphrases must stay clearly curated (not scraped full pages)  
- Target 5,000+ chunks requires committed corpus or Postgres — not live mass scrape  

## What works

- Hybrid keyword + embedding retrieval with embedding fallback  
- Treatment/product cannot auto-VERIFIED  
- Source registry `allowedForIngestion` gate  
- Bearer auth on admin API  
- Offline adapter/dedup/sync tests  
- Public chat API contract stable  

## Runtime truth

| Component | Status |
|-----------|--------|
| Seed VERIFIED chunks | Live in RAG |
| Phase 2 adapters/catalogs | Code present; durable effect = none on Vercel without corpus commit / DB |
| Prisma + pgvector | Draft only |
| Cron | Configured in `vercel.json`; needs `CRON_SECRET` |

## Target inventory vs honest capacity

User asked for 50+ crops, 300+ diseases, 200+ pests, 1000+ symptoms, 5000+ chunks **from real licensed sources without Google scraping**.

**Constraint:** We will not invent fake rows or scrape SERPs. Expansion uses **curated, attributed agronomic summaries** (FAO/EPPO/extension-style provenance) committed as corpus modules, plus optional Postgres for future live adapters.

If live official bulk APIs / licensed dumps are not available, report will state achieved curated counts honestly.

## Remediation status (2026-07-30)

| ID | Status |
|----|--------|
| C1 | Mitigated: large curated corpus committed in `server/kb/corpus/*` (Vercel-durable). Postgres schema ready; live Prisma store awaits `DATABASE_URL`. |
| C2 | Fixed for corpus: chunks ship as VERIFIED (cultural/prevention). Products stay NEEDS_REVIEW. Admin approve API added. |
| C3 | Fixed: `invalidateEmbeddings` on checksum change |
| C4 | Fixed: RAG result returned with answer (no shared global for citations) |
| C5 | Schema + migration skeleton shipped; migrate when DB provisioned |

### Achieved curated inventory

- Crops: 54
- Diseases: 94
- Pests: 50
- KnowledgeChunks: ~2200 (multilingual)
- Active ingredient classes (NEEDS_REVIEW): 10

### Target gap (honest)

5000+ chunks / 300+ diseases / 200+ pests not reached: requires licensed bulk sources or continued curated authoring — **not** synthetic inflation or Google scraping.
