import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/agronom/admin-auth";
import {
  demoteUntrustedProducts,
  importOfficialPppRows,
  parseOfficialPppCsv,
  parseOfficialPppJson,
  parseOfficialPppPdfBuffer,
  parseOfficialPppXlsxBuffer,
  type OfficialPppCountry,
} from "@/server/kb/products/official-ppp-import";
import {
  getUzRegistryRemoteStatus,
  UZ_REGISTRY_BLOCKER,
} from "@/server/kb/adapters/uz-registry";
import { isFixtureOrSampleFilename } from "@/server/kb/products/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function resolveCountry(raw: unknown): OfficialPppCountry {
  const c = String(raw || "KZ").toUpperCase();
  return c === "UZ" ? "UZ" : "KZ";
}

export async function GET(request: NextRequest) {
  const auth = authenticateAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json(auth.response, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    uz: getUzRegistryRemoteStatus(),
    note: "Uploads never auto-VERIFIED. Use dryRun=true to preview. Admin verify API required for VERIFIED.",
  });
}

/**
 * POST /api/admin/kb/products/import
 * { filename, content|contentBase64, format, country, dryRun?, action? }
 * action: 'demote_fixture' — soft-demote known untrusted fixture trade names
 */
export async function POST(request: NextRequest) {
  const auth = authenticateAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json(auth.response, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body?.action === "demote_fixture") {
      const result = await demoteUntrustedProducts({
        names: [
          "Ridomil Gold",
          "Topaz 100",
          "Aktara 25",
          "Expired Demo",
        ],
        registrationNumbers: [
          "UZ-PPP-2024-001",
          "UZ-PPP-2024-002",
          "UZ-PPP-2023-015",
          "UZ-PPP-2018-099",
        ],
        actorHash: auth.keyFingerprint,
        reason:
          "No proven official UZ registry document/label; fixture example.gov.uz provenance",
      });
      return NextResponse.json({ success: true, ...result });
    }

    const filename = String(body?.filename || "upload.csv");
    const format = String(body?.format || "csv").toLowerCase();
    const country = resolveCountry(body?.country);
    const dryRun = body?.dryRun === true;
    const content = typeof body?.content === "string" ? body.content : "";
    const contentBase64 =
      typeof body?.contentBase64 === "string" ? body.contentBase64 : "";

    const lower = filename.toLowerCase();
    const isXlsx =
      format === "xlsx" || lower.endsWith(".xlsx") || lower.endsWith(".xls");
    const isPdf = format === "pdf" || lower.endsWith(".pdf");
    const isJson = format === "json" || lower.endsWith(".json");

    let rows;
    let parseHint: string | undefined;

    try {
      if (isXlsx) {
        if (!contentBase64.trim()) {
          return NextResponse.json(
            {
              success: false,
              error: "XLSX_REQUIRES_BASE64",
              hint: "Send contentBase64 for official XLSX exports.",
            },
            { status: 400 }
          );
        }
        const buf = Buffer.from(contentBase64, "base64");
        rows = await parseOfficialPppXlsxBuffer(buf, country);
      } else if (isPdf) {
        const buf = contentBase64.trim()
          ? Buffer.from(contentBase64, "base64")
          : Buffer.from(content, "binary");
        const parsed = parseOfficialPppPdfBuffer(buf, country);
        rows = parsed.rows;
        parseHint = parsed.hint;
      } else if (isJson) {
        if (!content.trim()) {
          return NextResponse.json(
            { success: false, error: "content empty" },
            { status: 400 }
          );
        }
        rows = parseOfficialPppJson(content, country);
      } else {
        if (!content.trim()) {
          return NextResponse.json(
            { success: false, error: "content empty" },
            { status: 400 }
          );
        }
        rows = parseOfficialPppCsv(content, country);
      }
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
        {
          success: false,
          error: "no_rows_parsed",
          hint: parseHint,
          uzRemote: country === "UZ" ? getUzRegistryRemoteStatus() : undefined,
        },
        { status: 400 }
      );
    }

    const kind = isFixtureOrSampleFilename(filename)
      ? "fixture_smoke"
      : "admin_upload";

    const report = await importOfficialPppRows(rows, {
      country,
      filename,
      kind,
      dryRun,
      // Uploads never carry admin approval — VERIFIED only via verify API
      adminApproved: false,
      trustedOfficialSource: false,
      remoteBlocker: country === "UZ" ? UZ_REGISTRY_BLOCKER : undefined,
    });

    console.info("[admin/kb/products/import]", {
      by: auth.keyFingerprint,
      country,
      dryRun: report.dryRun,
      writeBlockedReason: report.writeBlockedReason,
      parsed: report.parsed,
      imported: report.imported,
      updated: report.updated,
      skipped: report.skipped,
      failed: report.failed,
      verified: report.verified,
      needsReview: report.needsReview,
    });

    return NextResponse.json({
      success: true,
      report,
      uzRemote: country === "UZ" ? getUzRegistryRemoteStatus() : undefined,
      note:
        "Uploads never set VERIFIED/labelVerified. Admin attestation + official provenance required.",
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
