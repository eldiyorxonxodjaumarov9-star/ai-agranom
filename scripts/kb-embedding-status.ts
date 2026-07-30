#!/usr/bin/env npx tsx
/**
 * Embedding coverage status
 *
 *   npm run kb:embedding-status
 */
import "dotenv/config";
import { getEmbeddingStats } from "../server/kb/db/embedding-stats";
import { checkDatabaseHealth, getPrisma } from "../server/kb/db/client";

async function main() {
  const health = await checkDatabaseHealth();
  const stats = await getEmbeddingStats();
  console.log(
    JSON.stringify(
      {
        ok: true,
        health: {
          database: health.database,
          pgvector: health.pgvector,
          knowledgeBaseMode: health.knowledgeBaseMode,
        },
        embeddings: stats || {
          totalChunks: 0,
          embedded: 0,
          pending: 0,
          failed: 0,
          coveragePercent: 0,
          vectorIndexReady: false,
          lastReindexAt: null,
        },
      },
      null,
      2
    )
  );
  await getPrisma()?.$disconnect();
  if (stats && stats.pending > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
