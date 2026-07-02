import { createHash } from "crypto";

const UNAUTHORIZED = {
  success: false as const,
  error: "Unauthorized",
};

export function extractBearerToken(
  authHeader: string | null
): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

export function verifyApiKey(token: string | null): boolean {
  const expected = process.env.AGRO_API_KEY;

  if (!expected || expected === "super_secret_api_key_here") {
    console.error("[auth] AGRO_API_KEY is not configured");
    return false;
  }

  if (!token) return false;

  // Constant-time comparison
  if (token.length !== expected.length) return false;

  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  return mismatch === 0;
}

export function authenticateRequest(
  authHeader: string | null
): { ok: true; keyFingerprint: string } | { ok: false; response: typeof UNAUTHORIZED } {
  const token = extractBearerToken(authHeader);

  if (!verifyApiKey(token)) {
    return { ok: false, response: UNAUTHORIZED };
  }

  const keyFingerprint = token
    ? createHash("sha256").update(token).digest("hex").slice(0, 12)
    : "unknown";

  return { ok: true, keyFingerprint };
}
