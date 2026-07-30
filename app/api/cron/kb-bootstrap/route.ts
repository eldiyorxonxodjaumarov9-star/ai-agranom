import { NextRequest, NextResponse } from "next/server";
import {
  authorizeCronRequest,
  logCronUnauthorized,
} from "@/lib/agronom/cron-auth";
import { checkDatabaseHealth } from "@/server/kb/db/client";
import {
  getBootstrapStatus,
  runCorpusBootstrapBatch,
} from "@/server/kb/db/bootstrap-batch";
import { getEmbeddingStats } from "@/server/kb/db/embedding-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron / manual bootstrap with checkpoint resume.
 * Keep batches short (default 45–50s) to avoid platform 504.
 * Auth: Authorization: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    logCronUnauthorized("/api/cron/kb-bootstrap", auth);
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
        cronSecretRequired: !process.env.CRON_SECRET?.trim(),
      },
      { status: 401 }
    );
  }

  const health = await checkDatabaseHealth();
  if (health.database !== "connected") {
    return NextResponse.json(
      { success: false, error: "database_not_connected", health },
      { status: 503 }
    );
  }

  const statusOnly = request.nextUrl.searchParams.get("status") === "1";
  if (statusOnly) {
    const status = await getBootstrapStatus();
    return NextResponse.json({
      success: true,
      authVia: auth.via,
      health,
      embeddings: await getEmbeddingStats(),
      ...status,
      cronSecretConfigured: true,
    });
  }

  const unpooled =
    process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
  if (unpooled && /^postgres(ql)?:\/\//i.test(unpooled)) {
    process.env.DATABASE_URL = unpooled;
  }

  const force = request.nextUrl.searchParams.get("force") === "1";
  const maxMs = Number(
    request.nextUrl.searchParams.get("maxMs") ||
      process.env.KB_BOOTSTRAP_MAX_MS ||
      45000
  );

  console.info("[kb-bootstrap] batch start", {
    force,
    maxMs,
    authVia: auth.via,
    authFp: auth.fingerprint,
  });

  try {
    const report = await runCorpusBootstrapBatch({ force, maxMs });
    return NextResponse.json({
      success: true,
      authVia: auth.via,
      health: await checkDatabaseHealth(),
      embeddings: await getEmbeddingStats(),
      report,
      hint: report.done
        ? "complete"
        : "resume: call this endpoint again (checkpoint saved)",
    });
  } catch (err) {
    console.error(
      "[kb-bootstrap] failed",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "migrate_failed",
        health: await checkDatabaseHealth(),
      },
      { status: 500 }
    );
  }
}
