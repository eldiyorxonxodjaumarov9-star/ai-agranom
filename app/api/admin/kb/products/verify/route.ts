import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/agronom/admin-auth";
import { getPrisma, isDatabaseConfigured } from "@/server/kb/db/client";
import { verifyProductRecord } from "@/server/kb/products/verify";
import { evaluateProductRecommendation } from "@/server/kb/products/recommend-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/kb/products/verify
 * Explicit admin attestation — only path that may set VERIFIED.
 * { productId, verifiedBy, trustedOfficialSource, sourceDocumentId, confirm: true }
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

  if (body.confirm !== true) {
    return NextResponse.json(
      { success: false, error: "confirm_required" },
      { status: 400 }
    );
  }

  const productId = String(body.productId || "");
  const verifiedBy = String(body.verifiedBy || auth.keyFingerprint || "").trim();
  const sourceDocumentId = String(body.sourceDocumentId || "").trim();
  const trustedOfficialSource = body.trustedOfficialSource === true;

  if (!productId || !verifiedBy || !sourceDocumentId || !trustedOfficialSource) {
    return NextResponse.json(
      {
        success: false,
        error: "productId_verifiedBy_sourceDocumentId_trustedOfficialSource_required",
      },
      { status: 400 }
    );
  }

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
  const verifiedAt = new Date();
  const outcome = verifyProductRecord({
    registryRecordExists: Boolean(reg),
    registrationNumber: reg?.registrationNumber,
    registrationCountry: reg?.registrationCountry,
    manufacturer: product.manufacturer,
    activeIngredient: product.activeIngredient?.name,
    formulation: product.formulation,
    approvedCrops: reg?.approvedCrops || [],
    approvedTargets: reg?.approvedTargets || [],
    labelUrl: product.labelUrl,
    expiresAt: reg?.expiresAt,
    sourceChecksum: product.checksum || reg?.checksum,
    sourceDocumentId,
    trustedOfficialSource: true,
    adminApproved: true,
    verifiedBy,
    verifiedAt,
    registrationStatus: reg?.registrationStatus || "ACTIVE",
  });

  if (outcome.status !== "VERIFIED" || !outcome.canRecommend) {
    return NextResponse.json(
      {
        success: false,
        error: "verification_checklist_failed",
        outcome,
      },
      { status: 422 }
    );
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      status: "VERIFIED",
      registrationStatus: "ACTIVE",
      labelVerified: true,
      adminApproved: true,
      verifiedBy,
      verifiedAt,
      lastVerifiedAt: verifiedAt,
      sourceDocumentId,
      qualityScore: 90,
    },
  });
  if (reg) {
    await prisma.productRegistration.update({
      where: { id: reg.id },
      data: {
        status: "VERIFIED",
        registrationStatus: "ACTIVE",
        lastVerifiedAt: verifiedAt,
      },
    });
  }

  await prisma.adminAuditLog.create({
    data: {
      actorHash: auth.keyFingerprint,
      action: "product_admin_verify",
      entityType: "product",
      entityId: productId,
      detail: {
        verifiedBy,
        sourceDocumentId,
        status: "VERIFIED",
      },
    },
  });

  const gate = evaluateProductRecommendation({
    registryRecordExists: true,
    registrationNumber: reg?.registrationNumber,
    registrationCountry: reg?.registrationCountry,
    manufacturer: product.manufacturer,
    activeIngredient: product.activeIngredient?.name,
    formulation: product.formulation,
    approvedCrops: reg?.approvedCrops || [],
    approvedTargets: reg?.approvedTargets || [],
    labelUrl: product.labelUrl,
    expiresAt: reg?.expiresAt,
    sourceChecksum: product.checksum,
    sourceDocumentId,
    trustedOfficialSource: true,
    adminApproved: true,
    verifiedBy,
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
  });
}
