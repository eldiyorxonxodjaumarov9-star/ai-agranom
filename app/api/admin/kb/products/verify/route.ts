import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/agronom/admin-auth";
import { getPrisma, isDatabaseConfigured } from "@/server/kb/db/client";
import { verifyProductRecord } from "@/server/kb/products/verify";
import { isTrustedOfficialHost } from "@/server/kb/products/official-hosts";
import { evaluateProductRecommendation } from "@/server/kb/products/recommend-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/kb/products/verify
 * Fail-closed attestation using persisted OfficialSourceDocument only.
 * Body may include: { productId, confirm: true }
 * Ignored if present: trustedOfficialSource, adminApproved, verifiedBy, verifiedAt, free-text sourceDocumentId
 */
export async function POST(request: NextRequest) {
  const auth = authenticateAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json(auth.response, {
      status: auth.status || 401,
    });
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

  if (body.confirm !== true) {
    return NextResponse.json(
      { success: false, error: "confirm_required" },
      { status: 400 }
    );
  }

  const productId = String(body.productId || "").trim();
  if (!productId) {
    return NextResponse.json(
      { success: false, error: "productId_required" },
      { status: 400 }
    );
  }

  // Explicitly ignore client-supplied attestation claims
  void body.trustedOfficialSource;
  void body.adminApproved;
  void body.verifiedBy;
  void body.verifiedAt;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      registrations: true,
      activeIngredient: true,
    },
  });
  if (!product || product.deletedAt) {
    return NextResponse.json(
      { success: false, error: "product_not_found" },
      { status: 404 }
    );
  }

  const reg = product.registrations[0];
  if (!reg) {
    return NextResponse.json(
      {
        success: false,
        error: "trusted_provenance_not_found",
        detail: "no_registration",
      },
      { status: 422 }
    );
  }

  const docId = product.sourceDocumentId?.trim();
  if (!docId) {
    return NextResponse.json(
      {
        success: false,
        error: "trusted_provenance_not_found",
        detail: "product_missing_sourceDocumentId",
      },
      { status: 422 }
    );
  }

  let doc: {
    id: string;
    country: string;
    officialHost: string;
    sha256: string;
    reviewStatus: string;
    importedAt: Date;
  } | null = null;
  try {
    doc = await prisma.officialSourceDocument.findUnique({
      where: { id: docId },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "trusted_provenance_not_found",
        detail: "source_document_table_unavailable",
      },
      { status: 422 }
    );
  }

  if (!doc || doc.reviewStatus !== "APPROVED") {
    return NextResponse.json(
      {
        success: false,
        error: "trusted_provenance_not_found",
        detail: !doc ? "unknown_sourceDocumentId" : "source_not_approved",
      },
      { status: 422 }
    );
  }

  if (!isTrustedOfficialHost(doc.officialHost)) {
    return NextResponse.json(
      {
        success: false,
        error: "trusted_provenance_not_found",
        detail: "official_host_not_trusted",
      },
      { status: 422 }
    );
  }

  if (doc.country !== reg.registrationCountry) {
    return NextResponse.json(
      {
        success: false,
        error: "trusted_provenance_not_found",
        detail: "country_mismatch",
      },
      { status: 422 }
    );
  }

  // Product checksum must match document binding (same import provenance)
  if (
    product.checksum &&
    doc.sha256 &&
    !doc.sha256.startsWith(product.checksum) &&
    product.checksum !== doc.sha256.slice(0, 16) &&
    product.checksum !== doc.sha256
  ) {
    // Allow either full sha or short checksum prefix used at import
    const bound =
      doc.sha256.slice(0, 16) === product.checksum ||
      doc.sha256 === product.checksum;
    if (!bound) {
      return NextResponse.json(
        {
          success: false,
          error: "trusted_provenance_not_found",
          detail: "checksum_not_bound_to_document",
        },
        { status: 422 }
      );
    }
  }

  const verifiedAt = new Date();
  const actorHash = auth.actorHash;

  const outcome = verifyProductRecord({
    registryRecordExists: true,
    registrationNumber: reg.registrationNumber,
    registrationCountry: reg.registrationCountry,
    manufacturer: product.manufacturer,
    activeIngredient: product.activeIngredient?.name,
    formulation: product.formulation,
    approvedCrops: reg.approvedCrops || [],
    approvedTargets: reg.approvedTargets || [],
    labelUrl: product.labelUrl,
    expiresAt: reg.expiresAt,
    sourceChecksum: product.checksum || reg.checksum,
    sourceDocumentId: doc.id,
    sourceDocumentSha256: doc.sha256,
    sourceDocumentCountry: doc.country,
    trustedOfficialSource: true,
    officialHostTrusted: true,
    adminApproved: true,
    verifiedBy: actorHash,
    verifiedAt,
    registrationStatus: reg.registrationStatus,
    filename: null,
  });

  if (outcome.status !== "VERIFIED") {
    return NextResponse.json(
      {
        success: false,
        error: "verification_checklist_failed",
        reasons: outcome.reasons,
      },
      { status: 422 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          status: "VERIFIED",
          registrationStatus: "ACTIVE",
          labelVerified: true,
          adminApproved: true,
          verifiedBy: actorHash,
          verifiedAt,
          lastVerifiedAt: verifiedAt,
          sourceDocumentId: doc!.id,
          qualityScore: 90,
        },
      });
      await tx.productRegistration.update({
        where: { id: reg.id },
        data: {
          status: "VERIFIED",
          registrationStatus: "ACTIVE",
          lastVerifiedAt: verifiedAt,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          actorHash,
          action: "product_admin_verify",
          entityType: "product",
          entityId: productId,
          detail: {
            sourceDocumentId: doc!.id,
            officialHost: doc!.officialHost,
            status: "VERIFIED",
          },
        },
      });
    });
  } catch (e) {
    console.error(
      "[admin/kb/products/verify] tx_failed",
      e instanceof Error ? e.message : "error"
    );
    return NextResponse.json(
      { success: false, error: "verify_transaction_failed" },
      { status: 500 }
    );
  }

  const gate = evaluateProductRecommendation({
    registryRecordExists: true,
    registrationNumber: reg.registrationNumber,
    registrationCountry: reg.registrationCountry,
    manufacturer: product.manufacturer,
    activeIngredient: product.activeIngredient?.name,
    formulation: product.formulation,
    approvedCrops: reg.approvedCrops || [],
    approvedTargets: reg.approvedTargets || [],
    labelUrl: product.labelUrl,
    expiresAt: reg.expiresAt,
    sourceChecksum: product.checksum,
    sourceDocumentId: doc.id,
    sourceDocumentSha256: doc.sha256,
    sourceDocumentCountry: doc.country,
    trustedOfficialSource: true,
    officialHostTrusted: true,
    adminApproved: true,
    verifiedBy: actorHash,
    verifiedAt,
    registrationStatus: "ACTIVE",
    productStatus: "VERIFIED",
    labelVerified: true,
  });

  return NextResponse.json({
    success: true,
    productId,
    status: "VERIFIED",
    labelVerified: true,
    registrationStatus: "ACTIVE",
    canRecommend: gate.allowed,
    verifiedBy: actorHash,
  });
}
