# Knowledge Base Phase 2 — Official adapters & scheduled sync

See also: [KB_RAG_PLAN.md](./KB_RAG_PLAN.md) · [KB_PHASE1.md](./KB_PHASE1.md)

## What ships

- Source adapters: `FAOAdapter`, `EPPOAdapter`, `USDAAdapter`, `KazakhstanOfficialRegistryAdapter`
- Each implements: `fetchIndex`, `fetchItem`, `parseItem`, `normalizeItem`, `validateItem`, `saveItem`, `run`
- Curated allowlisted official catalogs under `server/kb/catalogs/` (no Google SERP scraping)
- Optional live freshness checks: `KB_LIVE_FETCH=1` → conditional GET with ETag / Last-Modified / checksum
- Normalization (scientific name, synonyms, EPPO code) + deduplication + conflict queue
- Reliability scoring (official registry > FAO/EPPO/USDA > extension)
- Sync jobs + failed imports persistence
- Admin UI: `/admin/kb`
- Vercel crons → `/api/cron/kb-sync?kind=...`

## Schedules (UTC)

| Kind | Cron | Path |
|------|------|------|
| diseases | weekly Mon 03:00 | `/api/cron/kb-sync?kind=diseases` |
| pests | weekly Mon 04:00 | `/api/cron/kb-sync?kind=pests` |
| product_registry | daily 02:00 | `/api/cron/kb-sync?kind=product_registry` |
| broken_links | weekly Sun 05:00 | `/api/cron/kb-sync?kind=broken_links` |

Auth for cron: `Authorization: Bearer $CRON_SECRET` (or `AGRO_API_KEY`).

## Commands

```bash
npm run kb:sync -- --kind full
npm run test:kb-phase2
```

## Admin API views

`GET /api/admin/kb?view=`

- `sync-jobs` · `failed` · `duplicates` · `conflicts` · `pending` · `source-status` · `adapters`

`POST /api/admin/kb/sync` `{ "kind": "full" }`

## Safety

- Only `allowedForIngestion` registry sources
- Product/treatment imports stay `NEEDS_REVIEW`
- Crawl delay + timeout + retry on live fetch
- robots.txt helper available before expanding URL sets
- Public `POST /api/agronom/chat` unchanged
