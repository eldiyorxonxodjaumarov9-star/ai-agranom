/**
 * Optional corpus bootstrap during Vercel build (real env available there).
 * Skips when DATABASE_URL is missing/invalid.
 * On Vercel: seeds only when KnowledgeChunk table is empty (idempotent).
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
const enabled =
  process.env.KB_MIGRATE_CORPUS_ON_BUILD === "1" ||
  process.env.VERCEL === "1";

if (!enabled) {
  console.log(
    "[kb-bootstrap-build] skip (not Vercel / set KB_MIGRATE_CORPUS_ON_BUILD=1)"
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
  // Don't fail the whole site deploy if corpus seed fails — tables still exist
  console.error(
    "[kb-bootstrap-build] corpus migrate failed (non-fatal):",
    err.message
  );
  process.exit(0);
}
