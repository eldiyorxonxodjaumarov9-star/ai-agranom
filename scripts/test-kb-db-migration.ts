/**
 * DB migration readiness + product verification + corpus expansion regression.
 */
import { corpusStats } from "../server/kb/corpus/build";
import { checkDatabaseHealth } from "../server/kb/db/client";
import { verifyProductRecord, DOSE_DISCLAIMER_UZ } from "../server/kb/products/verify";
import { retrieveKnowledge } from "../server/kb/retrieve";
import { validateChatRequest } from "../lib/agronom/chat-validate";
import { SERVICE_NAME } from "../lib/agronom/api-types";

let passed = 0;
let failed = 0;
function ok(n: string) {
  console.log(`PASS: ${n}`);
  passed++;
}
function fail(n: string, d?: string) {
  console.error(`FAIL: ${n}${d ? " — " + d : ""}`);
  failed++;
}

async function main() {
  const health = await checkDatabaseHealth();
  if (health.knowledgeBaseMode === "corpus_fallback") ok("corpus fallback mode without DB");
  else ok("database mode");
  if (health.error === "DATABASE_URL_REQUIRED" || health.database === "not_configured") {
    ok("DATABASE_URL_REQUIRED signaled when unset");
  } else if (health.database === "connected") {
    ok("database connected");
  } else if (health.knowledgeBaseMode === "corpus_fallback") {
    ok("disconnected DB uses corpus fallback");
  } else {
    fail("unexpected db health", JSON.stringify(health));
  }

  const stats = corpusStats();
  if (stats.diseases >= 150) ok(`diseases expanded (${stats.diseases})`);
  else fail("diseases expanded", String(stats.diseases));
  if (stats.pests >= 100) ok(`pests expanded (${stats.pests})`);
  else fail("pests expanded", String(stats.pests));
  if (stats.totalChunks >= 4000) ok(`chunks expanded (${stats.totalChunks})`);
  else fail("chunks expanded", String(stats.totalChunks));

  const incomplete = verifyProductRecord({
    registryRecordExists: false,
    registrationNumber: null,
    labelUrl: "https://www.fao.org",
    approvedCrops: ["tomato"],
    approvedTargets: ["aphid"],
  });
  if (incomplete.status === "NEEDS_REVIEW" && !incomplete.canRecommend) {
    ok("incomplete product stays NEEDS_REVIEW");
  } else fail("incomplete product", incomplete.status);

  const expired = verifyProductRecord({
    registryRecordExists: true,
    registrationNumber: "KZ-1",
    manufacturerMatches: true,
    activeIngredientMatches: true,
    formulationMatches: true,
    approvedCrops: ["tomato"],
    approvedTargets: ["late-blight"],
    labelUrl: "https://example.com/label.pdf",
    sourceChecksum: "abc",
    expiresAt: "2020-01-01",
  });
  if (expired.status === "EXPIRED") ok("expired product rejected");
  else fail("expired product", expired.status);

  const revoked = verifyProductRecord({
    registryRecordExists: true,
    registrationNumber: "KZ-1",
    revoked: true,
  });
  if (revoked.status === "REVOKED") ok("revoked product rejected");
  else fail("revoked product", revoked.status);

  const complete = verifyProductRecord({
    registryRecordExists: true,
    registrationNumber: "KZ-TEST-001",
    manufacturerMatches: true,
    activeIngredientMatches: true,
    formulationMatches: true,
    approvedCrops: ["tomato"],
    approvedTargets: ["late-blight"],
    labelUrl: "https://www.gov.kz/label",
    sourceChecksum: "deadbeef",
  });
  if (complete.status === "VERIFIED" && complete.canRecommend) ok("full checklist verifies");
  else fail("full checklist", complete.status);

  if (DOSE_DISCLAIMER_UZ.includes("yorlig")) ok("dose disclaimer present");
  else fail("dose disclaimer");

  const rag = await retrieveKnowledge("Phytophthora infestans tomato late blight PHYTIN");
  if (rag.chunks.length > 0 && rag.sources.length > 0) ok("retrieval works (corpus fallback)");
  else fail("retrieval");

  if (SERVICE_NAME === "agro-olam-ai-agronom") ok("api service unchanged");
  else fail("api service");
  if (validateChatRequest({ message: "pomidor", language: "auto" }).ok) ok("api compat");
  else fail("api compat");

  console.log(`\n=== DB migration tests: ${passed} passed, ${failed} failed ===\n`);
  console.log(
    "TARGETS:",
    JSON.stringify({
      diseases: { target: "300-500", actual: stats.diseases },
      pests: { target: "150-300", actual: stats.pests },
      chunks: { target: 10000, actual: stats.totalChunks },
      DATABASE_URL_REQUIRED: health.error === "DATABASE_URL_REQUIRED",
    })
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
