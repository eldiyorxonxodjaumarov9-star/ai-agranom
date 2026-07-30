import type { NextRequest } from "next/server";
import {
  getCorsHeaders,
  isOriginAllowed,
  corsForbidden,
  jsonWithCors,
} from "@/lib/agronom/cors";
import {
  buildRateLimitKey,
  checkRateLimitAsync,
  getClientIp,
  RATE_LIMIT_ERROR,
} from "@/lib/agronom/rateLimit";
import { authenticateRequest } from "@/lib/agronom/auth";
import { validateVisionRequest } from "@/lib/agronom/vision-validate";
import { resolveVisionImages } from "@/lib/agronom/vision-images";
import { analyzePlantVision } from "@/server/services/visionService";
import {
  createRequestId,
  logApiError,
  logApiRequest,
} from "@/lib/agronom/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function OPTIONS(request: NextRequest) {
  if (!isOriginAllowed(request)) {
    return corsForbidden(request);
  }
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  const endpoint = "/api/agronom/vision";
  const ip = getClientIp(request.headers);
  const requestId = createRequestId(request);

  const finish = (
    response: Response,
    status: number,
    keyFingerprint?: string
  ): Response => {
    logApiRequest({
      timestamp: new Date().toISOString(),
      requestId,
      endpoint,
      method: "POST",
      status,
      responseTimeMs: Date.now() - start,
      ip,
      keyFingerprint,
    });
    const headers = new Headers(response.headers);
    headers.set("X-Request-Id", requestId);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };

  if (!isOriginAllowed(request)) {
    return finish(corsForbidden(request), 403);
  }

  const auth = authenticateRequest(request.headers.get("authorization"));
  if (!auth.ok) {
    return finish(
      jsonWithCors(
        request,
        { success: false, error: "Unauthorized" },
        401,
        { "X-Request-Id": requestId }
      ),
      401
    );
  }

  const rlKey = buildRateLimitKey(auth.keyFingerprint, ip);
  if (!(await checkRateLimitAsync(rlKey))) {
    return finish(
      jsonWithCors(request, RATE_LIMIT_ERROR, 429, {
        "X-Request-Id": requestId,
        "Retry-After": "60",
      }),
      429,
      auth.keyFingerprint
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return finish(
      jsonWithCors(
        request,
        { success: false, error: "Invalid request" },
        422,
        { "X-Request-Id": requestId }
      ),
      422,
      auth.keyFingerprint
    );
  }

  const validated = validateVisionRequest(body);
  if (!validated.ok) {
    return finish(
      jsonWithCors(
        request,
        { success: false, error: validated.error },
        validated.status,
        { "X-Request-Id": requestId }
      ),
      validated.status,
      auth.keyFingerprint
    );
  }

  try {
    const images = await resolveVisionImages(validated.data.images);
    const result = await analyzePlantVision({
      message: validated.data.message,
      language: validated.data.language,
      images,
      region: validated.data.region,
      crop: validated.data.crop,
    });

    return finish(
      jsonWithCors(request, result, 200, { "X-Request-Id": requestId }),
      200,
      auth.keyFingerprint
    );
  } catch (err) {
    const status =
      typeof err === "object" &&
      err &&
      "status" in err &&
      typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : undefined;

    if (status === 413 || status === 415 || status === 422) {
      const message =
        err instanceof Error ? err.message : "Invalid request";
      return finish(
        jsonWithCors(
          request,
          {
            success: false,
            error:
              status === 413
                ? message.includes("Too many")
                  ? "Too many images"
                  : message
                : status === 415
                  ? "Unsupported image"
                  : "Invalid request",
          },
          status,
          { "X-Request-Id": requestId }
        ),
        status,
        auth.keyFingerprint
      );
    }

    const code =
      err instanceof Error ? err.message : String(err);
    if (
      code === "invalid_url" ||
      code === "protocol_not_allowed" ||
      code === "https_required" ||
      code === "host_blocked" ||
      code === "private_ip_blocked" ||
      code === "resolved_private_ip" ||
      code === "host_not_allowlisted"
    ) {
      return finish(
        jsonWithCors(
          request,
          { success: false, error: "Unsupported image" },
          415,
          { "X-Request-Id": requestId }
        ),
        415,
        auth.keyFingerprint
      );
    }

    logApiError({
      timestamp: new Date().toISOString(),
      requestId,
      endpoint,
      method: "POST",
      status: 500,
      responseTimeMs: Date.now() - start,
      ip,
      keyFingerprint: auth.keyFingerprint,
      error: err instanceof Error ? err.message : String(err),
    });

    return finish(
      jsonWithCors(
        request,
        { success: false, error: "Internal error" },
        500,
        { "X-Request-Id": requestId }
      ),
      500,
      auth.keyFingerprint
    );
  }
}
