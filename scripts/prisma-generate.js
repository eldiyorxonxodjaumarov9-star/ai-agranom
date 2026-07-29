/**
 * Ensures prisma generate works without a live DATABASE_URL.
 * Production must still set a real DATABASE_URL for migrate/runtime.
 */
const { execSync } = require("child_process");

const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/ai_agranom?schema=public",
};

try {
  execSync("npx prisma generate", { stdio: "inherit", env });
} catch (err) {
  console.warn("[postinstall] prisma generate failed (non-fatal):", err.message);
  process.exit(0);
}
