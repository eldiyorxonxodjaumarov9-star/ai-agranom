#!/usr/bin/env npx tsx
/**
 * KB reindex CLI
 *
 *   npm run kb:reindex -- --mode embeddings
 *   npm run kb:reindex -- --mode embeddings --force
 *   npm run kb:reindex -- --mode embeddings --dry-run
 *   npm run kb:reindex -- --mode status
 */
import "dotenv/config";
import {
  reindexEmbeddings,
  resetEmbeddingCheckpoint,
} from "../server/kb/db/embeddings-reindex";
import { getEmbeddingStats } from "../server/kb/db/embedding-stats";
import {
  checkDatabaseHealth,
  getRecordCounts,
  getPrisma,
} from "../server/kb/db/client";
import { corpusStats } from "../server/kb/corpus/build";
import { searchChunksInDb } from "../server/kb/db/chunks";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const mode = arg("--mode") || (hasFlag("--mode") ? "status" : "status");
  const force = hasFlag("--force");
  const dryRun = hasFlag("--dry-run");
  const reset = hasFlag("--reset-checkpoint");
  const limit = arg("--limit") ? Number(arg("--limit")) : undefined;
  const batchSize = arg("--batch") ? Number(arg("--batch")) : undefined;

  if (mode === "embeddings" || mode === "embed") {
    if (reset) await resetEmbeddingCheckpoint();
    const report = await reindexEmbeddings({
      force,
      dryRun,
      limit,
      batchSize,
    });
    console.log(JSON.stringify({ ok: true, mode: "embeddings", ...report }, null, 2));
    await getPrisma()?.$disconnect();
    process.exit(report.pending === 0 && report.failed === 0 ? 0 : 2);
  }

  // default / status
  const health = await checkDatabaseHealth();
  const dbCounts = await getRecordCounts();
  const embed = await getEmbeddingStats();
  const corpus = corpusStats();
  let sample = 0;
  if (health.knowledgeBaseMode === "database") {
    const rows = await searchChunksInDb("Phytophthora tomato", { limit: 5 });
    sample = rows?.length ?? 0;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: "status",
        health,
        recordCounts: dbCounts,
        embeddings: embed,
        corpus,
        reindexSample: sample,
      },
      null,
      2
    )
  );
  await getPrisma()?.$disconnect();
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(JSON.stringify({ ok: false, error: msg }));
  process.exit(msg === "DATABASE_URL_REQUIRED" ? 2 : 1);
});
