#!/usr/bin/env npx tsx
/**
 * Reindex helper — reports DB/corpus status and ensures embeddings cache
 * can rebuild for verified chunks (keyword path always works).
 */
import "dotenv/config";
import { corpusStats } from "../server/kb/corpus/build";
import {
  checkDatabaseHealth,
  getRecordCounts,
} from "../server/kb/db/client";
import { getVerifiedChunks, resetKbMemory } from "../server/kb/store";
import { ensureChunkEmbeddings } from "../server/kb/embeddings";
import { searchChunksInDb } from "../server/kb/db/chunks";

async function main() {
  resetKbMemory();
  const health = await checkDatabaseHealth();
  const dbCounts = await getRecordCounts();
  const corpus = corpusStats();

  let sample = 0;
  if (health.knowledgeBaseMode === "database") {
    const rows = await searchChunksInDb("Phytophthora tomato", { limit: 5 });
    sample = rows?.length ?? 0;
  } else {
    const chunks = getVerifiedChunks().slice(0, 20);
    await ensureChunkEmbeddings(chunks);
    sample = chunks.length;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        health,
        recordCounts: dbCounts,
        corpus,
        reindexSample: sample,
        DATABASE_URL_REQUIRED: health.error === "DATABASE_URL_REQUIRED",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
