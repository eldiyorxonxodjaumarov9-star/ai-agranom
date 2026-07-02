import type { AgronomRequest } from "@/server/services/agronomService";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 20;

export type ValidateResult =
  | { ok: true; data: AgronomRequest }
  | { ok: false; error: string; status: number };

export function validateAgronomBody(body: unknown): ValidateResult {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: "message maydoni majburiy va matn bo'lishi kerak.",
      status: 400,
    };
  }

  const { message, history } = body as {
    message?: unknown;
    history?: unknown;
  };

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

  if (history !== undefined) {
    if (!Array.isArray(history)) {
      return { ok: false, error: "history massiv bo'lishi kerak.", status: 400 };
    }

    if (history.length > MAX_HISTORY_LENGTH) {
      return {
        ok: false,
        error: `history ${MAX_HISTORY_LENGTH} xabardan oshmasligi kerak.`,
        status: 400,
      };
    }

    for (const item of history) {
      if (
        !item ||
        typeof item !== "object" ||
        !("role" in item) ||
        !("content" in item) ||
        (item.role !== "user" && item.role !== "assistant") ||
        typeof item.content !== "string"
      ) {
        return { ok: false, error: "history formati noto'g'ri.", status: 400 };
      }
    }
  }

  return {
    ok: true,
    data: {
      message: trimmed,
      history: history as AgronomRequest["history"],
    },
  };
}
