import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const COOKIE = "agro_chat_site";
const TTL_MS = 12 * 60 * 60 * 1000;

function secret(): string {
  return (
    process.env.CHAT_COOKIE_SECRET?.trim() ||
    process.env.AGRO_API_KEY?.trim() ||
    ""
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSiteChatCookieValue(): string | null {
  if (!secret()) return null;
  const exp = Date.now() + TTL_MS;
  const payload = `v1.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySiteChatCookie(raw: string | undefined): boolean {
  if (!raw || !secret()) return false;
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [v, expStr, sig] = parts;
  const payload = `${v}.${expStr}`;
  const expected = sign(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  return v === "v1";
}

export function readSiteChatCookie(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE)?.value;
}

export function siteChatCookieHeader(value: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
    TTL_MS / 1000
  )}${secure}`;
}

export { COOKIE as SITE_CHAT_COOKIE };
