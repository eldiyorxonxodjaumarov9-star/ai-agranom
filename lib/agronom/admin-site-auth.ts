import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const COOKIE = "agro_admin_site";
const TTL_MS = 8 * 60 * 60 * 1000;

function secret(): string {
  return (
    process.env.ADMIN_COOKIE_SECRET?.trim() ||
    process.env.AGRO_API_KEY?.trim() ||
    ""
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createAdminCookieValue(): string | null {
  if (!secret()) return null;
  const exp = Date.now() + TTL_MS;
  const payload = `admin.v1.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminCookie(raw: string | undefined): boolean {
  if (!raw || !secret()) return false;
  const parts = raw.split(".");
  if (parts.length !== 4) return false;
  const [a, v, expStr, sig] = parts;
  const payload = `${a}.${v}.${expStr}`;
  const expected = sign(payload);
  try {
    const x = Buffer.from(sig);
    const y = Buffer.from(expected);
    if (x.length !== y.length || !timingSafeEqual(x, y)) return false;
  } catch {
    return false;
  }
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  return a === "admin" && v === "v1";
}

export function readAdminCookie(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE)?.value;
}

export function adminCookieHeader(value: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
    TTL_MS / 1000
  )}${secure}`;
}

export { COOKIE as ADMIN_SITE_COOKIE };
