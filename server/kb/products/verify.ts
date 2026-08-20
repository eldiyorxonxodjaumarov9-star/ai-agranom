/**
 * Product verification — never auto-VERIFIED from CSV/upload alone.
 * VERIFIED requires trusted official provenance + admin attestation.
 */
export type ProductVerifyInput = {
  registryRecordExists: boolean;
  registrationNumber?: string | null;
  registrationCountry?: string | null;
  manufacturer?: string | null;
  manufacturerMatches?: boolean | null;
  activeIngredient?: string | null;
  activeIngredientMatches?: boolean | null;
  concentration?: string | null;
  formulation?: string | null;
  formulationMatches?: boolean | null;
  approvedCrops?: string[] | null;
  approvedTargets?: string[] | null;
  registrationStatus?: string | null;
  labelUrl?: string | null;
  officialPdfUrl?: string | null;
  expiresAt?: string | Date | null;
  revoked?: boolean;
  sourceChecksum?: string | null;
  sourceDocumentId?: string | null;
  trustedOfficialSource?: boolean;
  /** Explicit admin attestation — required for VERIFIED */
  adminApproved?: boolean;
  verifiedBy?: string | null;
  verifiedAt?: string | Date | null;
  lastVerifiedAt?: string | Date | null;
  conflictingEvidence?: boolean;
  /** Filename / provenance guards */
  filename?: string | null;
  importKind?: string | null;
  /** Recommendation context */
  requestCropId?: string | null;
  requestTarget?: string | null;
  requestRegion?: string | null;
};

export type ProductVerifyStatus =
  | "VERIFIED"
  | "NEEDS_REVIEW"
  | "AI_PARSED"
  | "CONFLICT"
  | "EXPIRED"
  | "REVOKED"
  | "INCOMPLETE";

export type ProductVerifyResult = {
  status: ProductVerifyStatus;
  registrationStatus: "ACTIVE" | "EXPIRED" | "REVOKED" | "UNKNOWN";
  labelVerified: boolean;
  reasons: string[];
  canRecommend: boolean;
  doseAllowed: boolean;
};

const FIXTURE_NAME_RE = /\b(fixture|sample|test|demo|mock)\b/i;
const PLACEHOLDER_HOST_RE =
  /example\.(gov\.)?uz|example\.com|localhost|127\.0\.0\.1/i;

export function isFixtureOrSampleFilename(filename?: string | null): boolean {
  if (!filename?.trim()) return false;
  return FIXTURE_NAME_RE.test(filename);
}

