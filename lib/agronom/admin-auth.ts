import type { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/agronom/auth";
import {
  readAdminCookie,
  verifyAdminCookie,
} from "@/lib/agronom/admin-site-auth";

const UNAUTHORIZED = {
  success: false as const,
  error: "Unauthorized",
};

export function authenticateAdminRequest(
  request: NextRequest
):
  | { ok: true; keyFingerprint: string }
  | { ok: false; response: typeof UNAUTHORIZED } {
  const auth = authenticateRequest(request.headers.get("authorization"));
  if (auth.ok) return auth;
  if (verifyAdminCookie(readAdminCookie(request))) {
    return { ok: true, keyFingerprint: "admin_cookie" };
  }
  return { ok: false, response: UNAUTHORIZED };
}
