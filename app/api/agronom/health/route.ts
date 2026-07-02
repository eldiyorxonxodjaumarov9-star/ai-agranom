import { NextRequest } from "next/server";
import { getCorsHeaders, jsonWithCors } from "@/lib/agronom/cors";
import { SERVICE_NAME, API_VERSION } from "@/lib/agronom/api-types";
import type { HealthApiResponse } from "@/lib/agronom/api-types";
import { logApiRequest } from "@/lib/agronom/logger";
import { getClientIp } from "@/lib/agronom/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
}

export async function GET(request: NextRequest) {
  const start = Date.now();
  const response: HealthApiResponse = {
    status: "ok",
    service: SERVICE_NAME,
    version: API_VERSION,
  };

  logApiRequest({
    timestamp: new Date().toISOString(),
    endpoint: "/api/agronom/health",
    method: "GET",
    status: 200,
    responseTimeMs: Date.now() - start,
    ip: getClientIp(request.headers),
    isRejection: false,
  });

  return jsonWithCors(request, response);
}
