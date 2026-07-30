import { NextRequest } from "next/server";
import { handleChatOptions, handleChatPost } from "@/lib/agronom/chat-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Site chat: httpOnly site cookie OR Bearer AGRO_API_KEY. Not an open proxy. */
export async function OPTIONS(request: NextRequest) {
  return handleChatOptions(request);
}

export async function POST(request: NextRequest) {
  return handleChatPost({
    request,
    endpoint: "/api/chat",
    authMode: "site-or-bearer",
  });
}
