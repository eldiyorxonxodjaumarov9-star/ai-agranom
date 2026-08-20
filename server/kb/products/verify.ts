/**
 * Product verification — fail-closed.
 * VERIFIED requires persisted OfficialSourceDocument (APPROVED) + field checklist.
 * Request booleans / verifiedBy from client are never trusted.
 */
import { parseOfficialLabelUrl } from "./official-hosts";

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
  /** Must come from persisted ProductRegistration — not request override */
  registrationStatus?: string | null;
  labelUrl?: string | null;
  officialPdfUrl?: string | null;
  expiresAt?: string | Date | null;
  revoked?: boolean;
  sourceChecksum?: string | null;
  /** Must match OfficialSourceDocument.id */
  sourceDocumentId?: string | null;
  /** Server-loaded from OfficialSourceDocument.reviewStatus === APPROVED */
  trustedOfficialSource?: boolean;
  officialHostTrusted?: boolean;
  sourceDocumentSha256?: string | null;
  sourceDocumentCountry?: string | null;
  /** Server auth actor only */
  adminApproved?: boolean;
  verifiedBy?: string | null;
  verifiedAt?: string | Date | null;
  conflictingEvidence?: boolean;
  filename?: string | null;
  importKind?: string | null;
  requestCropId?: string | null;
  requestTarget?: string | null;
  requestRegion?: string | null;
};

export type ProductVerifyStatus =
  | "VERIFIED"
  | "NEEDS_REVIEW"
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

export function isFixtureOrSampleFilename(filename?: string | null): boolean {
  if (!filename?.trim()) return false;
  return FIXTURE_NAME_RE.test(filename);
}

export function isPlaceholderLabelUrl(url?: string | null): boolean {
  return !parseOfficialLabelUrl(url).ok;
}

function requireNonEmpty(
  value: string | null | undefined,
  matches: boolean | null | undefined,
  label: string,
  reasons: string[]
): void {
  const present = Boolean(value?.trim());
  if (!present) {
    reasons.push(`Missing/failed: ${label}`);
    return;
  }
  if (matches === false) {
    reasons.push(`Missing/failed: ${label} mismatch`);
  }
}

function parseFutureExpiry(
  expiresAt: string | Date | null | undefined
): { ok: true; date: Date } | { ok: false; reason: string } {
  if (expiresAt == null || expiresAt === "") {
    return { ok: false, reason: "Missing/failed: expiry / validity date" };
  }
  const d = expiresAt instanceof Date ? expiresAt : new Date(String(expiresAt));
  if (Number.isNaN(d.getTime())) {
    return { ok: false, reason: "Missing/failed: expiry date unparseable" };
  }
  if (d.getTime() <= Date.now()) {
    return { ok: false, reason: "Registration expired" };
  }
  return { ok: true, date: d };
}

export function verifyProductRecord(
  input: ProductVerifyInput
): ProductVerifyResult {
  const reasons: string[] = [];

  if (input.revoked || input.registrationStatus === "REVOKED") {
    return {
      status: "REVOKED",
      registrationStatus: "REVOKED",
      labelVerified: false,
      reasons: ["Registry marks product as revoked"],
      canRecommend: false,
      doseAllowed: false,
    };
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

  const expiry = parseFutureExpiry(input.expiresAt);
  if (!expiry.ok) {
    if (expiry.reason === "Registration expired") {
      return {
        status: "EXPIRED",
        registrationStatus: "EXPIRED",
        labelVerified: false,
        reasons: [expiry.reason],
        canRecommend: false,
        doseAllowed: false,
      };
    }
    reasons.push(expiry.reason);
  }

  const fixtureFile = isFixtureOrSampleFilename(input.filename);
  if (fixtureFile) {
    reasons.push("fixture/sample/test filename cannot be VERIFIED");
  }

  if (!input.registryRecordExists) {
    reasons.push("Missing/failed: official registry record");
  }
  if (!input.registrationNumber?.trim()) {
    reasons.push("Missing/failed: registration number");
  }
  if (!input.registrationCountry?.trim()) {
    reasons.push("Missing/failed: registration country");
  }

  requireNonEmpty(
    input.manufacturer,
    input.manufacturerMatches,
    "manufacturer",
    reasons
  );
  requireNonEmpty(
    input.activeIngredient,
    input.activeIngredientMatches,
    "active ingredient",
    reasons
  );
  requireNonEmpty(
    input.formulation,
    input.formulationMatches,
    "formulation",
    reasons
  );

  if (!input.approvedCrops?.length) {
    reasons.push("Missing/failed: approved crops");
  }
  if (!input.approvedTargets?.length) {
    reasons.push("Missing/failed: approved targets");
  }

  const label = parseOfficialLabelUrl(input.labelUrl || input.officialPdfUrl);
  if (!label.ok) {
    reasons.push(`Missing/failed: official label (${label.reason})`);
  }

  if (!input.sourceChecksum?.trim()) {
    reasons.push("Missing/failed: source checksum");
  }
  if (!input.sourceDocumentId?.trim()) {
    reasons.push("Missing/failed: source document ID");
  }
  if (!input.sourceDocumentSha256?.trim()) {
    reasons.push("Missing/failed: source document SHA-256");
  }
  if (input.trustedOfficialSource !== true) {
    reasons.push("Missing/failed: trusted official source document not APPROVED");
  }
  if (input.officialHostTrusted !== true) {
    reasons.push("Missing/failed: official host not trusted");
  }
  if (
    input.sourceDocumentCountry &&
    input.registrationCountry &&
    input.sourceDocumentCountry !== input.registrationCountry
  ) {
    reasons.push("Missing/failed: source document country mismatch");
  }

  // Persisted registration must already be ACTIVE — never trust request override alone
  if (input.registrationStatus !== "ACTIVE") {
    reasons.push("Missing/failed: persisted registration status not ACTIVE");
  }

  const adminOk =
    input.adminApproved === true &&
    Boolean(input.verifiedBy?.trim()) &&
    Boolean(input.verifiedAt);
  if (!adminOk) {
    reasons.push("Missing/failed: admin attestation (server actor)");
  }

  if (reasons.length > 0) {
    const missingCount = reasons.filter((r) =>
      r.startsWith("Missing/failed:")
    ).length;
    return {
      status: missingCount >= 6 ? "INCOMPLETE" : "NEEDS_REVIEW",
      registrationStatus: "UNKNOWN",
      labelVerified: false,
      reasons,
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

  const doseAllowed = Boolean(input.concentration?.trim());

  return {
    status: "VERIFIED",
    registrationStatus: "ACTIVE",
    labelVerified: true,
    reasons:
      recReasons.length > 0
        ? ["All verification checks passed", ...recReasons]
        : ["All verification checks passed"],
    canRecommend,
    doseAllowed,
  };
}

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
