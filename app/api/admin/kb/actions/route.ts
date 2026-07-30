import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/agronom/auth";
import { loadChunks, saveChunks, upsertChunks } from "@/server/kb/store";
import { enqueueImport, getImportQueue, cancelImport } from "@/server/kb/sync/queue";
import type { SyncJobKind } from "@/server/kb/adapters/types";
import type { KbStatus } from "@/server/kb/types";
import {
  loadConflicts,
  saveConflicts,
  loadFailedImports,
} from "@/server/kb/sync/persist";
import { corpusStats } from "@/server/kb/corpus/build";
import {
  checkDatabaseHealth,
  getRecordCounts,
} from "@/server/kb/db/client";
import { getEmbeddingStats } from "@/server/kb/db/embedding-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/kb/actions
 * { action: approve|reject|merge|reindex|retry|enqueue|cancel|disable-source, ... }
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
    const body = await request.json();
    const action = body?.action as string;

    if (action === "dashboard") {
      const chunks = loadChunks();
      const dbCounts = await getRecordCounts();
      const embeddings = await getEmbeddingStats();
      const dbHealth = await checkDatabaseHealth();
      return NextResponse.json({
        success: true,
        dashboard: {
          total: chunks.length,
          verified: chunks.filter((c) => c.status === "VERIFIED").length,
          pending: chunks.filter((c) =>
            ["NEEDS_REVIEW", "AI_PARSED", "DRAFT"].includes(c.status)
          ).length,
          conflicts: loadConflicts().filter((c) => c.status === "pending").length,
          failed: loadFailedImports().length,
          corpus: corpusStats(),
          queue: getImportQueue().slice(-10),
          database: dbHealth,
          recordCounts: dbCounts,
          embeddings,
          products: dbCounts
            ? {
                total: dbCounts.productsTotal,
                verified: dbCounts.verifiedProducts,
                needsReview: dbCounts.productsNeedsReview,
              }
            : null,
          bootstrap: await (async () => {
            try {
              const { getBootstrapStatus } = await import(
                "@/server/kb/db/bootstrap-batch"
              );
              return await getBootstrapStatus();
            } catch {
              return null;
            }
          })(),
          cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
          cronSecretRequired: !process.env.CRON_SECRET?.trim(),
          notes: {
            embeddingReindex:
              "Run locally/CI: npm run kb:reindex -- --mode embeddings (not inside Vercel request)",
            kzImport: "UI: /admin/kb/products/import or npm run kb:import-kz-ppp -- --file ./export.csv",
            bootstrap: "POST /api/admin/kb/bootstrap to resume corpus sync",
          },
        },
      });
    }

    if (action === "resume-bootstrap") {
      const { runCorpusBootstrapBatch } = await import(
        "@/server/kb/db/bootstrap-batch"
      );
      const report = await runCorpusBootstrapBatch({
        force: body?.force === true,
        maxMs: Number(body?.maxMs || 240000),
      });
      return NextResponse.json({ success: true, report });
    }

    if (action === "approve" || action === "reject") {
      const ids: string[] = body?.ids || (body?.id ? [body.id] : []);
      if (!ids.length) {
        return NextResponse.json(
          { success: false, error: "ids kerak" },
          { status: 400 }
        );
      }
      const status: KbStatus =
        action === "approve" ? "VERIFIED" : "REJECTED";
      const chunks = loadChunks();
      let changed = 0;
      for (const c of chunks) {
        if (ids.includes(c.id)) {
          // Never approve product/treatment without explicit force
          if (
            action === "approve" &&
            (c.entityType === "product" || c.entityType === "treatment") &&
            body?.force !== true
          ) {
            continue;
          }
          c.status = status;
          c.updatedAt = new Date().toISOString();
          changed++;
        }
      }
      saveChunks(chunks);
      console.info("[admin/kb/actions]", action, { changed, by: auth.keyFingerprint });
      return NextResponse.json({ success: true, changed, status });
    }

    if (action === "enqueue") {
      const kind = (body?.kind || "full") as SyncJobKind;
      const item = enqueueImport({
        kind,
        idempotencyKey: body?.idempotencyKey,
      });
      return NextResponse.json({ success: true, item });
    }

    if (action === "cancel") {
      const ok = cancelImport(String(body?.id || ""));
      return NextResponse.json({ success: ok });
    }

    if (action === "resolve-conflict") {
      const id = String(body?.id || "");
      const resolution = body?.resolution === "rejected" ? "rejected" : "resolved";
      const rows = loadConflicts();
      const row = rows.find((c) => c.id === id);
      if (!row) {
        return NextResponse.json(
          { success: false, error: "conflict topilmadi" },
          { status: 404 }
        );
      }
      row.status = resolution;
      saveConflicts(rows);
      return NextResponse.json({ success: true, conflict: row });
    }

    if (action === "reindex") {
      const ids: string[] = body?.ids || [];
      const chunks = loadChunks().filter((c) => ids.includes(c.id));
      const result = upsertChunks(
        chunks.map((c) => ({
          ...c,
          updatedAt: new Date().toISOString(),
          // force checksum change marker for reindex metadata only if content same — skip
        }))
      );
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { success: false, error: "Noma'lum action" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[admin/kb/actions]", err);
    return NextResponse.json(
      { success: false, error: "Action xatosi" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  const chunks = loadChunks();
  const dbCounts = await getRecordCounts();
  const embeddings = await getEmbeddingStats();
  const dbHealth = await checkDatabaseHealth();
  return NextResponse.json({
    success: true,
    dashboard: {
      total: chunks.length,
      verified: chunks.filter((c) => c.status === "VERIFIED").length,
      pending: chunks.filter((c) =>
        ["NEEDS_REVIEW", "AI_PARSED", "DRAFT"].includes(c.status)
      ).length,
      conflicts: loadConflicts().filter((c) => c.status === "pending").length,
      failed: loadFailedImports().length,
      corpus: corpusStats(),
      queue: getImportQueue().slice(-20),
      database: dbHealth,
      recordCounts: dbCounts,
      embeddings,
      products: dbCounts
        ? {
            total: dbCounts.productsTotal,
            verified: dbCounts.verifiedProducts,
            needsReview: dbCounts.productsNeedsReview,
          }
        : null,
      phase4: {
        embeddingCoverage: embeddings?.coveragePercent ?? 0,
        vectorIndexReady: embeddings?.vectorIndexReady ?? false,
        lastReindexAt: embeddings?.lastReindexAt ?? null,
        productVerificationQueue: dbCounts?.productsNeedsReview ?? 0,
      },
    },
  });
}
