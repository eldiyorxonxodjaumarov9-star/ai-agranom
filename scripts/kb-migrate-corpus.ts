#!/usr/bin/env npx tsx
/**
 * Idempotent corpus → PostgreSQL migration.
 *
 *   npm run kb:migrate-corpus
 */
import "dotenv/config";
import { migrateCorpusToDatabase } from "../server/kb/db/migrate-corpus";
import { getPrisma } from "../server/kb/db/client";

async function main() {
  try {
    const report = await migrateCorpusToDatabase();
    console.log(JSON.stringify({ ok: true, ...report, errors: report.errors.slice(0, 20) }, null, 2));
    await getPrisma()?.$disconnect();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        ok: false,
        error: msg,
        hint:
          msg === "DATABASE_URL_REQUIRED"
            ? "Set DATABASE_URL (Neon), then: npm run prisma:migrate:deploy && npm run kb:migrate-corpus"
            : undefined,
      })
    );
    process.exit(msg === "DATABASE_URL_REQUIRED" ? 2 : 1);
  }
}

main();
