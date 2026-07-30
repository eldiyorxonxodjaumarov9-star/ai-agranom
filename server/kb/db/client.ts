import { PrismaClient } from "@prisma/client";
import {
  resolveRuntimeDatabaseUrl,
  resolveMigrationDatabaseUrl,
} from "./urls";

const globalForPrisma = globalThis as unknown as {
  __agroPrisma?: PrismaClient;
  __agroPrismaMigrate?: PrismaClient;
};

/** True when a pooled/runtime DATABASE_URL is configured. */
export function isDatabaseConfigured(): boolean {
  const url = resolveRuntimeDatabaseUrl();
  if (!url) return false;
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

/** Separate client for migrations / long writes — uses unpooled when available. */
export function getMigrationPrisma(): PrismaClient | null {
  const url = resolveMigrationDatabaseUrl();
  if (!url) return getPrisma();
  if (!globalForPrisma.__agroPrismaMigrate) {
    globalForPrisma.__agroPrismaMigrate = new PrismaClient({
      datasources: { db: { url } },
      log: ["error"],
    });
  }
  return globalForPrisma.__agroPrismaMigrate;
}

export async function hasAnnVectorIndex(): Promise<boolean> {
  const prisma = getPrisma();
  if (!prisma) return false;
  try {
    const rows = await prisma.$queryRaw<Array<{ idx: string }>>`
      SELECT indexname AS idx
      FROM pg_indexes
      WHERE tablename = 'KnowledgeChunkRow'
        AND indexdef ILIKE '%hnsw%'
        AND indexdef ILIKE '%embedding%'
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function checkDatabaseHealth(): Promise<{
  database: "connected" | "disconnected" | "not_configured";
  pgvector: "ready" | "missing" | "unknown" | "not_configured";
  knowledgeBaseMode: "database" | "corpus_fallback";
  corpusFallback: boolean;
  vectorAnnReady?: boolean;
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
        SELECT extname FROM pg_extension WHERE extname = 'vector'
      `;
      pgvector = ext.length > 0 ? "ready" : "missing";
    } catch {
      pgvector = "unknown";
    }
    const vectorAnnReady = pgvector === "ready" && (await hasAnnVectorIndex());

    return {
      database: "connected",
      pgvector,
      knowledgeBaseMode: "database",
      corpusFallback: false,
      vectorAnnReady,
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
