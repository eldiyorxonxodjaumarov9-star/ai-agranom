# KB expansion & audit remediation

See [KB_AUDIT_REPORT.md](./KB_AUDIT_REPORT.md).

## What changed

- Critical fixes: request-scoped RAG result (no cross-request citation race), embedding invalidation on checksum change, ingest cannot auto-VERIFIED without `allowVerify`, products/treatments never auto-VERIFIED, cron timing-safe auth + logs, conflict idempotency.
- Curated multilingual corpus committed in code (`server/kb/corpus/*`) so Vercel cold starts still have a large VERIFIED KB.
- Import queue (`server/kb/sync/queue.ts`) with idempotency + retry/backoff.
- Admin actions API: `/api/admin/kb/actions` (approve/reject/enqueue/dashboard).
- Prisma schema expanded for Postgres/pgvector/trgm — activate when `DATABASE_URL` is set.

## Corpus counts (curated, attributed — not scraped)

Run `npm run kb:corpus-stats`.

Typical: 50+ crops, 90+ diseases, 50+ pests, ~2200 KnowledgeChunks (5 languages × sections).

**Why not 5000+ yet:** No licensed bulk FAO/EPPO dump wired; we refuse Google SERP scraping and refuse synthetic fake rows. Next growth = more curated entities + Postgres-backed official adapter batches.

## Postgres

1. Provision Postgres with `vector` + `pg_trgm`
2. Set `DATABASE_URL`
3. `npx prisma generate && npx prisma migrate deploy`
4. Wire Prisma store (next iteration) — until then corpus seeds remain source of truth on Vercel
