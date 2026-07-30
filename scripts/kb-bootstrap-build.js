/**
 * Build-time corpus seed is OPT-IN only.
 * Full 10k+ upserts exceed typical Vercel build budgets — use
 * POST /api/admin/kb/bootstrap (checkpoint/resume) or cron instead.
 *
 * Enable with: KB_MIGRATE_CORPUS_ON_BUILD=1
 */
const { execSync } = require("child_process");

function pickUrl() {
  return (
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    ""
  );
}

const url = pickUrl();
const enabled = process.env.KB_MIGRATE_CORPUS_ON_BUILD === "1";

if (!enabled) {
  console.log(
    "[kb-bootstrap-build] skip (set KB_MIGRATE_CORPUS_ON_BUILD=1 to seed during build; prefer /api/admin/kb/bootstrap)"
  );
  process.exit(0);
}

if (!/^postgres(ql)?:\/\//i.test(url)) {
  console.warn("[kb-bootstrap-build] skip — no postgresql URL");
  process.exit(0);
}

const env = { ...process.env, DATABASE_URL: url };
console.log("[kb-bootstrap-build] running kb:migrate-corpus …");
try {
  execSync("npx tsx scripts/kb-migrate-corpus.ts", {
    stdio: "inherit",
    env,
  });
} catch (err) {
  console.error(
    "[kb-bootstrap-build] corpus migrate failed (non-fatal):",
    err.message
  );
  process.exit(0);
}
