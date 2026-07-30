/**
 * Vision API unit tests (no live OpenAI / network required for validation).
 * Run: npx tsx scripts/test-vision.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  validateVisionRequest,
  VISION_MAX_IMAGES,
  VISION_MAX_BYTES,
} from "../lib/agronom/vision-validate";
import { resolveVisionImages } from "../lib/agronom/vision-images";
import { validateChatRequest } from "../lib/agronom/chat-validate";
import { authenticateRequest } from "../lib/agronom/auth";
import { isPrivateIp } from "../lib/agronom/ssrf";

let passed = 0;
let failed = 0;

function ok(name: string) {
  console.log(`PASS: ${name}`);
  passed++;
}
function fail(name: string, detail?: string) {
  console.error(`FAIL: ${name}${detail ? " — " + detail : ""}`);
  failed++;
}

/** 1x1 PNG */
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const TINY_DATA_URI = `data:image/png;base64,${TINY_PNG_B64}`;

async function main() {
  // --- Validation: URL image ---
  {
    const r = validateVisionRequest({
      images: [{ url: "https://example.com/image1.jpg" }],
      message: "Pomidor bargida nima muammo bor?",
      language: "uz",
      sessionId: "user-123",
      region: "Toshkent",
      crop: "Pomidor",
    });
    if (r.ok && r.data.images[0]?.url?.includes("example.com")) ok("URL image");
    else fail("URL image");
  }

  // --- Base64 ---
  {
    const r = validateVisionRequest({
      images: [{ base64: TINY_PNG_B64 }],
      language: "uz",
    });
    if (r.ok && r.data.images[0]?.base64) ok("Base64 image");
    else fail("Base64 image");
  }

  // --- Data URI ---
  {
    const r = validateVisionRequest({
      images: [{ url: TINY_DATA_URI }],
      message: "test",
      language: "auto",
    });
    if (r.ok && r.data.images[0]?.dataUri?.startsWith("data:image/")) {
      ok("Data URI");
    } else fail("Data URI");
  }

  // --- Resolve data URI / base64 locally ---
  {
    const imgs = await resolveVisionImages([
      { dataUri: TINY_DATA_URI },
      { base64: TINY_PNG_B64 },
    ]);
    if (
      imgs.length === 2 &&
      imgs[0].mime === "image/png" &&
      imgs[0].bytes > 0 &&
      imgs[0].bytes <= VISION_MAX_BYTES
    ) {
      ok("Resolve data URI + base64");
    } else fail("Resolve data URI + base64");
  }

  // --- 5 images OK ---
  {
    const r = validateVisionRequest({
      images: Array.from({ length: 5 }, () => ({ url: TINY_DATA_URI })),
    });
    if (r.ok && r.data.images.length === VISION_MAX_IMAGES) ok("5 images");
    else fail("5 images");
  }

  // --- 6 images → 413 ---
  {
    const r = validateVisionRequest({
      images: Array.from({ length: 6 }, () => ({ url: "https://example.com/a.jpg" })),
    });
    if (!r.ok && r.status === 413 && r.error === "Too many images") {
      ok("6 images");
    } else fail("6 images", r.ok ? "ok unexpectedly" : `${r.status} ${r.error}`);
  }

  // --- Wrong mime via data URI ---
  {
    const r = validateVisionRequest({
      images: [{ dataUri: "data:application/pdf;base64,AAAA" }],
    });
    if (!r.ok && r.status === 415) ok("Wrong mime (validate)");
    else fail("Wrong mime (validate)");
  }

  {
    try {
      await resolveVisionImages([
        { dataUri: "data:image/svg+xml;base64,PHN2Zy8+" },
      ]);
      fail("Wrong mime (resolve)");
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 415) ok("Wrong mime (resolve)");
      else fail("Wrong mime (resolve)", String(e));
    }
  }

  // --- Malformed base64 ---
  {
    const r = validateVisionRequest({
      images: [{ base64: "!!!not-base64!!!" }],
    });
    if (!r.ok && r.status === 422) ok("Malformed base64");
    else fail("Malformed base64");
  }

  // --- Invalid URL scheme ---
  {
    const r = validateVisionRequest({
      images: [{ url: "ftp://evil.example/a.jpg" }],
    });
    if (!r.ok && r.status === 415) ok("Invalid URL scheme");
    else fail("Invalid URL scheme");
  }

  // --- Large image ---
  {
    // ~10.5 MB decoded → base64 length ~14M chars — too heavy for unit test memory.
    // Simulate by estimating: craft short invalid size via resolve with oversized declared content.
    const oversizeB64 = Buffer.alloc(VISION_MAX_BYTES + 1024).toString("base64");
    try {
      await resolveVisionImages([{ base64: oversizeB64 }]);
      fail("Large image");
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 413) ok("Large image");
      else fail("Large image", String(e));
    }
  }

  // --- SSRF helpers ---
  if (isPrivateIp("127.0.0.1") && isPrivateIp("10.0.0.1") && !isPrivateIp("8.8.8.8")) {
    ok("SSRF private IP helpers");
  } else fail("SSRF private IP helpers");

  // --- OpenAPI ---
  {
    const spec = JSON.parse(
      readFileSync(join(process.cwd(), "docs", "openapi.json"), "utf-8")
    ) as {
      paths: Record<string, unknown>;
      components: { schemas: Record<string, unknown> };
    };
    const vision = spec.paths["/api/agronom/vision"] as {
      post?: { responses?: Record<string, unknown> };
    };
    const responses = vision?.post?.responses || {};
    const need = ["200", "401", "413", "415", "422", "429", "500"];
    const hasAll = need.every((c) => c in responses);
    const hasSchemas =
      "VisionRequest" in spec.components.schemas &&
      "VisionSuccessResponse" in spec.components.schemas;
    if (hasAll && hasSchemas && spec.paths["/api/agronom/chat"]) {
      ok("OpenAPI");
    } else fail("OpenAPI");
  }

  // --- Wrong auth ---
  {
    const bad = authenticateRequest("Bearer totally-wrong-key");
    if (!bad.ok && bad.response.error === "Unauthorized") ok("Wrong auth");
    else fail("Wrong auth");
  }

  // --- API compatibility: chat validate unchanged ---
  {
    const legacy = validateChatRequest({
      message: "Pomidor barglari sarg'aygan",
      language: "auto",
      sessionId: "s1",
    });
    if (legacy.ok) ok("API compatibility (chat validate)");
    else fail("API compatibility (chat validate)");
  }

  // Empty images
  {
    const r = validateVisionRequest({ images: [], message: "x" });
    if (!r.ok && r.status === 422) ok("Empty images rejected");
    else fail("Empty images rejected");
  }

  console.log(`\n=== Vision: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
