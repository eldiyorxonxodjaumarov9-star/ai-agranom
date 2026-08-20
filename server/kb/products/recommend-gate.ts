/**
 * Product recommendation gate for user-facing advice.
 * Seller offers never prove legality — only official registration + verified label.
 */
import { verifyProductRecord, type ProductVerifyInput } from "./verify";

export type RecommendProductInput = ProductVerifyInput & {
  productStatus: "VERIFIED" | "NEEDS_REVIEW" | "REJECTED" | "EXPIRED" | "REVOKED" | "CONFLICT" | string;
  labelVerified: boolean;
  registrationStatus: "ACTIVE" | "EXPIRED" | "REVOKED" | "UNKNOWN" | string;
  bannedActiveIngredient?: boolean;
  offerLastCheckedAt?: string | Date | null;
  offerFreshnessHours?: number;
};

export type RecommendProductResult = {
  allowed: boolean;
  reasons: string[];
  /** Price/stock may be mentioned only when fresh */
  offerFresh: boolean;
};

export function evaluateProductRecommendation(
  input: RecommendProductInput
): RecommendProductResult {
  const reasons: string[] = [];
  const verify = verifyProductRecord(input);

  if (input.productStatus !== "VERIFIED") {
    reasons.push("product_not_verified");
  }
  if (input.registrationStatus !== "ACTIVE") {
    reasons.push("registration_not_active");
  }
  if (!input.labelVerified) {
    reasons.push("label_not_verified");
  }
  if (input.bannedActiveIngredient) {
    reasons.push("banned_active_ingredient");
  }
  if (!verify.canRecommend) {
    reasons.push(...verify.reasons.map((r) => `verify:${r}`));
  }

  const freshnessHours = input.offerFreshnessHours ?? 72;
  let offerFresh = false;
  if (input.offerLastCheckedAt) {
    const t = new Date(input.offerLastCheckedAt).getTime();
    if (!Number.isNaN(t)) {
      offerFresh = Date.now() - t <= freshnessHours * 3600_000;
    }
  }
  if (input.offerLastCheckedAt && !offerFresh) {
    reasons.push("offer_stale");
  }

  const allowed =
    reasons.filter((r) => r !== "offer_stale").length === 0 &&
    verify.canRecommend &&
    input.productStatus === "VERIFIED" &&
    input.registrationStatus === "ACTIVE" &&
    input.labelVerified &&
    !input.bannedActiveIngredient;

  return { allowed, reasons, offerFresh };
}

/** Normalize trade names across uz/ru/kk/ky latin-cyrillic variants (lightweight). */
export function normalizeTradeName(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[''`´ʹʻʼ]/g, "'")
    .replace(/[^\p{L}\p{N}\s.+%-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
