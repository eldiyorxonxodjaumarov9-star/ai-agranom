import { NextRequest, NextResponse } from "next/server";
import {
  adminCookieHeader,
  assertAdminMutationOrigin,
  assertAdminRateLimit,
  authenticateAdminBearer,
  clearAdminCookieHeader,
  createAdminCookieValue,
  getAdminApiKeyStatus,
  readAdminCookieSecret,
} from "@/lib/agronom/admin-site-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exchange Bearer ADMIN_API_KEY for httpOnly admin session cookie.
 * Public AGRO_API_KEY is rejected.
 */
export async function POST(request: NextRequest) {
  if (!assertAdminMutationOrigin(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const auth = authenticateAdminBearer(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json(auth.response, { status: 401 });
  }

  if (!assertAdminRateLimit(`session:${auth.actorHash}`, 10, 60_000)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 429 }
    );
  }

  if (
    (process.env.NODE_ENV === "production" ||
      process.env.VERCEL_ENV === "production") &&
    !readAdminCookieSecret()
  ) {
    console.error(
      JSON.stringify({
        level: "admin_session_fail",
        reason: "ADMIN_COOKIE_SECRET_required_in_production",
        adminApiKey: getAdminApiKeyStatus(),
      })
    );
    return NextResponse.json(
      { success: false, error: "Admin session secret not configured" },
      { status: 500 }
    );
  }

  const value = createAdminCookieValue(auth.actorHash);
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

export async function DELETE(request: NextRequest) {
  if (!assertAdminMutationOrigin(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  const res = NextResponse.json({ success: true });
  res.headers.set("Set-Cookie", clearAdminCookieHeader());
  return res;
}
