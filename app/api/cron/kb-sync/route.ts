import { NextRequest, NextResponse } from "next/server";
import { runSyncJob } from "@/server/kb/sync/runner";
import type { SyncJobKind } from "@/server/kb/adapters/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron entrypoint.
 * Auth: Authorization: Bearer <CRON_SECRET> or <AGRO_API_KEY>
 * Query: ?kind=diseases|pests|product_registry|broken_links
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const agroKey = process.env.AGRO_API_KEY;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  const ok =
    (cronSecret && token === cronSecret) ||
    (agroKey &&
      agroKey !== "super_secret_api_key_here" &&
      token === agroKey);

  if (!ok) {
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

  const job = await runSyncJob({ kind, triggeredBy: "cron" });
  return NextResponse.json({ success: true, job });
}
