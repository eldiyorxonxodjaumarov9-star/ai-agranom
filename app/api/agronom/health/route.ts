import { NextRequest } from "next/server";
import { getCorsHeaders, jsonWithCors } from "@/lib/agronom/cors";
import { SERVICE_NAME, API_VERSION } from "@/lib/agronom/api-types";
import type { HealthApiResponse } from "@/lib/agronom/api-types";
import { createRequestId, logApiRequest } from "@/lib/agronom/logger";
import { getClientIp } from "@/lib/agronom/rateLimit";
import {
  checkDatabaseHealth,
  getRecordCounts,
} from "@/server/kb/db/client";
import { getEmbeddingStats } from "@/server/kb/db/embedding-stats";
import { getBootstrapStatus } from "@/server/kb/db/bootstrap-batch";
import { authenticateRequest } from "@/lib/agronom/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
}

/** Public liveness — minimal. Full diagnostics require Bearer. */
export async function GET(request: NextRequest) {
  const start = Date.now();
  const requestId = createRequestId(request);
  const detail = request.nextUrl.searchParams.get("detail") === "1";
  const auth = authenticateRequest(request.headers.get("authorization"));
  const wantDetail = detail && auth.ok;

  const dbHealth = await checkDatabaseHealth();
  const embeddings = wantDetail ? await getEmbeddingStats() : null;
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());

  let httpStatus = 200;
  let status: HealthApiResponse["status"] = "ok";
  if (dbHealth.database === "disconnected") {
    httpStatus = 503;
    status = "error";
  } else if (dbHealth.database === "not_configured") {
    httpStatus = 503;
    status = "degraded";
  } else if (
    embeddings &&
    !embeddings.vectorIndexReady &&
    embeddings.totalChunks > 0
  ) {
    status = "degraded";
  }

  const response: HealthApiResponse = {
    status,
    service: SERVICE_NAME,
    version: API_VERSION,
    database: dbHealth.database,
    pgvector: dbHealth.pgvector,
    knowledgeBaseMode: dbHealth.knowledgeBaseMode,
    corpusFallback: dbHealth.corpusFallback,
    databaseUrlRequired: dbHealth.error === "DATABASE_URL_REQUIRED",
  };

  if (wantDetail) {
    const dbCounts = await getRecordCounts();
    let migration: HealthApiResponse["migration"];
    try {
      if (dbHealth.database === "connected") {
        const boot = await getBootstrapStatus();
        migration = {
          expectedChunks:
            boot.corpus.uniqueChunks ?? boot.corpus.totalChunks,
          chunksInDb: boot.recordCounts?.chunks ?? 0,
          gapChunks: boot.gap.chunks,
          gapDiseases: boot.gap.diseases,
          gapPests: boot.gap.pests,
          jobStatus: boot.job?.status,
          checkpoint: boot.job?.checkpoint,
          lastBootstrapAt: boot.job?.updatedAt ?? null,
          lastEmbeddingRunAt: embeddings?.lastReindexAt ?? null,
        };
        if (boot.job?.status === "running") status = "degraded";
      }
    } catch {
      migration = undefined;
    }

    response.cronSecretConfigured = cronSecretConfigured;
    response.cronSecretRequired = !cronSecretConfigured;
    response.recordCounts = dbCounts
      ? {
          crops: dbCounts.crops,
          diseases: dbCounts.diseases,
          pests: dbCounts.pests,
          chunks: dbCounts.chunks,
          verifiedProducts: dbCounts.verifiedProducts,
        }
      : undefined;
    response.embeddings = embeddings
      ? {
          totalChunks: embeddings.totalChunks,
          embedded: embeddings.embedded,
          pending: embeddings.pending,
          failed: embeddings.failed,
          coveragePercent: embeddings.coveragePercent,
          vectorIndexReady: embeddings.vectorIndexReady,
          lastReindexAt: embeddings.lastReindexAt,
        }
      : undefined;
    response.embeddingCoverage = embeddings?.coveragePercent;
    response.vectorIndexReady = embeddings?.vectorIndexReady;
    response.pendingEmbeddings = embeddings?.pending;
    response.failedEmbeddings = embeddings?.failed;
    response.lastEmbeddingRun = embeddings?.lastReindexAt ?? null;
    response.migration = migration;
    response.status = status;
  }

  logApiRequest({
    timestamp: new Date().toISOString(),
    requestId,
    endpoint: "/api/agronom/health",
    method: "GET",
    status: httpStatus,
    responseTimeMs: Date.now() - start,
    ip: getClientIp(request.headers),
    isRejection: false,
  });

  return jsonWithCors(request, response, httpStatus, {
    "X-Request-Id": requestId,
  });
}
