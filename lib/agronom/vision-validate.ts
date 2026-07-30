import type { SupportedLanguage } from "./api-types";
import { resolveLanguage } from "./language";

export const VISION_MAX_IMAGES = 5;
export const VISION_MAX_BYTES = 10 * 1024 * 1024;
export const VISION_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type VisionImageInput = {
  url?: string;
  base64?: string;
  dataUri?: string;
};

export type ValidatedVision = {
  message: string;
  language: SupportedLanguage;
  sessionId?: string;
  region?: string;
  crop?: string;
  images: VisionImageInput[];
};

export type VisionValidateResult =
  | { ok: true; data: ValidatedVision }
  | { ok: false; error: string; status: number };

function asRecord(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

function normalizeImageEntry(raw: unknown): VisionImageInput | { error: string; status: number } {
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("data:image/")) return { dataUri: s };
    if (s.startsWith("http://") || s.startsWith("https://")) return { url: s };
    // bare base64
    if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.replace(/\s/g, "").length > 32) {
      return { base64: s.replace(/\s/g, "") };
    }
    return { error: "Unsupported image", status: 415 };
  }
  if (!raw || typeof raw !== "object") {
    return { error: "Invalid request", status: 422 };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.url === "string" && o.url.trim()) {
    const u = o.url.trim();
    if (u.startsWith("data:image/")) return { dataUri: u };
    if (u.startsWith("http://") || u.startsWith("https://")) return { url: u };
    return { error: "Unsupported image", status: 415 };
  }
  if (typeof o.dataUri === "string" && o.dataUri.trim()) {
    if (!o.dataUri.trim().startsWith("data:image/")) {
      return { error: "Unsupported image", status: 415 };
    }
    return { dataUri: o.dataUri.trim() };
  }
  if (typeof o.base64 === "string" && o.base64.trim()) {
    const b64 = o.base64.replace(/\s/g, "");
    if (!/^[A-Za-z0-9+/=]+$/.test(b64)) {
      return { error: "Invalid request", status: 422 };
    }
    return { base64: b64, ...(typeof o.mime === "string" ? {} : {}) };
  }
  return { error: "Invalid request", status: 422 };
}

export function validateVisionRequest(body: unknown): VisionValidateResult {
  const obj = asRecord(body);
  if (!obj) {
    return { ok: false, error: "Invalid request", status: 422 };
  }

  const message = obj.message;
  if (message !== undefined && typeof message !== "string") {
    return { ok: false, error: "Invalid request", status: 422 };
  }
  const trimmed = typeof message === "string" ? message.trim() : "";
  if (trimmed.length > 4000) {
    return { ok: false, error: "Invalid request", status: 422 };
  }

  if (obj.sessionId !== undefined) {
    if (typeof obj.sessionId !== "string" || !obj.sessionId.trim()) {
      return { ok: false, error: "Invalid request", status: 422 };
    }
    if (obj.sessionId.length > 128) {
      return { ok: false, error: "Invalid request", status: 422 };
    }
  }

  if (!Array.isArray(obj.images) || obj.images.length === 0) {
    return { ok: false, error: "Invalid request", status: 422 };
  }
  if (obj.images.length > VISION_MAX_IMAGES) {
    return { ok: false, error: "Too many images", status: 413 };
  }

  const images: VisionImageInput[] = [];
  for (const item of obj.images) {
    const n = normalizeImageEntry(item);
    if ("error" in n) {
      return { ok: false, error: n.error, status: n.status };
    }
    images.push(n);
  }

  const language = resolveLanguage(
    typeof obj.language === "string" ? obj.language : "auto",
    trimmed || "image analysis"
  );

  return {
    ok: true,
    data: {
      message: trimmed || "O'simlikdagi muammoni tahlil qil.",
      language,
      sessionId:
        typeof obj.sessionId === "string" ? obj.sessionId.trim() : undefined,
      region: typeof obj.region === "string" ? obj.region.trim() : undefined,
      crop: typeof obj.crop === "string" ? obj.crop.trim() : undefined,
      images,
    },
  };
}
