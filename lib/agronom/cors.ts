import type { NextRequest } from "next/server";

function getAllowedOrigins(): string[] {
  const raw =
    process.env.ALLOWED_ORIGINS ||
    "http://localhost:3000,https://ai-agranom.vercel.app,https://agroolam.uz,https://www.agroolam.uz";

  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Production: missing Origin is rejected (blocks curl OpenAI proxy abuse).
 * Development: missing Origin allowed for same-origin / tooling.
 */
export function isOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const allowed = getAllowedOrigins();

  if (!origin) {
    const isProd =
      process.env.VERCEL_ENV === "production" ||
      process.env.NODE_ENV === "production";
    if (isProd) {
      // Allow same-origin navigations that omit Origin only when Sec-Fetch-Site is same-origin
      const site = request.headers.get("sec-fetch-site");
      if (site === "same-origin" || site === "none") return true;
      return false;
    }
    return true;
  }

  return allowed.includes(origin);
}

export function resolveCorsOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin");
  const allowed = getAllowedOrigins();

  if (origin && allowed.includes(origin)) {
    return origin;
  }

  if (!origin && process.env.NODE_ENV !== "production") {
    return allowed[0] || "";
  }

  return "";
}

export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = resolveCorsOrigin(request);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, Authorization, X-Request-Id",
    "Access-Control-Max-Age": "86400",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Vary"] = "Origin";
  }

  return headers;
}

export function jsonWithCors(
  request: NextRequest,
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return Response.json(body, {
    status,
    headers: { ...getCorsHeaders(request), ...extraHeaders },
  });
}

export function corsForbidden(request: NextRequest): Response {
  return jsonWithCors(
    request,
    { success: false, error: "Origin not allowed" },
    403
  );
}
