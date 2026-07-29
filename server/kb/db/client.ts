import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { __agroPrisma?: PrismaClient };

/** Prefer Neon pooled URL for runtime; never invent DIRECT_URL. */
function resolveDatabaseUrl(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
  ];
  for (const c of candidates) {
    const url = c?.trim();
    if (url && isUsablePgUrl(url)) return url;
  }
  return "";
}

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

/** True when a real DATABASE_URL is configured for production use. */
export function isDatabaseConfigured(): boolean {
  const url = resolveDatabaseUrl();
  if (!url) return false;
  // Prisma reads process.env.DATABASE_URL — normalize Neon aliases.
  if (process.env.DATABASE_URL?.trim() !== url) {
    process.env.DATABASE_URL = url;
  }
  return true;
}

export function getPrisma(): PrismaClient | null {
  if (!isDatabaseConfigured()) return null;
  if (!globalForPrisma.__agroPrisma) {
    globalForPrisma.__agroPrisma = new PrismaClient({
      log: process.env.KB_PRISMA_LOG === "1" ? ["error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.__agroPrisma;
}

export async function checkDatabaseHealth(): Promise<{
  database: "connected" | "disconnected" | "not_configured";
  pgvector: "ready" | "missing" | "unknown" | "not_configured";
  knowledgeBaseMode: "database" | "corpus_fallback";
  corpusFallback: boolean;
  error?: string;
}> {
  if (!isDatabaseConfigured()) {
    return {
      database: "not_configured",
      pgvector: "not_configured",
      knowledgeBaseMode: "corpus_fallback",
      corpusFallback: true,
      error: "DATABASE_URL_REQUIRED",
    };
  }

  const prisma = getPrisma();
  if (!prisma) {
    return {
      database: "not_configured",
      pgvector: "not_configured",
      knowledgeBaseMode: "corpus_fallback",
      corpusFallback: true,
      error: "DATABASE_URL_REQUIRED",
    };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    let pgvector: "ready" | "missing" | "unknown" = "unknown";
    try {
      const ext = await prisma.$queryRaw<Array<{ extname: string }>>`
        SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pg_trgm', 'unaccent')
      `;
      const names = new Set(ext.map((e) => e.extname));
      pgvector = names.has("vector") ? "ready" : "missing";
    } catch {
      pgvector = "unknown";
    }

    return {
      database: "connected",
      pgvector,
      knowledgeBaseMode: "database",
      corpusFallback: true,
    };
  } catch (err) {
    return {
      database: "disconnected",
      pgvector: "unknown",
      knowledgeBaseMode: "corpus_fallback",
      corpusFallback: true,
      error: err instanceof Error ? err.message : "db_error",
    };
  }
}

export async function getRecordCounts(): Promise<{
  crops: number;
  diseases: number;
  pests: number;
  chunks: number;
  symptoms: number;
  treatments: number;
  verifiedProducts: number;
  productsTotal: number;
  productsNeedsReview: number;
} | null> {
  const prisma = getPrisma();
  if (!prisma) return null;
  try {
    const [
      crops,
      diseases,
      pests,
      chunks,
      symptoms,
      treatments,
      verifiedProducts,
      productsTotal,
      productsNeedsReview,
    ] = await Promise.all([
      prisma.crop.count({ where: { deletedAt: null } }),
      prisma.disease.count({ where: { deletedAt: null } }),
      prisma.pest.count({ where: { deletedAt: null } }),
      prisma.knowledgeChunkRow.count({ where: { deletedAt: null } }),
      prisma.symptom.count({ where: { deletedAt: null } }),
      prisma.treatment.count({ where: { deletedAt: null } }),
      prisma.product.count({
        where: {
          deletedAt: null,
          status: "VERIFIED",
          registrationStatus: "ACTIVE",
          labelVerified: true,
        },
      }),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.product.count({
        where: { deletedAt: null, status: "NEEDS_REVIEW" },
      }),
    ]);
    return {
      crops,
      diseases,
      pests,
      chunks,
      symptoms,
      treatments,
      verifiedProducts,
      productsTotal,
      productsNeedsReview,
    };
  } catch {
    return null;
  }
}
