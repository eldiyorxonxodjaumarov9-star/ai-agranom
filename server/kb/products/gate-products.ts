/**
 * Server-side product gating for chat/vision — never trust model product names.
 */
import { getPrisma, isDatabaseConfigured } from "../db/client";
import { evaluateProductRecommendation } from "./recommend-gate";
import { sanitizeDisplayText } from "@/lib/agronom/display-sanitize";

export type GatedProduct = {
  id: string;
  name: string;
  formulation: string | null;
  manufacturer: string | null;
  registrationNumber: string | null;
  registrationCountry: string | null;
};

const COMMERCIAL_CLAIM_RE =
  /\b(rasmiy\s+tasdiqlangan|officially\s+approved|guvohnoma\s+bilan\s+tasdiqlangan|PHI\b|pre[- ]?harvest|doza\s*:|dose\s*:)\b/gi;

/** Strip commercial product claims when no gated products. */
export function stripUngatedProductClaims(displayText: string): string {
  let t = sanitizeDisplayText(displayText);
  // Remove lines that look like product recommendation blocks when empty gate
  t = t
    .split(/\n/)
    .filter((line) => {
      const l = line.toLowerCase();
      if (/tavsiya\s+etiladigan\s+preparat|recommended\s+product/i.test(l))
        return false;
      if (/\b\d+\s*(ml|g|kg|l)\s*\/\s*(ha|l|100\s*l)/i.test(l)) return false;
      return true;
    })
    .join("\n");
  t = t.replace(COMMERCIAL_CLAIM_RE, "");
  return sanitizeDisplayText(t);
}

export function renderGatedProductsSection(
  products: GatedProduct[],
  language = "uz"
): string {
  if (!products.length) return "";
  const header =
    language === "ru"
      ? "Зарегистрированные препараты (только проверенные):"
      : language === "en"
        ? "Registered products (verified only):"
        : "Ro‘yxatdan o‘tgan preparatlar (faqat tasdiqlangan):";
  const lines = products.map((p, i) => {
    const reg = p.registrationNumber
      ? ` (${p.registrationCountry || "—"} ${p.registrationNumber})`
      : "";
    const form = p.formulation ? `, ${p.formulation}` : "";
    return `${i + 1}. ${p.name}${form}${reg}`;
  });
  const disclaimer =
    language === "en"
      ? "Use only the official label rate; never invent dosages."
      : "Dozani faqat rasmiy yorliq bo‘yicha qo‘llang; doza o‘ylab topilmaydi.";
  return `\n\n${header}\n${lines.join("\n")}\n${disclaimer}`;
}

export async function gateProductCandidates(input: {
  candidateIds: string[];
  requestCropId?: string | null;
  requestTarget?: string | null;
}): Promise<GatedProduct[]> {
  if (!input.candidateIds.length || !isDatabaseConfigured()) return [];
  const prisma = getPrisma();
  if (!prisma) return [];

  const ids = [...new Set(input.candidateIds.map((x) => x.trim()).filter(Boolean))].slice(
    0,
    12
  );
  if (!ids.length) return [];

  let products: Array<{
    id: string;
    name: string;
    formulation: string | null;
    manufacturer: string | null;
    status: string;
    registrationStatus: string;
    labelVerified: boolean;
    labelUrl: string | null;
    checksum: string | null;
    sourceDocumentId: string | null;
    adminApproved: boolean;
    verifiedBy: string | null;
    verifiedAt: Date | null;
    activeIngredient: { name: string } | null;
    registrations: Array<{
      registrationNumber: string;
      registrationCountry: string;
      approvedCrops: string[];
      approvedTargets: string[];
      expiresAt: Date | null;
      registrationStatus: string;
      checksum: string | null;
    }>;
  }> = [];

  try {
    products = await prisma.product.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        status: "VERIFIED",
        registrationStatus: "ACTIVE",
        labelVerified: true,
        adminApproved: true,
      },
      include: {
        activeIngredient: { select: { name: true } },
        registrations: true,
      },
    });
  } catch {
    return [];
  }

  const out: GatedProduct[] = [];
  for (const p of products) {
    const reg = p.registrations.find((r) => r.registrationStatus === "ACTIVE");
    if (!reg) continue;

    let docOk = false;
    if (p.sourceDocumentId) {
      try {
        const doc = await prisma.officialSourceDocument.findUnique({
          where: { id: p.sourceDocumentId },
        });
        docOk = Boolean(
          doc &&
            doc.reviewStatus === "APPROVED" &&
            doc.country === reg.registrationCountry
        );
      } catch {
        docOk = false;
      }
    }
    if (!docOk) continue;

    const gate = evaluateProductRecommendation({
      registryRecordExists: true,
      registrationNumber: reg.registrationNumber,
      registrationCountry: reg.registrationCountry,
      manufacturer: p.manufacturer,
      activeIngredient: p.activeIngredient?.name,
      formulation: p.formulation,
      approvedCrops: reg.approvedCrops,
      approvedTargets: reg.approvedTargets,
      labelUrl: p.labelUrl,
      expiresAt: reg.expiresAt,
      sourceChecksum: p.checksum || reg.checksum,
      sourceDocumentId: p.sourceDocumentId,
      sourceDocumentSha256: "persisted",
      sourceDocumentCountry: reg.registrationCountry,
      trustedOfficialSource: true,
      officialHostTrusted: true,
      adminApproved: true,
      verifiedBy: p.verifiedBy,
      verifiedAt: p.verifiedAt,
      registrationStatus: "ACTIVE",
      productStatus: "VERIFIED",
      labelVerified: true,
      requestCropId: input.requestCropId,
      requestTarget: input.requestTarget,
    });
    if (!gate.allowed) continue;

    out.push({
      id: p.id,
      name: p.name,
      formulation: p.formulation,
      manufacturer: p.manufacturer,
      registrationNumber: reg.registrationNumber,
      registrationCountry: reg.registrationCountry,
    });
  }
  return out;
}

export async function applyProductGateToAnswer(input: {
  displayText: string;
  candidateIds: string[];
  language?: string;
  requestCropId?: string | null;
  requestTarget?: string | null;
}): Promise<{ displayText: string; products: GatedProduct[] }> {
  const products = await gateProductCandidates({
    candidateIds: input.candidateIds,
    requestCropId: input.requestCropId,
    requestTarget: input.requestTarget,
  });
  let displayText = sanitizeDisplayText(input.displayText);
  if (!products.length) {
    displayText = stripUngatedProductClaims(displayText);
    return { displayText, products: [] };
  }
  // Deterministic appendix — do not trust model product section
  displayText = stripUngatedProductClaims(displayText);
  displayText += renderGatedProductsSection(products, input.language || "uz");
  return { displayText: sanitizeDisplayText(displayText), products };
}