export function isPlaceholderLabelUrl(url?: string | null): boolean {
  if (!url?.trim()) return true;
  if (!/^https?:\/\//i.test(url)) return true;
  try {
    return PLACEHOLDER_HOST_RE.test(new URL(url).hostname);
  } catch {
    return true;
  }
}

function hasOfficialLabel(input: ProductVerifyInput): boolean {
  const url = input.labelUrl || input.officialPdfUrl;
  return Boolean(url?.startsWith("http") && !isPlaceholderLabelUrl(url));
}

export function verifyProductRecord(
  input: ProductVerifyInput
): ProductVerifyResult {
  const reasons: string[] = [];

  if (input.revoked) {
    return {
      status: "REVOKED",
      registrationStatus: "REVOKED",
      labelVerified: false,
      reasons: ["Registry marks product as revoked"],
      canRecommend: false,
      doseAllowed: false,
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
        doseAllowed: false,
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
      doseAllowed: false,
    };
  }

  const fixtureFile = isFixtureOrSampleFilename(input.filename);
  const fieldChecks: Array<[boolean, string]> = [
    [input.registryRecordExists, "official registry record"],
    [Boolean(input.registrationNumber?.trim()), "registration number"],
    [Boolean(input.registrationCountry?.trim()), "registration country"],
    [
      Boolean(input.manufacturer?.trim()) || input.manufacturerMatches !== false,
      "manufacturer",
    ],
    [
      Boolean(input.activeIngredient?.trim()) ||
        input.activeIngredientMatches !== false,
      "active ingredient",
    ],
    [
      Boolean(input.formulation?.trim()) || input.formulationMatches !== false,
      "formulation",
    ],
    [Boolean(input.approvedCrops && input.approvedCrops.length > 0), "approved crops"],
    [
      Boolean(input.approvedTargets && input.approvedTargets.length > 0),
      "approved targets",
    ],
    [hasOfficialLabel(input), "official (non-placeholder) label/PDF URL"],
    [Boolean(input.sourceChecksum), "source checksum"],
    [Boolean(input.sourceDocumentId?.trim()), "source document ID"],
    [input.trustedOfficialSource === true, "trusted official source"],
    [Boolean(input.expiresAt), "expiry / validity date"],
    [
      input.registrationStatus === "ACTIVE" ||
        input.registrationStatus === "EXPIRED" ||
        input.registrationStatus === "REVOKED",
      "explicit registration status",
    ],
  ];

  for (const [ok, label] of fieldChecks) {
    if (!ok) reasons.push(`Missing/failed: ${label}`);
  }

  if (fixtureFile) {
    reasons.push("fixture/sample/test filename cannot be VERIFIED");
  }

  const adminOk =
    input.adminApproved === true &&
    Boolean(input.verifiedBy?.trim()) &&
    Boolean(input.verifiedAt);

  if (!adminOk) {
    reasons.push("Missing/failed: admin attestation (verifiedBy/verifiedAt)");
  }

  // Upload / parse path: never VERIFIED without full attestation
  if (reasons.length > 0 || !adminOk || fixtureFile) {
    const missingCount = reasons.filter((r) =>
      r.startsWith("Missing/failed:")
    ).length;
    const incomplete =
      missingCount >= 6 ||
      (!input.registryRecordExists && !input.registrationNumber);

    return {
      status: incomplete ? "INCOMPLETE" : "NEEDS_REVIEW",
      registrationStatus: "UNKNOWN",
      labelVerified: false,
      reasons: [
        ...reasons,
        "Imported rows stay NEEDS_REVIEW until admin verify with official provenance",
      ],
      canRecommend: false,
      doseAllowed: false,
    };
  }

  const registrationStatus: ProductVerifyResult["registrationStatus"] =
    input.registrationStatus === "EXPIRED"
      ? "EXPIRED"
      : input.registrationStatus === "REVOKED"
        ? "REVOKED"
        : input.registrationStatus === "ACTIVE"
          ? "ACTIVE"
          : "UNKNOWN";

  if (registrationStatus !== "ACTIVE") {
    return {
      status:
        registrationStatus === "EXPIRED"
          ? "EXPIRED"
          : registrationStatus === "REVOKED"
            ? "REVOKED"
            : "NEEDS_REVIEW",
      registrationStatus:
        registrationStatus === "UNKNOWN" ? "UNKNOWN" : registrationStatus,
      labelVerified: false,
      reasons: ["Registration not ACTIVE"],
      canRecommend: false,
      doseAllowed: false,
    };
  }

  let canRecommend = true;
  const recReasons: string[] = [];

  if (input.requestCropId) {
    const cropOk = (input.approvedCrops || []).some((c) =>
      c.toLowerCase().includes(input.requestCropId!.toLowerCase())
    );
    if (!cropOk) {
      canRecommend = false;
      recReasons.push("crop mismatch");
    }
  }
  if (input.requestTarget) {
    const targetOk = (input.approvedTargets || []).some((t) =>
      t.toLowerCase().includes(input.requestTarget!.toLowerCase())
    );
    if (!targetOk) {
      canRecommend = false;
      recReasons.push("target mismatch");
    }
  }

  const labelVerified = true;
  const doseAllowed =
    labelVerified &&
    hasOfficialLabel(input) &&
    Boolean(input.concentration?.trim());

  return {
    status: "VERIFIED",
    registrationStatus: "ACTIVE",
    labelVerified,
    reasons:
      recReasons.length > 0
        ? ["All verification checks passed", ...recReasons]
        : ["All verification checks passed"],
    canRecommend,
    doseAllowed,
  };
}

/** Chat must never invent doses — only official label text. */
export function formatDoseFromLabel(
  officialDoseText?: string | null
): string | null {
  if (!officialDoseText?.trim()) return null;
  return officialDoseText.trim();
}

export const DOSE_DISCLAIMER_UZ =
  "Dozani mahsulotning rasmiy yorlig‘i va mahalliy agronom ko‘rsatmasi bo‘yicha aniqlang.";

export const DOSE_DISCLAIMER_EN =
  "Use only the official label rate; never invent dosages.";
