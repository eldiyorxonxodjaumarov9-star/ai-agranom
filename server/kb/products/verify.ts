/**
 * Product verification — never auto-VERIFIED without checklist.
 */
export type ProductVerifyInput = {
  registryRecordExists: boolean;
  registrationNumber?: string | null;
  manufacturerMatches?: boolean | null;
  activeIngredientMatches?: boolean | null;
  formulationMatches?: boolean | null;
  approvedCrops?: string[] | null;
  approvedTargets?: string[] | null;
  labelUrl?: string | null;
  officialPdfUrl?: string | null;
  expiresAt?: string | Date | null;
  revoked?: boolean;
  sourceChecksum?: string | null;
  conflictingEvidence?: boolean;
};

export type ProductVerifyResult = {
  status: "VERIFIED" | "NEEDS_REVIEW" | "CONFLICT" | "EXPIRED" | "REVOKED";
  registrationStatus: "ACTIVE" | "EXPIRED" | "REVOKED" | "UNKNOWN";
  labelVerified: boolean;
  reasons: string[];
  canRecommend: boolean;
};

export function verifyProductRecord(input: ProductVerifyInput): ProductVerifyResult {
  const reasons: string[] = [];

  if (input.revoked) {
    return {
      status: "REVOKED",
      registrationStatus: "REVOKED",
      labelVerified: false,
      reasons: ["Registry marks product as revoked"],
      canRecommend: false,
    };
  }

  if (input.expiresAt) {
    const exp = new Date(input.expiresAt);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      return {
        status: "EXPIRED",
        registrationStatus: "EXPIRED",
        labelVerified: false,
        reasons: ["Registration expired"],
        canRecommend: false,
      };
    }
  }

  if (input.conflictingEvidence) {
    return {
      status: "CONFLICT",
      registrationStatus: "UNKNOWN",
      labelVerified: false,
      reasons: ["Conflicting evidence across sources"],
      canRecommend: false,
    };
  }

  const checks: Array<[boolean, string]> = [
    [input.registryRecordExists, "official registry record"],
    [Boolean(input.registrationNumber?.trim()), "registration number"],
    [input.manufacturerMatches !== false, "manufacturer"],
    [input.activeIngredientMatches !== false, "active ingredient"],
    [input.formulationMatches !== false, "formulation"],
    [Boolean(input.approvedCrops && input.approvedCrops.length > 0), "approved crops"],
    [Boolean(input.approvedTargets && input.approvedTargets.length > 0), "approved targets"],
    [
      Boolean(input.labelUrl?.startsWith("http") || input.officialPdfUrl?.startsWith("http")),
      "label/PDF URL",
    ],
    [Boolean(input.sourceChecksum), "source checksum"],
  ];

  for (const [ok, label] of checks) {
    if (!ok) reasons.push(`Missing/failed: ${label}`);
  }

  if (reasons.length > 0) {
    return {
      status: "NEEDS_REVIEW",
      registrationStatus: "UNKNOWN",
      labelVerified: false,
      reasons,
      canRecommend: false,
    };
  }

  return {
    status: "VERIFIED",
    registrationStatus: "ACTIVE",
    labelVerified: true,
    reasons: ["All verification checks passed"],
    canRecommend: true,
  };
}

export const DOSE_DISCLAIMER_UZ =
  "Dozani mahsulotning rasmiy yorlig‘i va mahalliy agronom ko‘rsatmasi bo‘yicha aniqlang.";
