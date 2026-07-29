#!/usr/bin/env npx tsx
import { corpusStats } from "../server/kb/corpus/build";
import { checkDatabaseHealth, getRecordCounts } from "../server/kb/db/client";

async function main() {
  const corpus = corpusStats();
  const db = await checkDatabaseHealth();
  const counts = await getRecordCounts();
  console.log(
    JSON.stringify(
      {
        corpus,
        database: db,
        recordCounts: counts,
        DATABASE_URL_REQUIRED: db.error === "DATABASE_URL_REQUIRED",
      },
      null,
      2
    )
  );
}

main();
