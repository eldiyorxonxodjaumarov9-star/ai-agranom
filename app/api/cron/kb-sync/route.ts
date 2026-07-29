import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { authenticateRequest } from "@/lib/agronom/auth";
import { runSyncJob } from "@/server/kb/sync/runner";
import type { SyncJobKind } from "@/server/kb/adapters/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function authorizeCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const cronSecret = process.env.CRON_SECRET;
  const agroKey = process.env.AGRO_API_KEY;

  if (cronSecret && token && timingSafeEqual(token, cronSecret)) return true;
  if (
    agroKey &&
    agroKey !== "super_secret_api_key_here" &&
    token &&
    timingSafeEqual(token, agroKey)
  ) {
    return true;
  }
  return false;
}

/**
 * Vercel Cron entrypoint.
 * Auth: Authorization: Bearer <CRON_SECRET> (preferred) or AGRO_API_KEY
 * Query: ?kind=diseases|pests|product_registry|broken_links
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    console.warn("[cron/kb-sync] unauthorized", {
      hasAuth: Boolean(request.headers.get("authorization")),
      fingerprint: createHash("sha256")
        .update(request.headers.get("authorization") || "none")
        .digest("hex")
        .slice(0, 8),
    });
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

  console.info("[cron/kb-sync] start", { kind });
  const job = await runSyncJob({ kind, triggeredBy: "cron" });
  console.info("[cron/kb-sync] done", {
    kind,
    status: job.status,
    imported: job.imported,
    skipped: job.skipped,
    failed: job.failed,
  });
  return NextResponse.json({ success: true, job });
}
