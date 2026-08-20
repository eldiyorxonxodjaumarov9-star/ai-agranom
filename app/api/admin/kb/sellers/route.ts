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

/**
 * Admin seller / agro-dorixona domain allowlist.
 * Domains must be provided by the operator — never invent commercial sites.
 */
export async function GET(request: NextRequest) {
  const auth = authenticateAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json(auth.response, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      success: true,
      sellers: [],
      sources: [],
      note: "database_not_configured",
      awaitingDomains: true,
    });
  }
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: true, sellers: [], sources: [] });
  }
  try {
    const [sellers, sources] = await Promise.all([
      prisma.seller.findMany({ orderBy: { updatedAt: "desc" }, take: 100 }),
      prisma.sellerSource.findMany({
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
    ]);
    return NextResponse.json({
      success: true,
      sellers,
      sources,
      awaitingDomains: sources.length === 0,
      note:
        sources.length === 0
          ? "No seller domains yet. Provide real agro-pharmacy site list via POST."
          : undefined,
    });
  } catch {
    return NextResponse.json({
      success: true,
      sellers: [],
      sources: [],
      note: "table_pending_migration",
      awaitingDomains: true,
    });
  }
}

/**
 * POST { action: 'add_domain', domain|url, sellerName?, enabled?, crawlDelayMs? }
 * POST { action: 'set_enabled', domain, enabled }
 */
export async function POST(request: NextRequest) {
  const auth = authenticateAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json(auth.response, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: "database_not_configured" },
      { status: 503 }
    );
  }
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: "no_prisma" },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action || "add_domain");

  try {
    if (action === "set_enabled") {
      const domain = normalizeDomain(String(body.domain || ""));
      if (!domain) {
        return NextResponse.json(
          { success: false, error: "domain required" },
          { status: 400 }
        );
      }
      const enabled = Boolean(body.enabled);
      const source = await prisma.sellerSource.update({
        where: { domain },
        data: { enabled },
      });
      return NextResponse.json({ success: true, source });
    }

    const raw = String(body.domain || body.url || "");
    const domain = normalizeDomain(raw);
    if (!domain || domain.length < 3 || !domain.includes(".")) {
      return NextResponse.json(
        {
          success: false,
          error: "valid_domain_required",
          hint: "Send a real seller hostname, e.g. example-agro.uz — do not invent domains in code.",
        },
        { status: 400 }
      );
    }

    const sellerName =
      typeof body.sellerName === "string" && body.sellerName.trim()
        ? body.sellerName.trim()
        : domain;
    const baseUrl =
      typeof body.url === "string" && body.url.includes("://")
        ? body.url
        : `https://${domain}/`;
    const enabled = body.enabled === true; // default off until robots/ToS reviewed
    const crawlDelayMs =
      typeof body.crawlDelayMs === "number" && body.crawlDelayMs >= 1000
        ? Math.min(body.crawlDelayMs, 60_000)
        : 3000;

    let seller = await prisma.seller.findFirst({
      where: { name: sellerName },
    });
    if (!seller) {
      seller = await prisma.seller.create({
        data: {
          name: sellerName,
          country: "UZ",
          verified: false,
          status: "NEEDS_REVIEW",
        },
      });
    }

    const source = await prisma.sellerSource.upsert({
      where: { domain },
      create: {
        sellerId: seller.id,
        domain,
        baseUrl,
        sourceType: "SELLER_OFFER",
        enabled,
        robotsStatus: "unknown",
        tosStatus: "unknown",
        crawlDelayMs,
        parserVersion: "1",
        licenseNote:
          "Admin allowlist only. Seller offers never verify PPP registration.",
      },
      update: {
        sellerId: seller.id,
        baseUrl,
        enabled,
        crawlDelayMs,
      },
    });

    console.info("[admin/kb/sellers]", {
      by: auth.keyFingerprint,
      domain,
      enabled: source.enabled,
    });

    return NextResponse.json({
      success: true,
      seller,
      source,
      note: enabled
        ? "Domain enabled — ensure robots/ToS allow commercial fetch before crawl."
        : "Domain saved disabled. Enable after robots/ToS review.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "seller_upsert_failed",
      },
      { status: 500 }
    );
  }
}
