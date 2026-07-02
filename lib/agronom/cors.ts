import type { NextRequest } from "next/server";

function getAllowedOrigins(): string[] {
  const raw =
    process.env.ALLOWED_ORIGINS ||
    "http://localhost:3000,https://agroolam.uz,https://www.agroolam.uz";

  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin / server-to-server

  const allowed = getAllowedOrigins();
  return allowed.includes(origin);
}

export function resolveCorsOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin");
  const allowed = getAllowedOrigins();

  if (origin && allowed.includes(origin)) {
    return origin;
  }

  if (!origin) {
    return allowed[0] || "";
  }

  return "";
}

export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = resolveCorsOrigin(request);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export function jsonWithCors(
  request: NextRequest,
  body: unknown,
  status = 200
): Response {
  return Response.json(body, {
    status,
    headers: getCorsHeaders(request),
  });
}

export function corsForbidden(request: NextRequest): Response {
  return jsonWithCors(
    request,
    { success: false, error: "Origin not allowed" },
    403
  );
}
