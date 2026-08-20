import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/agronom/auth";
import {
  adminCookieHeader,
  createAdminCookieValue,
} from "@/lib/agronom/admin-site-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exchange Bearer AGRO_API_KEY for httpOnly admin session cookie.
 * Browser never stores the raw API key in sessionStorage.
 */
export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  const value = createAdminCookieValue();
  if (!value) {
    return NextResponse.json(
      { success: false, error: "Admin session secret not configured" },
      { status: 500 }
    );
  }
  const res = NextResponse.json({ success: true });
  res.headers.set("Set-Cookie", adminCookieHeader(value));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.headers.set(
    "Set-Cookie",
    "agro_admin_site=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  return res;
}
