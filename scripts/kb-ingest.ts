#!/usr/bin/env npx tsx
/**
 * Manual KB ingestion CLI (Phase 1)
 *
 *   npx tsx scripts/kb-ingest.ts --json data/kb/samples/sample-import.json
 *   npx tsx scripts/kb-ingest.ts --csv path/to/file.csv
 *   npx tsx scripts/kb-ingest.ts --seed-stats
 */
import { ingestCsvFile, ingestJsonFile, getVerifiedChunks, loadChunks } from "../server/kb";

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--seed-stats")) {
    console.log(
      JSON.stringify(
        {
          verified: getVerifiedChunks().length,
          total: loadChunks().length,
        },
        null,
        2
      )
    );
    return;
  }

  const jsonIdx = args.indexOf("--json");
  if (jsonIdx >= 0 && args[jsonIdx + 1]) {
    const result = ingestJsonFile(args[jsonIdx + 1]);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const csvIdx = args.indexOf("--csv");
  if (csvIdx >= 0 && args[csvIdx + 1]) {
    const result = ingestCsvFile(args[csvIdx + 1]);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Usage:
  npx tsx scripts/kb-ingest.ts --json <file>
  npx tsx scripts/kb-ingest.ts --csv <file>
  npx tsx scripts/kb-ingest.ts --seed-stats`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
