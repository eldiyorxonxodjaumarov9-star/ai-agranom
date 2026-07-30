import { createHash, timingSafeEqual } from "crypto";

const UNAUTHORIZED = {
  success: false as const,
  error: "Unauthorized",
};

const PLACEHOLDER_KEYS = new Set([
  "super_secret_api_key_here",
  "your_api_key_here",
  "",
]);

/**
 * Read AGRO_API_KEY at runtime (dynamic key access).
 * Never log the value — only presence.
 */
export function getAgroApiKeyStatus(): "detected" | "missing" {
  const key = readAgroApiKey();
  return key && !PLACEHOLDER_KEYS.has(key) ? "detected" : "missing";
}

function readAgroApiKey(): string {
  // Bracket access + runtime read — avoid build-time secret inlining.
  const raw = process.env["AGRO_API_KEY"];
  if (typeof raw !== "string") return "";
  return raw
    .replace(/^\uFEFF/, "") // BOM
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .replace(/^["']|["']$/g, ""); // dashboard accidental quotes
}

export function extractBearerToken(
  authHeader: string | null
): string | null {
  if (!authHeader || typeof authHeader !== "string") return null;
  // Case-insensitive "Bearer", allow extra whitespace
  const m = /^Bearer\s+(\S+)/i.exec(authHeader.trim());
  if (!m) return null;
  const token = m[1].trim();
  return token || null;
}

export function verifyApiKey(token: string | null): boolean {
  const expected = readAgroApiKey();

  if (!expected || PLACEHOLDER_KEYS.has(expected)) {
    console.error("[auth] AGRO_API_KEY env missing");
    return false;
  }

  if (!token) return false;

  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
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
