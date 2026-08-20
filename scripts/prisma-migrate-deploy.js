/**
 * Neon-safe Prisma migrate helper for local CLI and Vercel build.
 * Prefers DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING.
 * Schema has no directUrl — DIRECT_URL is not required.
 *
 * Safety: never auto-migrate on Vercel Preview (or shared prod DB).
 * Set RUN_DB_MIGRATIONS=true only for an intentional Production migrate step.
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

function migrationsExplicitlyEnabled() {
  const v = String(process.env.RUN_DB_MIGRATIONS || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function isVercelPreview() {
  return process.env.VERCEL_ENV === "preview";
}

function main() {
  if (!migrationsExplicitlyEnabled()) {
    console.warn(
      "[prisma-migrate-deploy] skip — RUN_DB_MIGRATIONS not set to true (preview-safe; production migrate requires explicit flag)"
    );
    process.exit(0);
  }

  if (isVercelPreview()) {
    console.warn(
      "[prisma-migrate-deploy] skip — Vercel Preview must not migrate (shared/prod DB risk)"
    );
    process.exit(0);
  }

  const url = pickMigrateUrl();
  if (!looksLikePg(url)) {
    console.warn(
      "[prisma-migrate-deploy] skip — no postgresql:// URL (corpus fallback remains available)"
    );
    process.exit(0);
  }

  const env = { ...process.env, DATABASE_URL: url };
  console.log(
    "[prisma-migrate-deploy] RUN_DB_MIGRATIONS=true; using",
    process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING
      ? "unpooled"
      : "pooled",
    "DATABASE_URL"
  );
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
}

main();
