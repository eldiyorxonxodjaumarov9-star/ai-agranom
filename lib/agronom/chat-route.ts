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
import {
  readSiteChatCookie,
  verifySiteChatCookie,
} from "@/lib/agronom/chat-site-auth";
import { validateChatRequest } from "@/lib/agronom/chat-validate";
import {
  processChat,
  processChatStream,
  responseLanguage,
} from "@/lib/agronom/chat-handler";
import { isRejectionAnswer } from "@/lib/agronom/rejection-detect";
import {
  createRequestId,
  logApiError,
  logApiRequest,
} from "@/lib/agronom/logger";
import { SERVICE_NAME } from "@/lib/agronom/api-types";
import { getRejectionMessage } from "@/lib/agronom/language";

function isLikelyNonAgroQuestion(message: string): boolean {
  const m = message.toLowerCase();
  const NON_AGRO_HINTS = [
    /messi/i,
    /месси/i,
    /кто\s+такой/i,
    /\bwho\s+is\b/i,
  ];
  const AGRO_HINTS = [
    /помидор|томат|листь|удобр|пшениц|огурц|яблон|полив|урожай|болезн|вредител/i,
    /қызанақ|жапырақ|суару|тыңайт|ауру|зиянкестер/i,
    /pomidor|barg|o'g'it|kasallik|zararkunanda|sug'or|hosil|bug'doy/i,
    /жалбыра|помидордун|сугар|бадыраң|өсүмдүк|семирткич|кантип/i,
  ];
  if (AGRO_HINTS.some((r) => r.test(m))) return false;
  return NON_AGRO_HINTS.some((r) => r.test(m));
}

export interface HandleChatOptions {
  request: NextRequest;
  endpoint: string;
  /** bearer = AGRO_API_KEY only; site-or-bearer = cookie OR key */
  authMode: "bearer" | "site-or-bearer";
}

export async function handleChatPost(
  options: HandleChatOptions
): Promise<Response> {
  const start = Date.now();
  const { request, endpoint, authMode } = options;
  const ip = getClientIp(request.headers);
  const method = "POST";
  const requestId = createRequestId(request);

  const logAndReturn = (
    response: Response,
    status: number,
    isRejection = false,
    keyFingerprint?: string
  ): Response => {
    logApiRequest({
      timestamp: new Date().toISOString(),
      requestId,
      endpoint,
      method,
      status,
      responseTimeMs: Date.now() - start,
      ip,
      keyFingerprint,
      isRejection,
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
    return logAndReturn(corsForbidden(request), 403);
  }

  let keyFingerprint = "anon";
  let authorized = false;

  const auth = authenticateRequest(request.headers.get("authorization"));
  if (auth.ok) {
    authorized = true;
    keyFingerprint = auth.keyFingerprint;
  } else if (authMode === "site-or-bearer") {
    const cookie = readSiteChatCookie(request);
    if (verifySiteChatCookie(cookie)) {
      authorized = true;
      keyFingerprint = "site_cookie";
    }
  }

  if (!authorized) {
    return logAndReturn(
      jsonWithCors(
        request,
        { success: false, error: "Unauthorized" },
        401,
        { "X-Request-Id": requestId }
      ),
      401
    );
  }

  // Rate limit AFTER auth
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return logAndReturn(
      jsonWithCors(
        request,
        { success: false, error: "Invalid JSON body" },
        400,
        { "X-Request-Id": requestId }
      ),
      400,
      false,
      keyFingerprint
    );
  }

  const validated = validateChatRequest(body);
  if (!validated.ok) {
    return logAndReturn(
      jsonWithCors(
        request,
        { success: false, error: validated.error },
        validated.status,
        { "X-Request-Id": requestId }
      ),
      validated.status,
      false,
      keyFingerprint
    );
  }

  const sessionId = validated.data.sessionId;
  const rateKey = buildRateLimitKey(ip, keyFingerprint, sessionId);
  if (!(await checkRateLimitAsync(rateKey))) {
    return logAndReturn(
      jsonWithCors(request, RATE_LIMIT_ERROR, 429, {
        "X-Request-Id": requestId,
      }),
      429,
      false,
      keyFingerprint
    );
  }

  try {
    const wantStream =
      request.nextUrl.searchParams.get("stream") === "true" ||
      request.headers.get("accept")?.includes("text/event-stream");

    if (wantStream) {
      if (isLikelyNonAgroQuestion(validated.data.message)) {
        const lang = responseLanguage(
          validated.data.language,
          validated.data.message
        );
        const msg = getRejectionMessage(lang as "uz");
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content: msg, done: false })}\n\n`
              )
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  answer: msg,
                  success: true,
                  language: lang,
                  service: SERVICE_NAME,
                })}\n\n`
              )
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return logAndReturn(
          new Response(stream, {
            headers: {
              ...getCorsHeaders(request),
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "X-Request-Id": requestId,
            },
          }),
          200,
          true,
          keyFingerprint
        );
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const gen = processChatStream(validated.data);
            let full = "";
            for await (const chunk of gen) {
              full = chunk;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: chunk, done: false })}\n\n`
                )
              );
            }
            const lang = responseLanguage(
              validated.data.language,
              validated.data.message
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  answer: full,
                  success: true,
                  language: lang,
                  service: SERVICE_NAME,
                })}\n\n`
              )
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            logApiError({
              timestamp: new Date().toISOString(),
              requestId,
              endpoint,
              method,
              status: 500,
              responseTimeMs: Date.now() - start,
              ip,
              keyFingerprint,
              error: err instanceof Error ? err.message : String(err),
            });
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  success: false,
                  error: "AI javob berishda muammo bo'ldi",
                })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return logAndReturn(
        new Response(stream, {
          headers: {
            ...getCorsHeaders(request),
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Request-Id": requestId,
          },
        }),
        200,
        false,
        keyFingerprint
      );
    }

    const result = await processChat(validated.data);
    const status = result.success ? 200 : 500;
    const rejection =
      result.success && isRejectionAnswer(result.answer);
    return logAndReturn(
      jsonWithCors(request, result, status, { "X-Request-Id": requestId }),
      status,
      Boolean(rejection),
      keyFingerprint
    );
  } catch (err) {
    logApiError({
      timestamp: new Date().toISOString(),
      requestId,
      endpoint,
      method,
      status: 500,
      responseTimeMs: Date.now() - start,
      ip,
      keyFingerprint,
      error: err instanceof Error ? err.message : String(err),
    });
    return logAndReturn(
      jsonWithCors(
        request,
        { success: false, error: "AI javob berishda muammo bo'ldi" },
        500,
        { "X-Request-Id": requestId }
      ),
      500,
      false,
      keyFingerprint
    );
  }
}

export async function handleChatOptions(request: NextRequest): Promise<Response> {
  if (!isOriginAllowed(request)) {
    return corsForbidden(request);
  }
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
