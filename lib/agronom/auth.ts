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
  // Concatenated name prevents Next.js/webpack build-time inlining of the secret.
  const name = ["AGRO", "API", "KEY"].join("_");
  const envBag = process.env as NodeJS.ProcessEnv;
  const raw = envBag[name];
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
  const status = expected && !PLACEHOLDER_KEYS.has(expected) ? "detected" : "missing";

  if (status === "missing") {
    console.error("[auth] AGRO_API_KEY env missing");
    return false;
  }

  if (!token) return false;

  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    // Length-only diagnostic — never log secret values
    console.error(
      JSON.stringify({
        level: "auth_fail",
        agroApiKey: "detected",
        reason: "length_mismatch",
        expectedLen: b.length,
        tokenLen: a.length,
      })
    );
    return false;
  }
  const ok = timingSafeEqual(a, b);
  if (!ok) {
    console.error(
      JSON.stringify({
        level: "auth_fail",
        agroApiKey: "detected",
        reason: "value_mismatch",
        expectedLen: b.length,
        tokenLen: a.length,
      })
    );
  }
  return ok;
}

export function authenticateRequest(
  authHeader: string | null
): { ok: true; keyFingerprint: string } | { ok: false; response: typeof UNAUTHORIZED } {
  const token = extractBearerToken(authHeader);

  if (!verifyApiKey(token)) {
    if (!token) {
      console.error(
        JSON.stringify({
          level: "auth_fail",
          agroApiKey: getAgroApiKeyStatus(),
          reason: authHeader ? "bearer_parse_failed" : "missing_authorization",
        })
      );
    }
    return { ok: false, response: UNAUTHORIZED };
  }

  const keyFingerprint = token
    ? createHash("sha256").update(token).digest("hex").slice(0, 12)
    : "unknown";

  return { ok: true, keyFingerprint };
}
