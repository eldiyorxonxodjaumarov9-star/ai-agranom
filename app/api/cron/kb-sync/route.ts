import { NextRequest, NextResponse } from "next/server";
import {
  authorizeCronRequest,
  logCronUnauthorized,
} from "@/lib/agronom/cron-auth";
import { runSyncJob } from "@/server/kb/sync/runner";
import type { SyncJobKind } from "@/server/kb/adapters/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron entrypoint.
 * Auth: Authorization: Bearer <CRON_SECRET>
 * Optional AGRO_API_KEY when KB_CRON_ALLOW_AGRO_KEY=1
 * Query: ?kind=diseases|pests|product_registry|broken_links
 */
export async function GET(request: NextRequest) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    logCronUnauthorized("/api/cron/kb-sync", auth);
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const kind = (request.nextUrl.searchParams.get("kind") ||
    "diseases") as SyncJobKind;
  const allowed: SyncJobKind[] = [
    "diseases",
    "pests",
    "product_registry",
    "broken_links",
  ];
  if (!allowed.includes(kind)) {
    return NextResponse.json(
      { success: false, error: "Invalid kind" },
      { status: 400 }
    );
  }

  console.info("[cron/kb-sync] start", { kind, authVia: auth.via });
  const job = await runSyncJob({ kind, triggeredBy: "cron" });
  console.info("[cron/kb-sync] done", {
    kind,
    status: job.status,
    imported: job.imported,
    skipped: job.skipped,
    failed: job.failed,
  });
  return NextResponse.json({ success: true, authVia: auth.via, job });
}
