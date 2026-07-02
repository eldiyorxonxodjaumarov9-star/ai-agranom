/**
 * Frontend chat — server-side proxy (AGRO_API_KEY brauzerga chiqmaydi).
 */
export function getChatEndpoint(stream = false): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  const path = stream ? "/api/chat?stream=true" : "/api/chat";
  return `${base}${path}`;
}

export function getPublicChatEndpoint(stream = false): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  const path = stream
    ? "/api/agronom/chat?stream=true"
    : "/api/agronom/chat";
  return `${base}${path}`;
}
