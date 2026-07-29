import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/agronom/auth";
import { runSyncJob, adaptersForKind } from "@/server/kb/sync/runner";
import type { SyncJobKind } from "@/server/kb/adapters/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/kb/sync
 * Body: { "kind": "diseases"|"pests"|"product_registry"|"broken_links"|"full", "adapterIds"?: string[] }
 */
export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const kind = (body?.kind || "full") as SyncJobKind;
    const allowed: SyncJobKind[] = [
      "diseases",
      "pests",
      "product_registry",
      "broken_links",
      "full",
    ];
    if (!allowed.includes(kind)) {
      return NextResponse.json(
        { success: false, error: "Noto'g'ri sync kind" },
        { status: 400 }
      );
    }

    const job = await runSyncJob({
      kind,
      triggeredBy: "manual",
      adapterIds: Array.isArray(body?.adapterIds) ? body.adapterIds : undefined,
    });

    return NextResponse.json({
      success: true,
      job,
      adaptersForKind: adaptersForKind(kind),
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Sync xatosi",
      },
      { status: 500 }
    );
  }
}
