# KB Expansion Report (updated)

## Inventory goals vs delivery

| Metric | Target | Achieved | Gap |
|--------|--------|----------|-----|
| Crops | 50+ | **54** | Met |
| Diseases | 300–500 | **191** | Missing licensed bulk EPPO/FAO dump; no scraping |
| Pests | 150–300 | **113** | Same |
| KnowledgeChunks | 10_000+ | **~6195** | Scales with entity count; no duplicate padding |
| Symptom chunks | 1_000+ | **~2475** | Met (chunk-level) |
| Treatment/prevention chunks | 1_000+ | **~955** | Near; expands with more diseases |
| Verified products | many | **0** | Registry checklist not satisfied (correct) |

## Database

- Prisma 5 schema + full SQL migration with `vector`, `pg_trgm`, `unaccent`
- Runtime: **database-first** when real `DATABASE_URL` set; else **corpus_fallback**
- `npm run kb:migrate-corpus` — idempotent corpus → Postgres
- Health reports `DATABASE_URL_REQUIRED` when unset

## Next steps for targets

1. Provision Neon/Supabase Postgres; set `DATABASE_URL` + `DIRECT_URL` on Vercel  
2. `npx prisma migrate deploy`  
3. `npm run kb:migrate-corpus`  
4. Connect official KZ PPP registry for product VERIFIED  
5. Continue curated entity authoring or licensed open datasets only  
