#!/usr/bin/env npx tsx
/**
 * Phase 2 sync CLI
 *
 *   npx tsx scripts/kb-sync.ts --kind full
 *   npx tsx scripts/kb-sync.ts --kind diseases
 *   npx tsx scripts/kb-sync.ts --kind product_registry
 */
import { runSyncJob } from "../server/kb/sync/runner";
import type { SyncJobKind } from "../server/kb/adapters/types";

async function main() {
  const args = process.argv.slice(2);
  const kindIdx = args.indexOf("--kind");
  const kind = (kindIdx >= 0 ? args[kindIdx + 1] : "full") as SyncJobKind;
  const job = await runSyncJob({ kind, triggeredBy: "manual" });
  console.log(JSON.stringify(job, null, 2));
  process.exit(job.status === "failed" ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
