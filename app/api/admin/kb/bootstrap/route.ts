import { NextRequest, NextResponse } from "next/server";
import {
  authorizeCronRequest,
  logCronUnauthorized,
} from "@/lib/agronom/cron-auth";
import { authenticateRequest } from "@/lib/agronom/auth";
import {
  checkDatabaseHealth,
  getRecordCounts,
} from "@/server/kb/db/client";
import {
  getBootstrapStatus,
  runCorpusBootstrapBatch,
} from "@/server/kb/db/bootstrap-batch";
import { getEmbeddingStats } from "@/server/kb/db/embedding-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Protected corpus bootstrap (checkpoint/resume).
 * Auth: Bearer CRON_SECRET, or AGRO_API_KEY when KB_CRON_ALLOW_AGRO_KEY=1,
 * or admin AGRO_API_KEY via authenticateRequest for manual ops.
 *
 * POST /api/admin/kb/bootstrap?force=1
 * GET  /api/admin/kb/bootstrap  → status only
 */
function authorize(request: NextRequest): {
  ok: boolean;
  via?: string;
  fingerprint?: string;
} {
  const cron = authorizeCronRequest(request);
  if (cron.ok) return { ok: true, via: cron.via, fingerprint: cron.fingerprint };

  // Admin Bearer AGRO_API_KEY always allowed for this bootstrap control plane
  // (separate from cron fallback flag) so operators can resume without CRON_SECRET.
  const admin = authenticateRequest(request.headers.get("authorization"));
  if (admin.ok) {
    return { ok: true, via: "agro_admin", fingerprint: admin.keyFingerprint };
  }

  if (!cron.ok) {
    logCronUnauthorized("/api/admin/kb/bootstrap", cron);
  }
  return { ok: false };
}

export async function GET(request: NextRequest) {
  const auth = authorize(request);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  const status = await getBootstrapStatus();
  return NextResponse.json({
    success: true,
    authVia: auth.via,
    health: await checkDatabaseHealth(),
    embeddings: await getEmbeddingStats(),
    ...status,
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    cronSecretRequired: !process.env.CRON_SECRET?.trim(),
  });
}

export async function POST(request: NextRequest) {
  const auth = authorize(request);
  if (!auth.ok) {
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

  const unpooled =
    process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
  if (unpooled && /^postgres(ql)?:\/\//i.test(unpooled)) {
    process.env.DATABASE_URL = unpooled;
  }

  const force = request.nextUrl.searchParams.get("force") === "1";
  const maxMs = Number(
    request.nextUrl.searchParams.get("maxMs") ||
      process.env.KB_BOOTSTRAP_MAX_MS ||
      240000
  );

  console.info("[admin/kb/bootstrap] batch start", {
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
        ? "Corpus bootstrap complete"
        : "Call POST again to resume from checkpoint",
      cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
      cronSecretRequired: !process.env.CRON_SECRET?.trim(),
    });
  } catch (err) {
    console.error(
      "[admin/kb/bootstrap] failed",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "bootstrap_failed",
        recordCounts: await getRecordCounts(),
      },
      { status: 500 }
    );
  }
}
