/**
 * Neon-safe Prisma migrate helper for local CLI and Vercel build.
 * Prefers DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING.
 * Schema has no directUrl — DIRECT_URL is not required.
 */
const { execSync } = require("child_process");

function pickMigrateUrl() {
  return (
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function looksLikePg(url) {
  return /^postgres(ql)?:\/\//i.test(String(url || ""));
}

function main() {
  const url = pickMigrateUrl();
  if (!looksLikePg(url)) {
    console.warn(
      "[prisma-migrate-deploy] skip — no postgresql:// URL (corpus fallback remains available)"
    );
    process.exit(0);
  }

  const env = { ...process.env, DATABASE_URL: url };
  console.log(
    "[prisma-migrate-deploy] using",
    process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING
      ? "unpooled"
      : "pooled",
    "DATABASE_URL"
  );
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
}

main();
