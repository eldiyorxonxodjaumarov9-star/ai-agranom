# Knowledge Base (Phase 1)

See also: [KB_RAG_PLAN.md](./KB_RAG_PLAN.md)

## What ships in Phase 1

- Curated **VERIFIED** agronomy chunks (`server/kb/seed.ts`)
- Source registry (FAO, EPPO, USDA extension, KZ PPP placeholder, Agro Olam catalog)
- File store: `data/kb/chunks.json`, `sources.json`, `embeddings.json`
- Hybrid retrieval: keyword + OpenAI embeddings (falls back to keyword if embed fails)
- Wired into live chat via `retrieveContext()` → system prompt `VERIFIED_KB`
- Optional API fields: `sources`, `confidence`, `products`, `requiresExpertReview`
- Admin import: `GET|POST /api/admin/kb` (Bearer `AGRO_API_KEY`)
- Prisma schema draft for Postgres/pgvector (not required at runtime yet)

## Commands

```bash
# Stats
npx tsx scripts/kb-ingest.ts --seed-stats

# Import JSON (status defaults to NEEDS_REVIEW; treatments never auto-VERIFIED)
npx tsx scripts/kb-ingest.ts --json data/kb/samples/sample-import.json

# Tests
npx tsx scripts/test-kb-rag.ts
```

## Admin API

```bash
curl -H "Authorization: Bearer $AGRO_API_KEY" \
  "https://ai-agranom.vercel.app/api/admin/kb?view=verified"

curl -X POST -H "Authorization: Bearer $AGRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"chunks":[...]}' \
  https://ai-agranom.vercel.app/api/admin/kb
```

## Safety

- AI must cite sources from retrieved chunks
- No invented dosages
- Unregistered products not recommended
- Low confidence → clarifying questions / expert review flag

## Next phases

Phase 2: FAO/EPPO adapters + Postgres  
Phase 3: image diagnosis  
Phase 4: PPP registry + Marketplace matching  
Phase 5: Admin verification UI
