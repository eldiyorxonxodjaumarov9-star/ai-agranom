import type { NextRequest } from "next/server";
import {
  getCorsHeaders,
  jsonWithCors,
  isOriginAllowed,
  corsForbidden,
} from "@/lib/agronom/cors";
import { authenticateRequest } from "@/lib/agronom/auth";
import {
  readSiteChatCookie,
  verifySiteChatCookie,
} from "@/lib/agronom/chat-site-auth";
import {
  buildRateLimitKey,
  checkRateLimitAsync,
  getClientIp,
  RATE_LIMIT_ERROR,
} from "@/lib/agronom/rateLimit";
import { validateVisionRequest } from "@/lib/agronom/vision-validate";
import { resolveVisionImages } from "@/lib/agronom/vision-images";
import { analyzePlantVision } from "@/server/services/visionService";
import {
  createRequestId,
  logApiError,
  logApiRequest,
} from "@/lib/agronom/logger";
import { sanitizeDisplayText } from "@/lib/agronom/display-sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Site-only vision path (cookie OR Bearer).
 * Public contract remains POST /api/agronom/vision (Bearer only).
 */
export async function OPTIONS(request: NextRequest) {
  if (!isOriginAllowed(request)) return corsForbidden(request);
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  const endpoint = "/api/chat/vision";
  const ip = getClientIp(request.headers);
  const requestId = createRequestId(request);

  const finish = (response: Response, status: number, fp?: string) => {
    logApiRequest({
      timestamp: new Date().toISOString(),
      requestId,
      endpoint,
      method: "POST",
      status,
      responseTimeMs: Date.now() - start,
      ip,
      keyFingerprint: fp,
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

  let keyFingerprint = "anon";
  let authorized = false;
  const auth = authenticateRequest(request.headers.get("authorization"));
  if (auth.ok) {
    authorized = true;
    keyFingerprint = auth.keyFingerprint;
  } else {
    const cookie = readSiteChatCookie(request);
    if (verifySiteChatCookie(cookie)) {
      authorized = true;
      keyFingerprint = "site_cookie";
    }
  }

  if (!authorized) {
    return finish(
      jsonWithCors(request, { success: false, error: "Unauthorized" }, 401),
      401
    );
  }

  if (!(await checkRateLimitAsync(buildRateLimitKey(keyFingerprint, ip)))) {
    return finish(jsonWithCors(request, RATE_LIMIT_ERROR, 429), 429, keyFingerprint);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return finish(
      jsonWithCors(request, { success: false, error: "Invalid request" }, 422),
      422,
      keyFingerprint
    );
  }

  const validated = validateVisionRequest(body);
  if (!validated.ok) {
    return finish(
      jsonWithCors(
        request,
        { success: false, error: validated.error },
        validated.status
      ),
      validated.status,
      keyFingerprint
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

    // Site response: no source URLs in recommendation; keep analysis metadata
    const safe = {
      ...result,
      recommendation: sanitizeDisplayText(result.recommendation),
      analysis: {
        ...result.analysis,
        summary: sanitizeDisplayText(result.analysis.summary),
      },
      sources: [],
    };

    return finish(jsonWithCors(request, safe, 200), 200, keyFingerprint);
  } catch (err) {
    const status =
      typeof err === "object" &&
      err &&
      "status" in err &&
      typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : 500;
    if (status === 413 || status === 415 || status === 422) {
      return finish(
        jsonWithCors(
          request,
          {
            success: false,
            error:
              status === 413
                ? "Too many images"
                : status === 415
                  ? "Unsupported image"
                  : "Invalid request",
          },
          status
        ),
        status,
        keyFingerprint
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
      keyFingerprint,
      error: err instanceof Error ? err.message : String(err),
    });
    return finish(
      jsonWithCors(request, { success: false, error: "Internal error" }, 500),
      500,
      keyFingerprint
    );
  }
}
