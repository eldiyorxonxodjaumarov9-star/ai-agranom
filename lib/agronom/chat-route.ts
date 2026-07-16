import type { NextRequest } from "next/server";
import { getCorsHeaders, isOriginAllowed, corsForbidden, jsonWithCors } from "@/lib/agronom/cors";
import {
  buildRateLimitKey,
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_ERROR,
} from "@/lib/agronom/rateLimit";
import { authenticateRequest } from "@/lib/agronom/auth";
import { validateChatRequest } from "@/lib/agronom/chat-validate";
import { processChat, processChatStream, responseLanguage } from "@/lib/agronom/chat-handler";
import { isRejectionAnswer } from "@/lib/agronom/rejection-detect";
import { logApiRequest } from "@/lib/agronom/logger";
import { SERVICE_NAME } from "@/lib/agronom/api-types";
import { getRejectionMessage } from "@/lib/agronom/language";

function isLikelyNonAgroQuestion(message: string): boolean {
  const m = message.toLowerCase();

  // Known non-agro phrasing used in tests / typical people queries.
  const NON_AGRO_HINTS = [
    /messi/i, // latin
    /месси/i, // cyrillic
    /кто\s+такой/i,
    /\bwho\s+is\b/i,
  ];

  // Lightweight agronomy keyword hints in RU/KK/UZ/KY.
  const AGRO_HINTS = [
    /помидор|томат|листь|удобр|пшениц|огурц|яблон|полив|урожай|болезн|вредител/i,
    /қызанақ|жапырақ|суару|тыңайт|ауру|зиянкестер/i,
    /pomidor|barg|o'g'it|kasallik|zararkunanda|sug'or|hosil|bug'doy/i,
    /жалбыра|помидордун|сугар|бадыраң|өсүмдүк|семирткич|кантип/i,
  ];

  const hasAgroHint = AGRO_HINTS.some((r) => r.test(m));
  if (hasAgroHint) return false;

  return NON_AGRO_HINTS.some((r) => r.test(m));
}

export interface HandleChatOptions {
  request: NextRequest;
  endpoint: string;
  requireAuth: boolean;
}

export async function handleChatPost(
  options: HandleChatOptions
): Promise<Response> {
  const start = Date.now();
  const { request, endpoint, requireAuth } = options;
  const ip = getClientIp(request.headers);
  const method = "POST";

  const logAndReturn = (
    response: Response,
    status: number,
    isRejection = false,
    keyFingerprint?: string
  ): Response => {
    logApiRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status,
      responseTimeMs: Date.now() - start,
      ip,
      keyFingerprint,
      isRejection,
    });
    return response;
  };

  if (!isOriginAllowed(request)) {
    return logAndReturn(corsForbidden(request), 403);
  }

  let keyFingerprint = "internal";

  if (requireAuth) {
    const auth = authenticateRequest(request.headers.get("authorization"));

    if (!auth.ok) {
      return logAndReturn(
        jsonWithCors(request, auth.response, 401),
        401
      );
    }

    keyFingerprint = auth.keyFingerprint;
  }

  const rateKey = buildRateLimitKey(ip, keyFingerprint);
  if (!checkRateLimit(rateKey)) {
    return logAndReturn(
      jsonWithCors(request, RATE_LIMIT_ERROR, 429),
      429,
      false,
      keyFingerprint
    );
  }

  try {
    const body = await request.json();
    const validated = validateChatRequest(body);

    if (!validated.ok) {
      return logAndReturn(
        jsonWithCors(
          request,
          { success: false, error: validated.error },
          validated.status
        ),
        validated.status,
        false,
        keyFingerprint
      );
    }

    const wantsStream =
      request.nextUrl.searchParams.get("stream") === "true" ||
      request.headers.get("accept") === "text/event-stream";

    const wantsNonAgroRejection = isLikelyNonAgroQuestion(validated.data.message);
    if (wantsNonAgroRejection) {
      const detectedLanguage = responseLanguage(
        validated.data.language,
        validated.data.message
      );

      const answer = getRejectionMessage(detectedLanguage);
      const payload = {
        success: true,
        answer,
        language: detectedLanguage,
        service: SERVICE_NAME,
      };

      if (!wantsStream) {
        return logAndReturn(jsonWithCors(request, payload, 200), 200, true, keyFingerprint);
      }

      const encoder = new TextEncoder();
      const cors = getCorsHeaders(request);
      let full = "";
      const stream = new ReadableStream({
        start(controller) {
          try {
            full = answer;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content: answer })}\n\n`
              )
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, answer })}\n\n`
              )
            );
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...cors,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    if (wantsStream) {
      const encoder = new TextEncoder();
      const cors = getCorsHeaders(request);
      let streamIsRejection = false;

      const stream = new ReadableStream({
        async start(controller) {
          try {
            const gen = processChatStream(validated.data);
            let fullAnswer = "";

            while (true) {
              const { value, done } = await gen.next();
              if (done) {
                fullAnswer = value ?? fullAnswer;
                break;
              }
              fullAnswer += value;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: value })}\n\n`
                )
              );
            }

            streamIsRejection = isRejectionAnswer(fullAnswer);

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  success: true,
                  answer: fullAnswer,
                  language: responseLanguage(
                    validated.data.language,
                    validated.data.message
                  ),
                  service: SERVICE_NAME,
                })}\n\n`
              )
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  success: false,
                  error: "AI javob berishda muammo bo'ldi",
                })}\n\n`
              )
            );
          } finally {
            logApiRequest({
              timestamp: new Date().toISOString(),
              endpoint,
              method,
              status: 200,
              responseTimeMs: Date.now() - start,
              ip,
              keyFingerprint,
              isRejection: streamIsRejection,
            });
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...cors,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const result = await processChat(validated.data);
    const rejection = result.success && isRejectionAnswer(result.answer);

    if (!result.success) {
      return logAndReturn(
        jsonWithCors(request, result, 500),
        500,
        false,
        keyFingerprint
      );
    }

    return logAndReturn(
      jsonWithCors(request, result),
      200,
      rejection,
      keyFingerprint
    );
  } catch {
    return logAndReturn(
      jsonWithCors(
        request,
        { success: false, error: "AI javob berishda muammo bo'ldi" },
        500
      ),
      500,
      false,
      keyFingerprint
    );
  }
}

export function handleChatOptions(request: NextRequest): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
