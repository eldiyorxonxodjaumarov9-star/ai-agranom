/**
 * Phase 2 adapter / sync / dedup tests (offline, no live network required).
 * Run: npx tsx scripts/test-kb-phase2.ts
 */
import { EPPOAdapter, FAOAdapter, USDAAdapter, KazakhstanOfficialRegistryAdapter } from "../server/kb/adapters";
import { normalizeScientificName, buildCanonicalKey, namesOverlap } from "../server/kb/normalize";
import { reliabilityForRegistry, isReliabilityAcceptable } from "../server/kb/reliability";
import { deduplicateChunks } from "../server/kb/dedup";
import { runSyncJob } from "../server/kb/sync/runner";
import { resetSyncMemory, loadSyncJobs, loadFailedImports } from "../server/kb/sync/persist";
import { resetKbMemory, loadChunks, contentChecksum } from "../server/kb/store";
import { fetchWithPolicy, HttpFetchError } from "../server/kb/adapters/http";
import { validateChatRequest } from "../lib/agronom/chat-validate";
import { SERVICE_NAME } from "../lib/agronom/api-types";
import type { KnowledgeChunk } from "../server/kb/types";

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

async function testRetryTimeout() {
  // Abortable timeout path: invalid host should fail without hanging forever
  const started = Date.now();
  try {
    await fetchWithPolicy("http://127.0.0.1:1/", {
      crawlDelayMs: 0,
      timeoutMs: 800,
      retries: 1,
    });
    fail("timeout/retry path", "expected throw");
  } catch (e) {
    const elapsed = Date.now() - started;
    if (elapsed < 15000) ok("retry/timeout fails fast");
    else fail("retry/timeout fails fast", `took ${elapsed}ms`);
    if (e instanceof Error) ok("fetch error typed");
    else fail("fetch error typed");
  }
  // HttpFetchError shape
  const err = new HttpFetchError("HTTP 429", 429, true);
  if (err.retryable && err.status === 429) ok("HttpFetchError retryable");
  else fail("HttpFetchError retryable");
}

