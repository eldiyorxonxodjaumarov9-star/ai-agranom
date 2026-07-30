/**
 * Runtime vs migration database URL split.
 * Runtime handlers MUST use pooled URL only.
 * Unpooled is only for migrate/CLI scripts via getMigrationDatabaseUrl().
 */
function isUsablePgUrl(url: string): boolean {
  if (!/^postgres(ql)?:\/\//i.test(url)) return false;
  if (url.includes("YOUR_") || url.includes("user:pass@host")) return false;
  if (url === "[SENSITIVE]" || url.includes("[SENSITIVE]")) return false;
  if (
    /postgres:postgres@localhost/i.test(url) &&
    process.env.KB_ALLOW_LOCAL_DB !== "1"
  ) {
    return false;
  }
  return true;
}

/** Pooled / Prisma runtime URL — never fall through to unpooled. */
export function resolveRuntimeDatabaseUrl(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
  ];
  for (const c of candidates) {
    const url = c?.trim();
    if (url && isUsablePgUrl(url)) return url;
  }
  return "";
}

/** Unpooled URL for migrations / long DDL only. */
export function resolveMigrationDatabaseUrl(): string {
  const candidates = [
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
  ];
  for (const c of candidates) {
    const url = c?.trim();
    if (url && isUsablePgUrl(url)) return url;
  }
  return "";
}

export { isUsablePgUrl };
