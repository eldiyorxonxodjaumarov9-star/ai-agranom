import { NextRequest } from "next/server";
import { handleChatOptions, handleChatPost } from "@/lib/agronom/chat-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Public API — Bearer AGRO_API_KEY required. Contract unchanged. */
export async function OPTIONS(request: NextRequest) {
  return handleChatOptions(request);
}

export async function POST(request: NextRequest) {
  return handleChatPost({
    request,
    endpoint: "/api/agronom/chat",
    authMode: "bearer",
  });
}
