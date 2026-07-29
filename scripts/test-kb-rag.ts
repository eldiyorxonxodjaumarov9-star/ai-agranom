/**
 * Phase 1 KB tests — no network required for keyword path.
 * Run: npx tsx scripts/test-kb-rag.ts
 */
import { retrieveKnowledge } from "../server/kb/retrieve";
import { getVerifiedChunks, loadChunks } from "../server/kb/store";
import { normalizeIngestItem, ingestJsonItems } from "../server/kb/ingest";
import { SOURCE_REGISTRY } from "../server/kb/source-registry";

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

async function main() {
  // Seeds load
  const chunks = getVerifiedChunks();
  if (chunks.length >= 5) ok(`seed verified chunks (${chunks.length})`);
  else fail("seed verified chunks", String(chunks.length));

  // Source registry safety
  if (SOURCE_REGISTRY.every((s) => typeof s.allowedForIngestion === "boolean")) {
    ok("source registry fields");
  } else fail("source registry fields");

  // Reject disallowed source
  const rejected = normalizeIngestItem({
    entityType: "disease",
    entityId: "x",
    language: "ru",
    title: "Test",
    content: "Test content",
    sourceRegistryId: "not-real-source",
    sourceUrl: "https://example.com",
    sourceTitle: "x",
    status: "VERIFIED",
  });
  if (rejected === null) ok("reject unknown source");
  else fail("reject unknown source");

  // Treatment cannot auto-verify
  const treatment = normalizeIngestItem({
    entityType: "treatment",
    entityId: "t1",
    language: "ru",
    title: "Fake dose",
    content: "Spray 999 ml invent dose",
    sourceRegistryId: "fao",
    sourceUrl: "https://www.fao.org",
    sourceTitle: "FAO",
    status: "VERIFIED",
  });
  if (treatment?.status === "NEEDS_REVIEW") ok("treatment not auto-verified");
  else fail("treatment not auto-verified", treatment?.status);

  // Disease retrieval (keyword)
  const blight = await retrieveKnowledge(
    "Почему фитофтороз на томате белый налёт на листьях?"
  );
  if (blight.chunks.some((c) => c.entityId.includes("phytophthora"))) {
    ok("disease retrieval late blight");
  } else fail("disease retrieval late blight", blight.chunks.map((c) => c.id).join(","));

  // Nutrient retrieval
  const nitrogen = await retrieveKnowledge("Почему желтеют нижние листья томата азот");
  if (nitrogen.chunks.some((c) => c.entityType === "nutrient" || c.id.includes("nitrogen") || c.id.includes("n-deficiency"))) {
    ok("nutrient retrieval");
  } else fail("nutrient retrieval");

  // Multilingual
  const uz = await retrieveKnowledge("Pomidor fitoftorozi oq mog'or");
  if (uz.chunks.length > 0) ok("multilingual uz retrieval");
  else fail("multilingual uz retrieval");

  // Citations present
  if (blight.sources.length > 0 && blight.sources[0].url.startsWith("http")) {
    ok("source citations");
  } else fail("source citations");

  // Confidence in range
  if (blight.confidence >= 0 && blight.confidence <= 1) ok("confidence range");
  else fail("confidence range");

  // Import sample
  const before = loadChunks().length;
  const imp = ingestJsonItems([
    {
      entityType: "general",
      entityId: "test-import-temp",
      language: "en",
      title: "Temp import chunk",
      content: "Temporary test chunk for ingestion unit test.",
      keywords: ["temp-import-test"],
      sourceRegistryId: "agro-olam-catalog",
      sourceUrl: "https://ai-agranom.vercel.app",
      sourceTitle: "Test",
      status: "NEEDS_REVIEW",
      id: "chunk-temp-import-test",
    },
  ]);
  if (imp.added + imp.updated + imp.skipped >= 1 && loadChunks().length >= before) {
    ok("json ingest");
  } else fail("json ingest", JSON.stringify(imp));

  console.log(`\n=== KB tests: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
