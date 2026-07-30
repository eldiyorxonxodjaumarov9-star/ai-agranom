#!/usr/bin/env npx tsx
/**
 * Production retrieval mode smoke (read-only against live API chat is NOT used —
 * exercises server retrieveKnowledge when DATABASE_URL is available).
 *
 * Prefer: npx vercel env run -e production -- npx tsx scripts/prod-retrieval-smoke.ts
 * Never logs secrets.
 */
import "dotenv/config";
import { retrieveKnowledge } from "../server/kb/retrieve";
import { checkDatabaseHealth, getRecordCounts } from "../server/kb/db/client";
import { getEmbeddingStats } from "../server/kb/db/embedding-stats";

async function one(label: string, query: string, language?: string) {
  process.env.KB_RETRIEVAL_DEBUG = "1";
  const start = Date.now();
  const rag = await retrieveKnowledge(query, { limit: 5, language });
  return {
    label,
    language: language || "auto",
    ms: Date.now() - start,
    hits: rag.chunks.length,
    topScore: rag.chunks[0]?.score ?? 0,
    topVector: rag.chunks[0]?.vectorScore ?? 0,
    topKeyword: rag.chunks[0]?.keywordScore ?? 0,
    confidence: rag.confidence,
    modeHint:
      (rag.chunks[0]?.vectorScore ?? 0) > 0.28
        ? "vector_likely"
        : (rag.chunks[0]?.keywordScore ?? 0) > 0
          ? "keyword_or_exact"
          : "weak",
  };
}

async function main() {
  const health = await checkDatabaseHealth();
  const counts = await getRecordCounts();
  const emb = await getEmbeddingStats();

  const cases = [
    await one("uz_semantic", "Pomidor barglarida oq unsimon dog'lar paydo bo'ldi", "uz"),
    await one("ru_semantic", "Жёлтая ржавчина пшеницы что делать", "ru"),
    await one("kk_semantic", "Алмада қара дақтар бар", "kk"),
    await one("ky_semantic", "Картошка жалбырагы саргайып жатат", "ky"),
    await one("scientific", "Phytophthora infestans", "en"),
    await one("synonym", "late blight tomato", "en"),
    await one("typo", "phytophthora infestans tomatto blight", "en"),
  ];

  const vectorish = cases.filter((c) => c.modeHint === "vector_likely").length;
  const report = {
    ok: health.database === "connected" && (emb?.embedded || 0) > 0,
    health: {
      database: health.database,
      knowledgeBaseMode: health.knowledgeBaseMode,
    },
    recordCounts: counts,
    embeddings: emb,
    cases,
    vectorLikelyCount: vectorish,
    note:
      (emb?.coveragePercent || 0) < 100
        ? "Embedding coverage incomplete — vector mode not proven"
        : vectorish >= 3
          ? "Semantic cases show vector_likely scores"
          : "Embeddings present but vector scores weak — check reindex",
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok && vectorish >= 3 ? 0 : 2);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
