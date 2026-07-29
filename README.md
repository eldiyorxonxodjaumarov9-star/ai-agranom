# Agro Olam — AI Dehqon / AI Agronom

Next.js app + public agronom chat API for Agro Olam (Kazakhstan market).

Production: https://ai-agranom.vercel.app

## Public API (stable)

`POST /api/agronom/chat`

```json
{ "message": "...", "language": "auto", "sessionId": "..." }
```

Response (required fields):

```json
{
  "success": true,
  "answer": "...",
  "language": "kk",
  "service": "agro-olam-ai-agronom"
}
```

Optional backward-compatible fields: `region`, `crop`, `greenhouse`, `imageIds` on request; `sources`, `confidence`, `products`, `requiresExpertReview` on response.

Auth: `Authorization: Bearer <AGRO_API_KEY>` (server-only). Never put `OPENAI_API_KEY` or `AGRO_API_KEY` in the frontend.

## Knowledge Base & RAG (Phase 1)

Verified agronomy chunks + hybrid retrieval (keyword + embeddings). See:

- [docs/KB_RAG_PLAN.md](docs/KB_RAG_PLAN.md) — roadmap
- [docs/KB_PHASE1.md](docs/KB_PHASE1.md) — Phase 1 usage

```bash
npm run kb:stats
npm run test:kb
npx tsx scripts/kb-ingest.ts --json data/kb/samples/sample-import.json
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
```

## Environment

Copy `.env.example` → `.env.local` and set `OPENAI_API_KEY`, `AGRO_API_KEY`.
