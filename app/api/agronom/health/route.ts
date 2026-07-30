import { NextRequest } from "next/server";
import { getCorsHeaders, jsonWithCors } from "@/lib/agronom/cors";
import { SERVICE_NAME, API_VERSION } from "@/lib/agronom/api-types";
import type { HealthApiResponse } from "@/lib/agronom/api-types";
import { logApiRequest } from "@/lib/agronom/logger";
import { getClientIp } from "@/lib/agronom/rateLimit";
import {
  checkDatabaseHealth,
  getRecordCounts,
} from "@/server/kb/db/client";
import { corpusStats } from "@/server/kb/corpus/build";
import { getEmbeddingStats } from "@/server/kb/db/embedding-stats";
import { getBootstrapStatus } from "@/server/kb/db/bootstrap-batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
}

export async function GET(request: NextRequest) {
  const start = Date.now();
  const dbHealth = await checkDatabaseHealth();
  const dbCounts = await getRecordCounts();
  const corpus = corpusStats();
  const embeddings = await getEmbeddingStats();
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());

  let migration: HealthApiResponse["migration"];
  try {
    if (dbHealth.database === "connected") {
      const boot = await getBootstrapStatus();
      migration = {
        expectedChunks: boot.corpus.totalChunks,
        chunksInDb: boot.recordCounts?.chunks ?? 0,
        gapChunks: boot.gap.chunks,
        gapDiseases: boot.gap.diseases,
        gapPests: boot.gap.pests,
        jobStatus: boot.job?.status,
        checkpoint: boot.job?.checkpoint,
      };
    }
  } catch {
    migration = undefined;
  }

  const response: HealthApiResponse = {
    status: "ok",
    service: SERVICE_NAME,
    version: API_VERSION,
    database: dbHealth.database,
    pgvector: dbHealth.pgvector,
    knowledgeBaseMode: dbHealth.knowledgeBaseMode,
    corpusFallback: dbHealth.corpusFallback,
    databaseUrlRequired: dbHealth.error === "DATABASE_URL_REQUIRED",
    cronSecretConfigured,
    cronSecretRequired: !cronSecretConfigured,
    recordCounts: dbCounts
      ? {
          crops: dbCounts.crops,
          diseases: dbCounts.diseases,
          pests: dbCounts.pests,
          chunks: dbCounts.chunks,
          verifiedProducts: dbCounts.verifiedProducts,
        }
      : {
          crops: corpus.crops,
          diseases: corpus.diseases,
          pests: corpus.pests,
          chunks: corpus.totalChunks,
          verifiedProducts: 0,
        },
    embeddings: embeddings
      ? {
          totalChunks: embeddings.totalChunks,
          embedded: embeddings.embedded,
          pending: embeddings.pending,
          failed: embeddings.failed,
          coveragePercent: embeddings.coveragePercent,
          vectorIndexReady: embeddings.vectorIndexReady,
          lastReindexAt: embeddings.lastReindexAt,
        }
      : undefined,
    migration,
  };

  logApiRequest({
    timestamp: new Date().toISOString(),
    endpoint: "/api/agronom/health",
    method: "GET",
    status: 200,
    responseTimeMs: Date.now() - start,
    ip: getClientIp(request.headers),
    isRejection: false,
  });

  return jsonWithCors(request, response);
}
