/**
 * API base URL for client-side requests.
 * Vercel deployda bo'sh qoldiring — same-origin /api/ai/* ishlaydi.
 * Alohida API server bo'lsa: NEXT_PUBLIC_API_URL=https://api.example.com
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  }
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
}

export function getAgronomEndpoint(stream = false): string {
  const base = getApiBaseUrl();
  const path = stream ? "/api/ai/agronom?stream=true" : "/api/ai/agronom";
  return `${base}${path}`;
}
