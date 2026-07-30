import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/agronom/auth";
import {
  importKzPppRows,
  parseKzPppCsv,
  parseKzPppJson,
} from "@/server/kb/products/kz-ppp-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/admin/kb/products/import
 * { filename, content, format: 'csv'|'json' }
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
    const content = String(body?.content || "");
    const filename = String(body?.filename || "upload.csv");
    const format = String(body?.format || "csv").toLowerCase();

    if (!content.trim()) {
      return NextResponse.json(
        { success: false, error: "content empty" },
        { status: 400 }
      );
    }

    if (filename.toLowerCase().endsWith(".xlsx") || format === "xlsx") {
      return NextResponse.json(
        {
          success: false,
          error: "XLSX_NOT_INLINE",
          hint: "Export the official registry sheet as CSV/JSON, then re-upload. Native XLSX parsing is not enabled in the serverless bundle.",
        },
        { status: 400 }
      );
    }

    let rows;
    try {
      rows =
        format === "json" || filename.toLowerCase().endsWith(".json")
          ? parseKzPppJson(content)
          : parseKzPppCsv(content);
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: "malformed_file",
          detail: e instanceof Error ? e.message : String(e),
        },
        { status: 400 }
      );
    }

    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: "no_rows_parsed" },
        { status: 400 }
      );
    }

    const report = await importKzPppRows(rows, {
      filename,
      kind: "admin_upload",
    });

    console.info("[admin/kb/products/import]", {
      by: auth.keyFingerprint,
      parsed: report.parsed,
      verified: report.verified,
      needsReview: report.needsReview,
    });

    return NextResponse.json({
      success: true,
      report,
      note:
        report.verified === 0
          ? "Zero VERIFIED is expected until registration number, label URL, crops, targets, and checksum all pass."
          : undefined,
    });
  } catch (err) {
    console.error(
      "[admin/kb/products/import]",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { success: false, error: "import_failed" },
      { status: 500 }
    );
  }
}
