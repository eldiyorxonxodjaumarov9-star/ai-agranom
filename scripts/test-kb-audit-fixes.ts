/**
 * Regression tests for audit fixes (C3 embedding invalidation, ingest verify gate, corpus size).
 * Run: npx tsx scripts/test-kb-audit-fixes.ts
 */
import { contentChecksum, invalidateEmbeddings, loadEmbeddings, saveEmbeddings, upsertChunks, getVerifiedChunks, resetKbMemory } from "../server/kb/store";
import { normalizeIngestItem } from "../server/kb/ingest";
import { corpusStats } from "../server/kb/corpus/build";
import { validateChatRequest } from "../lib/agronom/chat-validate";
import { SERVICE_NAME } from "../lib/agronom/api-types";
import type { KnowledgeChunk } from "../server/kb/types";

let passed = 0;
let failed = 0;
function ok(n: string) { console.log(`PASS: ${n}`); passed++; }
function fail(n: string, d?: string) { console.error(`FAIL: ${n}${d ? " — " + d : ""}`); failed++; }

function main() {
  resetKbMemory();

  const stats = corpusStats();
  if (stats.crops >= 50) ok(`crops >= 50 (${stats.crops})`);
  else fail("crops >= 50", String(stats.crops));
  if (stats.diseases >= 80) ok(`diseases >= 80 (${stats.diseases})`);
  else fail("diseases", String(stats.diseases));
  if (stats.pests >= 50) ok(`pests >= 50 (${stats.pests})`);
  else fail("pests", String(stats.pests));
  if (stats.totalChunks >= 2000) ok(`chunks >= 2000 (${stats.totalChunks})`);
  else fail("chunks", String(stats.totalChunks));

  // C3 embedding invalidation
  saveEmbeddings({ "chunk-x": [0.1, 0.2, 0.3] });
  invalidateEmbeddings(["chunk-x"]);
  if (!loadEmbeddings()["chunk-x"]) ok("embedding invalidation");
  else fail("embedding invalidation");

  const sample: KnowledgeChunk = {
    id: "chunk-audit-reindex",
    entityType: "disease",
    entityId: "disease-audit",
    language: "en",
    title: "Audit disease",
    content: "Original content for checksum test about tomato blight symptoms.",
    keywords: ["audit"],
    sourceId: "src-a",
    sourceUrl: "https://gd.eppo.int",
    sourceTitle: "EPPO",
    organization: "EPPO",
    reliabilityScore: 0.9,
    qualityScore: 85,
    status: "VERIFIED",
    version: 1,
    updatedAt: new Date().toISOString(),
    checksum: contentChecksum("Original content for checksum test about tomato blight symptoms."),
  };
  saveEmbeddings({ "chunk-audit-reindex": [1, 0, 0] });
  upsertChunks([sample]);
  const updated = {
    ...sample,
    content: sample.content + " Updated.",
    checksum: contentChecksum(sample.content + " Updated."),
  };
  upsertChunks([updated]);
  if (!loadEmbeddings()["chunk-audit-reindex"]) ok("reindex clears embedding");
  else fail("reindex clears embedding");

  // Ingest cannot auto-verify disease without allowVerify
  const blocked = normalizeIngestItem({
    entityType: "disease",
    entityId: "x",
    language: "en",
    title: "Test disease title",
    content: "Long enough content for disease import validation gate testing here.",
    sourceRegistryId: "eppo",
    sourceUrl: "https://gd.eppo.int",
    sourceTitle: "EPPO",
    status: "VERIFIED",
  });
  if (blocked?.status === "NEEDS_REVIEW") ok("unverified treatment/disease gate");
  else fail("unverified disease gate", blocked?.status);

  const allowed = normalizeIngestItem({
    entityType: "disease",
    entityId: "y",
    language: "en",
    title: "Trusted seed disease",
    content: "Trusted seed disease content long enough for validation purposes here.",
    sourceRegistryId: "eppo",
    sourceUrl: "https://gd.eppo.int",
    sourceTitle: "EPPO",
    status: "VERIFIED",
    allowVerify: true,
  });
  if (allowed?.status === "VERIFIED") ok("allowVerify path");
  else fail("allowVerify path", allowed?.status);

  const product = normalizeIngestItem({
    entityType: "product",
    entityId: "p",
    language: "en",
    title: "Fake product",
    content: "Product content that must not auto verify even with allowVerify false.",
    sourceRegistryId: "kz-ppp-registry",
    sourceUrl: "https://www.gov.kz",
    sourceTitle: "KZ",
    status: "VERIFIED",
    allowVerify: true,
  });
  if (product?.status === "NEEDS_REVIEW") ok("product never auto verified");
  else fail("product never auto verified", product?.status);

  const verified = getVerifiedChunks();
  if (verified.length >= 2000) ok(`verified corpus loaded (${verified.length})`);
  else fail("verified corpus", String(verified.length));

  if (SERVICE_NAME === "agro-olam-ai-agronom") ok("api unchanged service");
  else fail("api service");
  if (validateChatRequest({ message: "test", language: "auto" }).ok) ok("api compat");
  else fail("api compat");

  console.log(`\n=== Audit fix tests: ${passed} passed, ${failed} failed ===\n`);
  console.log("TARGET_GAP:", JSON.stringify({
    targetChunks: 5000,
    actualChunks: stats.totalChunks,
    reason: "No licensed bulk dump/API ingested; curated attributed corpus only (no Google scrape, no fake rows).",
  }));
  process.exit(failed > 0 ? 1 : 0);
}

main();
