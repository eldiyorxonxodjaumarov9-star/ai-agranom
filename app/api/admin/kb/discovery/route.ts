import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/agronom/admin-auth";
import { getPrisma, isDatabaseConfigured } from "@/server/kb/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeDomain(input: string): string {
  try {
    if (input.includes("://")) {
      return new URL(input).hostname.toLowerCase().replace(/^www\./, "");
    }
  } catch {
    /* fall through */
  }
  return input
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim();
}

/** Admin discovery queue — not public OpenAPI. */
export async function GET(request: NextRequest) {
  const auth = authenticateAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json(auth.response, { status: auth.status || 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      success: true,
      candidates: [],
      note: "database_not_configured",
    });
  }
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: true, candidates: [] });
  }
  try {
    const candidates = await prisma.sourceDiscoveryCandidate.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ success: true, candidates });
  } catch {
    return NextResponse.json({
      success: true,
      candidates: [],
      note: "table_pending_migration",
    });
  }
}

/**
 * POST:
 *  { action: 'add_candidates', domains: string[], discoveredBy? }
 *  { id, status: PENDING_REVIEW|APPROVED|REJECTED, reviewNotes? }
 * Never enables SellerSource crawl.
 */
export async function POST(request: NextRequest) {
  const auth = authenticateAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json(auth.response, { status: auth.status || 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma || !isDatabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: "database_not_configured" },
      { status: 503 }
    );
  }

  if (body.action === "seed_from_bundle") {
    const { seedDiscoveryCandidatesFromBundle } = await import(
      "@/server/kb/sellers/seed-discovery"
    );
    const result = await seedDiscoveryCandidatesFromBundle({
      actorHash: auth.keyFingerprint,
    });
    return NextResponse.json({
      success: true,
      ...result,
      note: "Bundled domains queued as PENDING_REVIEW. Crawl remains disabled.",
    });
  }

  if (body.action === "add_candidates") {
    const raw = Array.isArray(body.domains) ? body.domains : [];
    const discoveredBy =
      typeof body.discoveredBy === "string"
        ? body.discoveredBy.slice(0, 120)
        : "admin_manual";
    const upserted: string[] = [];
    const errors: string[] = [];
    for (const item of raw) {
      const domain = normalizeDomain(String(item || ""));
      if (!domain || !domain.includes(".")) {
        errors.push(`invalid:${item}`);
        continue;
      }
      try {
        await prisma.sourceDiscoveryCandidate.upsert({
          where: { domain },
          create: {
            domain,
            url: `https://${domain}/`,
            discoveredBy,
            status: "PENDING_REVIEW",
            reviewNotes: "Crawl disabled until admin approves after robots/ToS review",
          },
          update: {
            status: "PENDING_REVIEW",
            reviewNotes:
              "Re-queued PENDING_REVIEW; crawl remains disabled until explicit enable",
          },
        });
        upserted.push(domain);
      } catch (e) {
        errors.push(
          `${domain}:${e instanceof Error ? e.message : "upsert_failed"}`
        );
      }
    }
    console.info("[admin/kb/discovery] add_candidates", {
      by: auth.keyFingerprint,
      upserted: upserted.length,
    });
    return NextResponse.json({
      success: true,
      upserted,
      errors,
      crawlEnabled: false,
      note: "Candidates stored as PENDING_REVIEW. Do not enable SellerSource until approved.",
    });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status =
    body.status === "APPROVED" ||
    body.status === "REJECTED" ||
    body.status === "PENDING_REVIEW"
      ? body.status
      : null;
  if (!id || !status) {
    return NextResponse.json(
      {
        success: false,
        error: "id and status required (or action=add_candidates)",
      },
      { status: 400 }
    );
  }
  try {
    await prisma.sourceDiscoveryCandidate.update({
      where: { id },
      data: {
        status,
        reviewNotes:
          typeof body.reviewNotes === "string"
            ? body.reviewNotes.slice(0, 2000)
            : undefined,
      },
    });
    return NextResponse.json({ success: true, crawlEnabled: false });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "update_failed",
      },
      { status: 500 }
    );
  }
}
