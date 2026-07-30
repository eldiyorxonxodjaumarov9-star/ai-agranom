/**
 * Normalize vision images to OpenAI-ready data URLs with SSRF and size checks.
 */
import { assertSafeOutboundUrl } from "./ssrf";
import {
  VISION_ALLOWED_MIME,
  VISION_MAX_BYTES,
  type VisionImageInput,
} from "./vision-validate";

export type ResolvedVisionImage = {
  dataUrl: string;
  mime: string;
  bytes: number;
};

function mimeFromDataUri(dataUri: string): string | null {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(dataUri);
  return m ? m[1].toLowerCase() : null;
}

function estimateBase64Bytes(b64: string): number {
  const clean = b64.replace(/\s/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function assertMime(mime: string): void {
  const normalized = mime === "image/jpg" ? "image/jpeg" : mime;
  if (!VISION_ALLOWED_MIME.has(normalized) && !VISION_ALLOWED_MIME.has(mime)) {
    const err = new Error("Unsupported image");
    (err as Error & { status: number }).status = 415;
    throw err;
  }
}

function assertSize(bytes: number): void {
  if (bytes <= 0 || bytes > VISION_MAX_BYTES) {
    const err = new Error(
      bytes > VISION_MAX_BYTES ? "Image too large" : "Unsupported image"
    );
    (err as Error & { status: number }).status =
      bytes > VISION_MAX_BYTES ? 413 : 415;
    throw err;
  }
}

function fromDataUri(dataUri: string): ResolvedVisionImage {
  const mime = mimeFromDataUri(dataUri);
  if (!mime) {
    const err = new Error("Unsupported image");
    (err as Error & { status: number }).status = 415;
    throw err;
  }
  assertMime(mime);
  const comma = dataUri.indexOf(",");
  if (comma < 0) {
    const err = new Error("Invalid request");
    (err as Error & { status: number }).status = 422;
    throw err;
  }
  const b64 = dataUri.slice(comma + 1);
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64)) {
    const err = new Error("Invalid request");
    (err as Error & { status: number }).status = 422;
    throw err;
  }
  const bytes = estimateBase64Bytes(b64);
  assertSize(bytes);
  const normalizedMime = mime === "image/jpg" ? "image/jpeg" : mime;
  return {
    dataUrl: `data:${normalizedMime};base64,${b64.replace(/\s/g, "")}`,
    mime: normalizedMime,
    bytes,
  };
}

function fromBase64(b64: string, mimeHint = "image/jpeg"): ResolvedVisionImage {
  if (!/^[A-Za-z0-9+/=]+$/.test(b64)) {
    const err = new Error("Invalid request");
    (err as Error & { status: number }).status = 422;
    throw err;
  }
  const mime = mimeHint === "image/jpg" ? "image/jpeg" : mimeHint;
  assertMime(mime);
  const bytes = estimateBase64Bytes(b64);
  assertSize(bytes);
  return {
    dataUrl: `data:${mime};base64,${b64}`,
    mime,
    bytes,
  };
}

async function fromUrl(url: string): Promise<ResolvedVisionImage> {
  await assertSafeOutboundUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "AgroOlamVisionBot/1.0",
      },
    });
    if (!res.ok) {
      const err = new Error("Unsupported image");
      (err as Error & { status: number }).status = 415;
      throw err;
    }
    const contentType = (res.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (contentType && !contentType.startsWith("image/")) {
      const err = new Error("Unsupported image");
      (err as Error & { status: number }).status = 415;
      throw err;
    }
    const len = Number(res.headers.get("content-length") || 0);
    if (len > VISION_MAX_BYTES) {
      const err = new Error("Image too large");
      (err as Error & { status: number }).status = 413;
      throw err;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    assertSize(buf.byteLength);
    const mime =
      contentType && contentType.startsWith("image/")
        ? contentType === "image/jpg"
          ? "image/jpeg"
          : contentType
        : "image/jpeg";
    assertMime(mime);
    return {
      dataUrl: `data:${mime};base64,${buf.toString("base64")}`,
      mime,
      bytes: buf.byteLength,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveVisionImages(
  inputs: VisionImageInput[]
): Promise<ResolvedVisionImage[]> {
  const out: ResolvedVisionImage[] = [];
  for (const img of inputs) {
    if (img.dataUri) {
      out.push(fromDataUri(img.dataUri));
    } else if (img.url) {
      out.push(await fromUrl(img.url));
    } else if (img.base64) {
      out.push(fromBase64(img.base64));
    } else {
      const err = new Error("Invalid request");
      (err as Error & { status: number }).status = 422;
      throw err;
    }
  }
  return out;
}
