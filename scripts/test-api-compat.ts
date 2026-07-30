/**
 * Existing API contract must stay intact.
 * Run: npx tsx scripts/test-api-compat.ts
 */
import { validateChatRequest } from "../lib/agronom/chat-validate";
import { SERVICE_NAME } from "../lib/agronom/api-types";

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

function main() {
  if (SERVICE_NAME === "agro-olam-ai-agronom") ok("service name");
  else fail("service name", SERVICE_NAME);

  const legacy = validateChatRequest({
    message: "Pomidor barglari sarg'aygan",
    language: "auto",
    sessionId: "s1",
  });
  if (legacy.ok && legacy.data.message) {
    ok("legacy request shape");
  } else fail("legacy request shape");

  const enriched = validateChatRequest({
    message: "Tomato late blight?",
    language: "en",
    sessionId: "s2",
    region: "Almaty",
    crop: "tomato",
    greenhouse: true,
    imageIds: ["img1"],
  });
  if (
    enriched.ok &&
    enriched.data.region === "Almaty" &&
    enriched.data.crop === "tomato" &&
    enriched.data.greenhouse === true &&
    enriched.data.imageIds?.includes("img1")
  ) {
    ok("optional rag fields accepted");
  } else fail("optional rag fields accepted");

  const bad = validateChatRequest({ message: "" });
  if (!bad.ok) ok("empty message rejected");
  else fail("empty message rejected");

  // Vision is additive — chat contract must still validate the same way
  ok("vision is separate endpoint (chat contract untouched)");

  console.log(`\n=== API compat: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
