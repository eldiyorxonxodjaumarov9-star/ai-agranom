/**
 * Admin-only authentication — never accepts public AGRO_API_KEY.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { getAllowedOrigins } from "@/lib/agronom/cors";

const UNAUTHORIZED = {
  success: false as const,
  error: "Unauthorized",
};

const PLACEHOLDER = new Set([
  "",
  "super_secret_api_key_here",
  "your_api_key_here",
  "change_me",
]);

const COOKIE = "agro_admin_site";
const TTL_MS = 8 * 60 * 60 * 1000;

function readEnvSecret(parts: string[]): string {
  const name = parts.join("_");
  const raw = (process.env as NodeJS.ProcessEnv)[name];
  if (typeof raw !== "string") return "";
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .replace(/^["']|["']$/g, "");
}

export function readAdminApiKey(): string {
  return readEnvSecret(["ADMIN", "API", "KEY"]);
}

export function readAdminCookieSecret(): string {
  return readEnvSecret(["ADMIN", "COOKIE", "SECRET"]);
}

export function getAdminApiKeyStatus(): "detected" | "missing" {
  const k = readAdminApiKey();
  return k && !PLACEHOLDER.has(k) ? "detected" : "missing";
}

function cookieSigningSecret(): string | null {
  const cookieSecret = readAdminCookieSecret();
  if (cookieSecret && !PLACEHOLDER.has(cookieSecret)) return cookieSecret;
  // Production: never fall back to AGRO_API_KEY
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return null;
  }
  // Local/dev only: allow ADMIN_COOKIE_SECRET or ADMIN_API_KEY (still never AGRO_API_KEY)
  const adminKey = readAdminApiKey();
  if (adminKey && !PLACEHOLDER.has(adminKey)) return adminKey;
  return null;
}

export function fingerprintAdminToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

function extractBearer(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(\S+)/i.exec(authHeader.trim());
  return m?.[1]?.trim() || null;
}

function safeEqualStr(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/** Bearer ADMIN_API_KEY only — AGRO_API_KEY always fails. */
export function authenticateAdminBearer(
  authHeader: string | null
):
  | { ok: true; actorHash: string; via: "bearer" }
  | { ok: false; response: typeof UNAUTHORIZED } {
  const expected = readAdminApiKey();
  if (!expected || PLACEHOLDER.has(expected)) {
    console.error(
      JSON.stringify({
        level: "admin_auth_fail",
        adminApiKey: getAdminApiKeyStatus(),
        reason: "admin_key_missing",
      })
    );
    return { ok: false, response: UNAUTHORIZED };
  }
  const token = extractBearer(authHeader);
  if (!token || !safeEqualStr(token, expected)) {
    console.error(
      JSON.stringify({
        level: "admin_auth_fail",
        adminApiKey: "detected",
        reason: token ? "admin_key_mismatch" : "missing_authorization",
      })
    );
    return { ok: false, response: UNAUTHORIZED };
  }
  return {
    ok: true,
    actorHash: fingerprintAdminToken(token),
    via: "bearer",
  };
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Cookie payload: admin.v2.{exp}.{actorHash}.{sig}
 * actorHash is server-derived from ADMIN_API_KEY at session creation.
 */
export function createAdminCookieValue(actorHash: string): string | null {
  const secret = cookieSigningSecret();
  if (!secret || !actorHash) return null;
  const exp = Date.now() + TTL_MS;
  const payload = `admin.v2.${exp}.${actorHash}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyAdminCookie(
  raw: string | undefined
): { ok: true; actorHash: string } | { ok: false } {
  const secret = cookieSigningSecret();
  if (!raw || !secret) return { ok: false };
  const parts = raw.split(".");
  // admin v2 exp actorHash sig  => 5 parts when split by .
  // admin.v2.{exp}.{actorHash}.{sig}
  if (parts.length !== 5) return { ok: false };
  const [a, v, expStr, actorHash, sig] = parts;
  if (a !== "admin" || v !== "v2" || !actorHash) return { ok: false };
  const payload = `${a}.${v}.${expStr}.${actorHash}`;
  const expected = sign(payload, secret);
  try {
    const x = Buffer.from(sig);
    const y = Buffer.from(expected);
    if (x.length !== y.length || !timingSafeEqual(x, y)) return { ok: false };
  } catch {
    return { ok: false };
  }
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return { ok: false };
  return { ok: true, actorHash };
}

export function readAdminCookie(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE)?.value;
}

export function adminCookieHeader(value: string): string {
  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production"
      ? "; Secure"
      : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(
    TTL_MS / 1000
  )}${secure}`;
}

export function clearAdminCookieHeader(): string {
  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production"
      ? "; Secure"
      : "";
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

/** CSRF: cookie mutations require Origin/Referer in allowlist. */
export function assertAdminMutationOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowed = new Set(getAllowedOrigins().map((o) => o.replace(/\/$/, "")));
  if (origin) {
    return allowed.has(origin.replace(/\/$/, ""));
  }
  if (referer) {
    try {
      const u = new URL(referer);
      return allowed.has(`${u.protocol}//${u.host}`);
    } catch {
      return false;
    }
  }
  // Non-browser Bearer admin calls may omit Origin — only allow when Authorization present
  return Boolean(extractBearer(request.headers.get("authorization")));
}

const adminHits = new Map<string, { n: number; reset: number }>();

export function assertAdminRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const cur = adminHits.get(key);
  if (!cur || now > cur.reset) {
    adminHits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  if (cur.n >= limit) return false;
  cur.n += 1;
  return true;
}

export type AdminAuthOk = {
  ok: true;
  actorHash: string;
  via: "bearer" | "cookie";
};

/**
 * Admin endpoints only. Public AGRO_API_KEY is never accepted.
 */
export function authenticateAdminRequest(
  request: NextRequest
): AdminAuthOk | { ok: false; response: typeof UNAUTHORIZED; status?: number } {
  const bearer = authenticateAdminBearer(request.headers.get("authorization"));
  if (bearer.ok) {
    if (!assertAdminRateLimit(`bearer:${bearer.actorHash}`)) {
      return {
        ok: false,
        response: { success: false, error: "Unauthorized" },
        status: 429,
      };
    }
    return bearer;
  }

  const cookie = verifyAdminCookie(readAdminCookie(request));
  if (cookie.ok) {
    const method = request.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      if (!assertAdminMutationOrigin(request)) {
        console.error(
          JSON.stringify({
            level: "admin_auth_fail",
            reason: "csrf_origin_rejected",
          })
        );
        return { ok: false, response: UNAUTHORIZED };
      }
    }
    if (!assertAdminRateLimit(`cookie:${cookie.actorHash}`)) {
      return {
        ok: false,
        response: { success: false, error: "Unauthorized" },
        status: 429,
      };
    }
    return { ok: true, actorHash: cookie.actorHash, via: "cookie" };
  }

  return { ok: false, response: UNAUTHORIZED };
}

export { COOKIE as ADMIN_SITE_COOKIE, UNAUTHORIZED as ADMIN_UNAUTHORIZED };
