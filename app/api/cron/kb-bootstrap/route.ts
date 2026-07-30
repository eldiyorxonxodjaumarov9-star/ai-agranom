import { NextRequest, NextResponse } from "next/server";
import {
  authorizeCronRequest,
  logCronUnauthorized,
} from "@/lib/agronom/cron-auth";
import {
  checkDatabaseHealth,
  getRecordCounts,
} from "@/server/kb/db/client";
import { migrateCorpusToDatabase } from "@/server/kb/db/migrate-corpus";
import { getEmbeddingStats } from "@/server/kb/db/embedding-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Bootstrap Neon KB after tables exist.
 * Auth: Authorization: Bearer CRON_SECRET
 * Optional: AGRO_API_KEY when KB_CRON_ALLOW_AGRO_KEY=1
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
      { success: false, error: "Unauthorized" },
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

  const force = request.nextUrl.searchParams.get("force") === "1";
  const countsBefore = await getRecordCounts();
  const { corpusStats } = await import("@/server/kb/corpus/build");
  const expected = corpusStats().totalChunks;
  if (
    !force &&
    countsBefore &&
    countsBefore.chunks >= expected
  ) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "already_populated",
      authVia: auth.via,
      health,
      recordCounts: countsBefore,
      embeddings: await getEmbeddingStats(),
    });
  }

  const unpooled =
    process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
  if (unpooled && /^postgres(ql)?:\/\//i.test(unpooled)) {
    process.env.DATABASE_URL = unpooled;
  }

  console.info("[kb-bootstrap] corpus migrate start", {
    force,
    authVia: auth.via,
    authFp: auth.fingerprint,
  });

  try {
    const report = await migrateCorpusToDatabase();
    const countsAfter = await getRecordCounts();
    const healthAfter = await checkDatabaseHealth();
    return NextResponse.json({
      success: true,
      authVia: auth.via,
      health: healthAfter,
      recordCounts: countsAfter,
      embeddings: await getEmbeddingStats(),
      report: { ...report, errors: report.errors.slice(0, 20) },
    });
  } catch (err) {
    console.error("[kb-bootstrap] failed", err instanceof Error ? err.message : err);
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
