import type { ChatApiRequest } from "./api-types";
import type { SupportedLanguage } from "./api-types";
import { resolveLanguage } from "./language";

const MAX_MESSAGE_LENGTH = 2000;
const SESSION_ID_MAX = 128;

export type ChatValidateResult =
  | {
      ok: true;
      data: {
        message: string;
        language: SupportedLanguage;
        sessionId?: string;
      };
    }
  | { ok: false; error: string; status: number };

export function validateChatRequest(body: unknown): ChatValidateResult {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: "message maydoni majburiy va matn bo'lishi kerak.",
      status: 400,
    };
  }

  const { message, language, sessionId } = body as ChatApiRequest;

  if (!message || typeof message !== "string") {
    return {
      ok: false,
      error: "message maydoni majburiy va matn bo'lishi kerak.",
      status: 400,
    };
  }

  const trimmed = message.trim();

  if (!trimmed) {
    return { ok: false, error: "message bo'sh bo'lmasligi kerak.", status: 400 };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `message ${MAX_MESSAGE_LENGTH} belgidan oshmasligi kerak.`,
      status: 400,
    };
  }

  if (sessionId !== undefined) {
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      return { ok: false, error: "sessionId noto'g'ri formatda.", status: 400 };
    }
    if (sessionId.length > SESSION_ID_MAX) {
      return {
        ok: false,
        error: `sessionId ${SESSION_ID_MAX} belgidan oshmasligi kerak.`,
        status: 400,
      };
    }
  }

  const resolvedLanguage = resolveLanguage(
    typeof language === "string" ? language : "auto",
    trimmed
  );

  return {
    ok: true,
    data: {
      message: trimmed,
      language: resolvedLanguage,
      sessionId: sessionId?.trim(),
    },
  };
}
