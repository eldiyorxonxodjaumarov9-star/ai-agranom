/**
 * Admin auth facade — public AGRO_API_KEY is never accepted.
 */
import type { NextRequest } from "next/server";
import {
  authenticateAdminRequest as authAdmin,
  ADMIN_UNAUTHORIZED,
} from "@/lib/agronom/admin-site-auth";

export function authenticateAdminRequest(request: NextRequest):
  | { ok: true; keyFingerprint: string; actorHash: string; via: "bearer" | "cookie" }
  | { ok: false; response: typeof ADMIN_UNAUTHORIZED; status?: number } {
  const r = authAdmin(request);
  if (!r.ok) return r;
  return {
    ok: true,
    keyFingerprint: r.actorHash,
    actorHash: r.actorHash,
    via: r.via,
  };
}
