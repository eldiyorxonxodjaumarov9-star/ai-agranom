import { NextRequest } from "next/server";
import { handleChatOptions, handleChatPost } from "@/lib/agronom/chat-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sayt ichki chat proxy — AGRO_API_KEY brauzerga chiqmaydi.
 * Server tomonida processChat to'g'ridan-to'g'ri chaqiriladi.
 */
export async function OPTIONS(request: NextRequest) {
  return handleChatOptions(request);
}

export async function POST(request: NextRequest) {
  return handleChatPost({
    request,
    endpoint: "/api/chat",
    requireAuth: false,
  });
}
