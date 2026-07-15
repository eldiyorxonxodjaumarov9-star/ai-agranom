import type { ChatApiRequest } from "./api-types";
import type { SupportedLanguage } from "./api-types";
import { resolveLanguage } from "./language";

const MAX_MESSAGE_LENGTH = 4000;
const SESSION_ID_MAX = 128;
const MAX_IMAGES = 10;
const MAX_IMAGE_CHARS = 2_500_000; // ~base64 budget

export type ValidatedChat = {
  message: string;
  language: SupportedLanguage;
  sessionId?: string;
  images?: string[];
  cropMemory?: string;
  weather?: string;
};

export type ChatValidateResult =
  | { ok: true; data: ValidatedChat }
  | { ok: false; error: string; status: number };

export function validateChatRequest(body: unknown): ChatValidateResult {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: "message maydoni majburiy va matn bo'lishi kerak.",
      status: 400,
    };
  }

  const { message, language, sessionId, images, cropMemory, weather } =
    body as ChatApiRequest;

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

  let safeImages: string[] | undefined;
  if (images !== undefined) {
    if (!Array.isArray(images)) {
      return { ok: false, error: "images massiv bo'lishi kerak.", status: 400 };
    }
    if (images.length > MAX_IMAGES) {
      return {
        ok: false,
        error: `Bir vaqtda maksimal ${MAX_IMAGES} ta rasm.`,
        status: 400,
      };
    }
    safeImages = images.filter(
      (img) => typeof img === "string" && img.startsWith("data:image/")
    );
    const total = safeImages.reduce((s, i) => s + i.length, 0);
    if (total > MAX_IMAGE_CHARS) {
      return { ok: false, error: "Rasmlar hajmi juda katta.", status: 400 };
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
      images: safeImages?.length ? safeImages : undefined,
      cropMemory:
        typeof cropMemory === "string" ? cropMemory.slice(0, 8000) : undefined,
      weather: typeof weather === "string" ? weather.slice(0, 2000) : undefined,
    },
  };
}
