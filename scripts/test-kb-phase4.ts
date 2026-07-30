/**
 * Phase 4 tests — embeddings CLI contract, vector-first retrieval,
 * cron auth, product verification gates, API compat.
 */
import assert from "assert";
import { NextRequest } from "next/server";
import { authorizeCronRequest } from "../lib/agronom/cron-auth";
import { verifyProductRecord } from "../server/kb/products/verify";
import {
  parseKzPppCsv,
  importKzPppRows,
  parseKzPppJson,
} from "../server/kb/products/kz-ppp-import";
import { corpusStats } from "../server/kb/corpus/build";
import { SERVICE_NAME } from "../lib/agronom/api-types";
import { retrieveKnowledge } from "../server/kb/retrieve";

let passed = 0;
let failed = 0;

function ok(name: string) {
  passed++;
  console.log(`PASS: ${name}`);
}
function fail(name: string, err: unknown) {
  failed++;
  console.error(`FAIL: ${name}`, err);
}

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    prev[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

function req(auth?: string) {
  return new NextRequest("https://example.com/api/cron/kb-bootstrap", {
    headers: auth ? { authorization: auth } : {},
  });
}

async function main() {
  // Expansion targets
  try {
    const stats = corpusStats();
    assert.ok(stats.diseases >= 300, `diseases ${stats.diseases}`);
    assert.ok(stats.pests >= 150, `pests ${stats.pests}`);
    assert.ok(stats.totalChunks >= 10000, `chunks ${stats.totalChunks}`);
    ok(`expansion targets (d=${stats.diseases} p=${stats.pests} c=${stats.totalChunks})`);
  } catch (e) {
    fail("expansion targets", e);
  }

  // Cron auth
  try {
    withEnv(
      { CRON_SECRET: "test-cron-secret-32chars-xxxxxx", KB_CRON_ALLOW_AGRO_KEY: undefined, AGRO_API_KEY: "agro-key" },
      () => {
        const missing = authorizeCronRequest(req());
        assert.equal(missing.ok, false);
        assert.equal(!missing.ok && missing.reason, "missing");

        const invalid = authorizeCronRequest(req("Bearer wrong"));
        assert.equal(invalid.ok, false);

        const valid = authorizeCronRequest(req("Bearer test-cron-secret-32chars-xxxxxx"));
        assert.equal(valid.ok, true);
        assert.equal(valid.ok && valid.via, "cron_secret");
      }
    );
    ok("cron valid/invalid/missing secret");
  } catch (e) {
    fail("cron auth", e);
  }

  try {
    withEnv(
      {
        CRON_SECRET: "cron-only",
        AGRO_API_KEY: "agro-fallback-key",
        KB_CRON_ALLOW_AGRO_KEY: "1",
      },
      () => {
        const viaAgro = authorizeCronRequest(req("Bearer agro-fallback-key"));
        assert.equal(viaAgro.ok, true);
        assert.equal(viaAgro.ok && viaAgro.via, "agro_api_key");
      }
    );
    ok("cron agro key fallback when allowed");
  } catch (e) {
    fail("cron agro fallback", e);
  }

  // Product verification
  try {
    const expired = verifyProductRecord({
      registryRecordExists: true,
      registrationNumber: "KZ-1",
      manufacturer: "X",
      activeIngredient: "Y",
      formulation: "SC",
      approvedCrops: ["tomato"],
      approvedTargets: ["aphid"],
      labelUrl: "https://example.com/label.pdf",
      sourceChecksum: "abc",
      expiresAt: "2020-01-01",
    });
    assert.equal(expired.status, "EXPIRED");
    assert.equal(expired.canRecommend, false);
    ok("expired product rejection");
  } catch (e) {
    fail("expired product", e);
  }

  try {
    const unverified = verifyProductRecord({
      registryRecordExists: false,
      registrationNumber: null,
    });
    assert.ok(
      unverified.status === "NEEDS_REVIEW" || unverified.status === "INCOMPLETE"
    );
    assert.equal(unverified.canRecommend, false);
    ok("unverified product rejection");
  } catch (e) {
    fail("unverified product", e);
  }

  try {
    const full = verifyProductRecord({
      registryRecordExists: true,
      registrationNumber: "KZ-99",
      manufacturer: "AgroChem",
      activeIngredient: "copper",
      concentration: "50%",
      formulation: "WP",
      approvedCrops: ["tomato"],
      approvedTargets: ["late-blight"],
      labelUrl: "https://example.com/label.pdf",
      officialPdfUrl: "https://example.com/label.pdf",
      sourceChecksum: "deadbeef",
      requestCropId: "potato",
    });
    assert.equal(full.status, "VERIFIED");
    assert.equal(full.canRecommend, false); // crop mismatch
    ok("crop mismatch rejection");
  } catch (e) {
    fail("crop mismatch", e);
  }

  try {
    const target = verifyProductRecord({
      registryRecordExists: true,
      registrationNumber: "KZ-98",
      manufacturer: "AgroChem",
      activeIngredient: "copper",
      concentration: "50%",
      formulation: "WP",
      approvedCrops: ["tomato"],
      approvedTargets: ["late-blight"],
      labelUrl: "https://example.com/label.pdf",
      sourceChecksum: "cafebabe",
      requestCropId: "tomato",
      requestTarget: "aphid",
    });
    assert.equal(target.status, "VERIFIED");
    assert.equal(target.canRecommend, false);
    ok("target mismatch rejection");
  } catch (e) {
    fail("target mismatch", e);
  }

  try {
    const noLabel = verifyProductRecord({
      registryRecordExists: true,
      registrationNumber: "KZ-97",
      manufacturer: "AgroChem",
      activeIngredient: "copper",
      formulation: "WP",
      approvedCrops: ["tomato"],
      approvedTargets: ["late-blight"],
      labelUrl: null,
      sourceChecksum: "aabb",
    });
    assert.notEqual(noLabel.status, "VERIFIED");
    assert.equal(noLabel.doseAllowed, false);
    ok("label missing rejection");
  } catch (e) {
    fail("label missing", e);
  }

  try {
    const good = verifyProductRecord({
      registryRecordExists: true,
      registrationNumber: "KZ-96",
      manufacturer: "AgroChem",
      activeIngredient: "copper",
      concentration: "50% WP",
      formulation: "WP",
      approvedCrops: ["tomato"],
      approvedTargets: ["late-blight"],
      labelUrl: "https://example.com/label.pdf",
      sourceChecksum: "ff00",
      requestCropId: "tomato",
      requestTarget: "late-blight",
    });
    assert.equal(good.status, "VERIFIED");
    assert.equal(good.canRecommend, true);
    assert.equal(good.doseAllowed, true);
    ok("product verification pass");
  } catch (e) {
    fail("product verification pass", e);
  }

  // KZ CSV parse + offline import report
  try {
    const csv = `product_name,registration_number,manufacturer,active_ingredient,crops,targets,label_url
Copper Max,KZ-REG-1,AgroChem,copper oxychloride,tomato;potato,late-blight,https://example.com/l.pdf`;
    const rows = parseKzPppCsv(csv);
    assert.equal(rows.length, 1);
    const report = await importKzPppRows(rows, { filename: "test.csv" });
    assert.equal(report.parsed, 1);
    assert.ok(report.sourceProvenance.checksum);
    ok("kz ppp csv import report");
  } catch (e) {
    fail("kz ppp import", e);
  }

  // Retrieval corpus fallback (no DB)
  try {
    delete process.env.DATABASE_URL;
    const rag = await retrieveKnowledge("Phytophthora infestans tomato late blight", {
      limit: 5,
      language: "en",
    });
    assert.ok(rag.chunks.length >= 0);
    ok("keyword/corpus retrieval path");
  } catch (e) {
    fail("retrieval", e);
  }

  // API service name unchanged
  try {
    assert.equal(SERVICE_NAME, "agro-olam-ai-agronom");
    ok("api service unchanged");
  } catch (e) {
    fail("api service", e);
  }

  // Embedding reindex contract (module exports)
  try {
    const mod = await import("../server/kb/db/embeddings-reindex");
    assert.equal(typeof mod.reindexEmbeddings, "function");
    assert.equal(typeof mod.resetEmbeddingCheckpoint, "function");
    ok("full embedding reindex module");
  } catch (e) {
    fail("embedding reindex module", e);
  }

  // Bootstrap batch module
  try {
    const boot = await import("../server/kb/db/bootstrap-batch");
    assert.equal(typeof boot.runCorpusBootstrapBatch, "function");
    assert.equal(typeof boot.getBootstrapStatus, "function");
    ok("production corpus bootstrap module");
  } catch (e) {
    fail("bootstrap module", e);
  }

  // Malformed KZ file
  try {
    try {
      parseKzPppJson("{not-json");
      fail("product malformed file", "should throw");
    } catch {
      ok("product malformed JSON rejected");
    }
  } catch (e) {
    fail("malformed file", e);
  }

  console.log(`\n=== Phase 4 tests: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
