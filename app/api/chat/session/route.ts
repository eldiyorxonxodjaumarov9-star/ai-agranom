import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, isOriginAllowed, corsForbidden } from "@/lib/agronom/cors";
import {
  createSiteChatCookieValue,
  siteChatCookieHeader,
} from "@/lib/agronom/chat-site-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Issues httpOnly site chat cookie for same-origin frontend. */
export async function GET(request: NextRequest) {
  if (!isOriginAllowed(request)) {
    return corsForbidden(request);
  }
  const value = createSiteChatCookieValue();
  if (!value) {
    return NextResponse.json(
      { success: false, error: "CHAT_COOKIE_SECRET or AGRO_API_KEY required" },
      { status: 503, headers: getCorsHeaders(request) }
    );
  }
  const res = NextResponse.json(
    { success: true },
    { headers: getCorsHeaders(request) }
  );
  res.headers.append("Set-Cookie", siteChatCookieHeader(value));
  return res;
}
