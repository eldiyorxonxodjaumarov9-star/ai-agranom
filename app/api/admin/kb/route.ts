import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/agronom/auth";
import {
  getAllowedSources,
  getVerifiedChunks,
  loadChunks,
  ingestJsonItems,
  type IngestChunkInput,
} from "@/server/kb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Protected Knowledge Base admin API (Phase 1).
 * Auth: Bearer AGRO_API_KEY (same as public API — server-only).
 *
 * GET  /api/admin/kb?view=sources|chunks|verified
 * POST /api/admin/kb  { "chunks": [ ...IngestChunkInput ] }
 */
export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const view = request.nextUrl.searchParams.get("view") || "verified";
  if (view === "sources") {
    return NextResponse.json({
      success: true,
      sources: getAllowedSources(),
    });
  }
  if (view === "chunks") {
    return NextResponse.json({
      success: true,
      chunks: loadChunks(),
      count: loadChunks().length,
    });
  }

  const verified = getVerifiedChunks();
  return NextResponse.json({
    success: true,
    chunks: verified,
    count: verified.length,
  });
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const chunks = (body?.chunks ?? body) as IngestChunkInput[];
    if (!Array.isArray(chunks)) {
      return NextResponse.json(
        { success: false, error: "chunks massivi kerak" },
        { status: 400 }
      );
    }

    const result = ingestJsonItems(chunks);
    return NextResponse.json({ success: true, ...result });
  } catch {
    return NextResponse.json(
      { success: false, error: "Import xatosi" },
      { status: 500 }
    );
  }
}