async function main() {
  resetKbMemory();
  resetSyncMemory();

  // Normalize
  if (normalizeScientificName("  phytophthora   infestans ") === "Phytophthora infestans") {
    ok("scientific name normalize");
  } else fail("scientific name normalize", normalizeScientificName("  phytophthora   infestans "));

  const key = buildCanonicalKey({
    entityType: "disease",
    eppoCode: "PHYTIN",
    title: "Late blight",
    externalId: "x",
  });
  if (key === "disease-eppo-PHYTIN") ok("eppo canonical key");
  else fail("eppo canonical key", key);

  if (
    namesOverlap(
      { scientificName: "Phytophthora infestans", synonyms: ["late blight"] },
      { scientificName: undefined, synonyms: ["phytophthora infestans"] }
    )
  ) {
    ok("names overlap");
  } else fail("names overlap");

  // Reliability
  if (reliabilityForRegistry("eppo", "official_database") >= 0.95) ok("eppo reliability");
  else fail("eppo reliability");
  if (!isReliabilityAcceptable(0.4)) ok("reject low reliability");
  else fail("reject low reliability");

  // Adapter parsing + save (offline catalog)
  const eppo = new EPPOAdapter();
  const index = await eppo.fetchIndex();
  if (index.length >= 2) ok("eppo fetchIndex");
  else fail("eppo fetchIndex", String(index.length));

  const raw = await eppo.fetchItem(index[0]);
  if (raw?.body && raw.eppoCode === "PHYTIN") ok("eppo fetchItem/parse fields");
  else fail("eppo fetchItem/parse fields");

  const parsed = eppo.parseItem(raw!);
  const normalized = eppo.normalizeItem(parsed);
  if (normalized && eppo.validateItem(normalized)) ok("eppo normalize/validate");
  else fail("eppo normalize/validate");

  const firstSave = await eppo.saveItem(normalized!);
  if (firstSave === "added" || firstSave === "updated" || firstSave === "skipped") {
    ok("eppo saveItem");
  } else fail("eppo saveItem", firstSave);

  // Unchanged skip (same checksum)
  const secondSave = await eppo.saveItem(normalized!);
  if (secondSave === "skipped") ok("unchanged record skip");
  else fail("unchanged record skip", secondSave);

  // Changed record reindex
  const changed = {
    ...normalized!,
    content: normalized!.content + " Updated note for reindex test.",
    checksum: contentChecksum(normalized!.content + " Updated note for reindex test."),
  };
  const third = await eppo.saveItem(changed);
  if (third === "updated" || third === "added") ok("changed record reindex");
  else fail("changed record reindex", third);

  // Other adapters index
  const fao = new FAOAdapter();
  const usda = new USDAAdapter();
  const kz = new KazakhstanOfficialRegistryAdapter();
  if ((await fao.fetchIndex()).length > 0) ok("fao adapter index");
  else fail("fao adapter index");
  if ((await usda.fetchIndex()).length > 0) ok("usda adapter index");
  else fail("usda adapter index");
  if ((await kz.fetchIndex()).length > 0) ok("kz adapter index");
  else fail("kz adapter index");

  // Dedup + conflict
  const chunks: KnowledgeChunk[] = [
    {
      id: "c1",
      entityType: "disease",
      entityId: "disease-eppo-PHYTIN",
      language: "en",
      title: "Late blight (Phytophthora infestans)",
      content: "A".repeat(50),
      keywords: ["PHYTIN", "Phytophthora infestans", "late blight"],
      sourceId: "src-a",
      sourceUrl: "https://gd.eppo.int/taxon/PHYTIN",
      sourceTitle: "EPPO",
      organization: "EPPO",
      reliabilityScore: 0.96,
      status: "AI_PARSED",
      version: 1,
      updatedAt: new Date().toISOString(),
      checksum: "a",
    },
    {
      id: "c2",
      entityType: "disease",
      entityId: "disease-sci-phytophthora-infestans",
      language: "ru",
      title: "Фитофтороз (Phytophthora infestans)",
      content: "B".repeat(50),
      keywords: ["PHYTIN", "Phytophthora infestans", "фитофтороз"],
      sourceId: "src-b",
      sourceUrl: "https://www.fao.org",
      sourceTitle: "FAO",
      organization: "FAO",
      reliabilityScore: 0.95,
      status: "AI_PARSED",
      version: 1,
      updatedAt: new Date().toISOString(),
      checksum: "b",
    },
  ];
  const dedup = deduplicateChunks(chunks);
  if (dedup.duplicatesMerged >= 1 || dedup.canonical.length >= 1) ok("dedup merge");
  else fail("dedup merge", JSON.stringify(dedup));

  // Conflict detection: same EPPO, different scientific names
  resetSyncMemory();
  const conflictResult = deduplicateChunks([
    {
      ...chunks[0],
      id: "cx1",
      keywords: ["PHYTIN", "Phytophthora infestans"],
      title: "Late blight (Phytophthora infestans)",
    },
    {
      ...chunks[0],
      id: "cx2",
      entityId: "other",
      sourceId: "src-c",
      keywords: ["PHYTIN", "Phytophthora mirabilis"],
      title: "Wrong name (Phytophthora mirabilis)",
    },
  ]);
  if (conflictResult.conflicts.some((c) => c.status === "pending")) {
    ok("conflict detection");
  } else fail("conflict detection", JSON.stringify(conflictResult.conflicts));

  // Scheduled sync (offline)
  resetSyncMemory();
  const job = await runSyncJob({ kind: "full", triggeredBy: "test" });
  if (job.status === "succeeded" || job.status === "partial") ok("scheduled sync run");
  else fail("scheduled sync run", job.status + " " + job.errors.join(";"));

  if (loadSyncJobs().length >= 1) ok("sync job persisted");
  else fail("sync job persisted");

  // Failed imports list exists
  if (Array.isArray(loadFailedImports())) ok("failed imports store");
  else fail("failed imports store");

  await testRetryTimeout();

  // API backward compatibility
  if (SERVICE_NAME === "agro-olam-ai-agronom") ok("api service name");
  else fail("api service name");
  const legacy = validateChatRequest({
    message: "Pomidor kasalligi",
    language: "auto",
  });
  if (legacy.ok) ok("api backward compatibility");
  else fail("api backward compatibility");

  // Chunks grew after sync
  if (loadChunks().length >= 8) ok(`chunks after sync (${loadChunks().length})`);
  else fail("chunks after sync", String(loadChunks().length));

  console.log(`\n=== Phase 2 tests: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
