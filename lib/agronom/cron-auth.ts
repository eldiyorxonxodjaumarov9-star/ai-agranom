import { createHash, timingSafeEqual as cryptoTimingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return cryptoTimingSafeEqual(ba, bb);
}

export type CronAuthResult =
  | { ok: true; via: "cron_secret" | "agro_api_key"; fingerprint: string }
  | { ok: false; reason: "missing" | "invalid" | "misconfigured"; fingerprint: string };

/**
 * Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
 * Prefer CRON_SECRET. AGRO_API_KEY only when KB_CRON_ALLOW_AGRO_KEY=1.
 * Never logs secret values — only SHA-256 fingerprints.
 */
export function authorizeCronRequest(request: NextRequest): CronAuthResult {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const fingerprint = createHash("sha256")
    .update(authHeader || "none")
    .digest("hex")
    .slice(0, 12);

  if (!token) {
    return { ok: false, reason: "missing", fingerprint };
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && timingSafeEqual(token, cronSecret)) {
    return { ok: true, via: "cron_secret", fingerprint };
  }

  const allowAgro = process.env.KB_CRON_ALLOW_AGRO_KEY === "1";
  const agroKey = process.env.AGRO_API_KEY?.trim();
  if (
    allowAgro &&
    agroKey &&
    agroKey !== "super_secret_api_key_here" &&
    timingSafeEqual(token, agroKey)
  ) {
    return { ok: true, via: "agro_api_key", fingerprint };
  }

  if (!cronSecret && !allowAgro) {
    return { ok: false, reason: "misconfigured", fingerprint };
  }

  return { ok: false, reason: "invalid", fingerprint };
}

export function logCronUnauthorized(
  route: string,
  result: Extract<CronAuthResult, { ok: false }>
): void {
  console.warn(`[cron] unauthorized`, {
    route,
    reason: result.reason,
    authFp: result.fingerprint,
  });
}
