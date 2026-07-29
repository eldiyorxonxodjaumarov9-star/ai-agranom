import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/agronom/auth";
import {
  getAllowedSources,
  getVerifiedChunks,
  loadChunks,
  ingestJsonItems,
  type IngestChunkInput,
} from "@/server/kb";
import { getAllAdapters } from "@/server/kb/adapters";
import {
  loadSyncJobs,
  loadFailedImports,
  loadConflicts,
  loadCanonicalEntities,
} from "@/server/kb/sync/persist";
import { getPendingConflicts } from "@/server/kb/dedup";
import { CRON_SCHEDULE } from "@/server/kb/sync/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Protected Knowledge Base admin API (Phase 1 + Phase 2).
 * Auth: Bearer AGRO_API_KEY
 *
 * GET views:
 *   sources | chunks | verified | sync-jobs | failed | duplicates |
 *   conflicts | pending | source-status | adapters
 * POST: manual JSON chunk import (Phase 1)
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
    const chunks = loadChunks();
    return NextResponse.json({
      success: true,
      chunks,
      count: chunks.length,
    });
  }
  if (view === "sync-jobs") {
    return NextResponse.json({
      success: true,
      jobs: loadSyncJobs().slice().reverse(),
      schedule: CRON_SCHEDULE,
    });
  }
  if (view === "failed") {
    return NextResponse.json({
      success: true,
      failed: loadFailedImports().slice().reverse(),
      count: loadFailedImports().length,
    });
  }
  if (view === "duplicates" || view === "canonical") {
    return NextResponse.json({
      success: true,
      canonical: loadCanonicalEntities(),
      count: loadCanonicalEntities().length,
    });
  }
  if (view === "conflicts") {
    return NextResponse.json({
      success: true,
      conflicts: loadConflicts(),
      pending: getPendingConflicts(),
    });
  }
  if (view === "pending") {
    const pending = loadChunks().filter(
      (c) =>
        c.status === "NEEDS_REVIEW" ||
        c.status === "AI_PARSED" ||
        c.status === "DRAFT"
    );
    return NextResponse.json({
      success: true,
      chunks: pending,
      count: pending.length,
    });
  }
  if (view === "source-status") {
    const sources = getAllowedSources();
    const jobs = loadSyncJobs();
    const failed = loadFailedImports();
    return NextResponse.json({
      success: true,
      sources: sources.map((s) => {
        const lastJob = jobs
          .filter((j) => j.adapterIds.includes(s.id))
          .slice(-1)[0];
        return {
          id: s.id,
          name: s.name,
          enabled: s.enabled,
          allowedForIngestion: s.allowedForIngestion,
          license: s.license,
          crawlDelayMs: s.crawlDelayMs,
          lastCheckedAt: s.lastCheckedAt,
          lastSyncAt: lastJob?.finishedAt || lastJob?.startedAt || null,
          lastSyncStatus: lastJob?.status || null,
          recentFailures: failed.filter((f) => f.adapterId === s.id).length,
        };
      }),
      schedule: CRON_SCHEDULE,
    });
  }
  if (view === "adapters") {
    return NextResponse.json({
      success: true,
      adapters: getAllAdapters().map((a) => a.id),
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
