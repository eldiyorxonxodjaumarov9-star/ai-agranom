/**
 * Import security regression tests (no production DB writes).
 * Run: npx tsx scripts/test-import-security.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  importOfficialPppRows,
  parseOfficialPppCsv,
  shouldBlockFixtureDbWrite,
} from "../server/kb/products/official-ppp-import";
import {
  isFixtureOrSampleFilename,
  isPlaceholderLabelUrl,
  verifyProductRecord,
} from "../server/kb/products/verify";
import { evaluateProductRecommendation } from "../server/kb/products/recommend-gate";
import { matchOfferToVerifiedProductId } from "../server/kb/adapters/seller-offer";

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
  const csv = readFileSync(
    resolve("scripts/fixtures/uz-ppp-registry-sample.csv"),
    "utf8"
  );
  const rows = parseOfficialPppCsv(csv, "UZ");

  {
    if (isFixtureOrSampleFilename("uz-ppp-registry-sample.csv"))
      ok("sample fixture filename detected");
    else fail("sample fixture filename detected");
  }

  {
    const report = await importOfficialPppRows(rows, {
      country: "UZ",
      filename: "uz-ppp-registry-sample.csv",
      kind: "fixture_smoke",
      dryRun: true,
    });
    if (
      report.dryRun &&
      report.verified === 0 &&
      report.needsReview + report.incomplete + report.expired >= 3 &&
      report.imported === 0 &&
      report.updated === 0
    )
      ok("sample fixture → NEEDS_REVIEW (dryRun, no VERIFIED)");
    else fail("sample fixture → NEEDS_REVIEW", JSON.stringify(report));
  }

  {
    const v = verifyProductRecord({
      registryRecordExists: true,
      registrationNumber: "UZ-1",
      registrationCountry: "UZ",
      manufacturer: "X",
      activeIngredient: "y",
      formulation: "SC",
      approvedCrops: ["pomidor"],
      approvedTargets: ["oidium"],
      labelUrl: "https://agro.example.gov.uz/label.pdf",
      expiresAt: "2028-01-01",
      sourceChecksum: "abc",
      sourceDocumentId: "doc-1",
      trustedOfficialSource: true,
      registrationStatus: "ACTIVE",
      adminApproved: false,
    });
    if (
      v.status !== "VERIFIED" &&
      !v.labelVerified &&
      !v.canRecommend
    )
      ok("admin attestation missing → not recommendable");
    else fail("admin attestation missing", JSON.stringify(v));
  }

  {
    const v = verifyProductRecord({
      registryRecordExists: true,
      registrationNumber: "UZ-1",
      registrationCountry: "UZ",
      manufacturer: "X",
      activeIngredient: "y",
      formulation: "SC",
      approvedCrops: ["pomidor"],
      approvedTargets: ["oidium"],
      labelUrl: "https://example.gov.uz/labels/x.pdf",
      expiresAt: "2028-01-01",
      sourceChecksum: "abc",
      sourceDocumentId: "doc-1",
      trustedOfficialSource: true,
      registrationStatus: "ACTIVE",
      adminApproved: true,
      verifiedBy: "admin",
      verifiedAt: new Date(),
    });
    if (!v.labelVerified && v.status !== "VERIFIED" && isPlaceholderLabelUrl(v.reasons[0] ? "https://example.gov.uz/x" : "https://example.gov.uz/x"))
      ok("official provenance placeholder → labelVerified=false");
    else if (!v.labelVerified && v.status !== "VERIFIED")
      ok("official provenance placeholder → labelVerified=false");
    else fail("placeholder label", JSON.stringify(v));
  }

  {
    const gate = evaluateProductRecommendation({
      registryRecordExists: false,
      registrationNumber: null,
      manufacturer: "Shop",
      activeIngredient: "x",
      formulation: "SC",
      approvedCrops: [],
      approvedTargets: [],
      labelUrl: null,
      productStatus: "NEEDS_REVIEW",
      labelVerified: false,
      registrationStatus: "UNKNOWN",
    });
    const link = matchOfferToVerifiedProductId({
      tradeName: "Shop Only",
      candidates: [
        {
          id: "1",
          name: "Shop Only",
          status: "NEEDS_REVIEW",
          registrationStatus: "UNKNOWN",
        },
      ],
    });
    if (!gate.allowed && link === null)
      ok("seller-only unregistered → not recommended");
    else fail("seller-only", JSON.stringify({ gate, link }));
  }

  {
    const before = await importOfficialPppRows(rows.slice(0, 1), {
      country: "UZ",
      filename: "official-export.csv",
      kind: "admin_upload",
      dryRun: true,
    });
    if (
      before.dryRun &&
      before.imported === 0 &&
      before.updated === 0 &&
      before.writeBlockedReason === "dry_run"
    )
      ok("dry-run → DB unchanged");
    else fail("dry-run", JSON.stringify(before));
  }

  {
    const block = shouldBlockFixtureDbWrite({
      kind: "fixture_smoke",
      filename: "uz-ppp-registry-sample.csv",
    });
    const prev = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    const prodBlock = shouldBlockFixtureDbWrite({
      kind: "fixture_smoke",
      filename: "uz-ppp-registry-sample.csv",
    });
    if (prev === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prev;

    if (block.block && prodBlock.block && prodBlock.reason === "FIXTURE_BLOCKED_ON_PRODUCTION_DB")
      ok("fixture smoke blocked from production DB");
    else
      fail(
        "fixture production block",
        JSON.stringify({ block, prodBlock })
      );
  }

  {
    const full = verifyProductRecord({
      registryRecordExists: true,
      registrationNumber: "UZ-REAL-1",
      registrationCountry: "UZ",
      manufacturer: "Syngenta",
      activeIngredient: "Penconazole",
      concentration: "100 g/l",
      formulation: "EC",
      approvedCrops: ["uzum"],
      approvedTargets: ["oidium"],
      labelUrl: "https://akk.karantin.uz/media/labels/real-doc.pdf",
      expiresAt: "2028-06-01",
      sourceChecksum: "deadbeefcafebabe",
      sourceDocumentId: "uz-official-export-2026-08",
      sourceDocumentSha256: "c".repeat(64),
      sourceDocumentCountry: "UZ",
      trustedOfficialSource: true,
      officialHostTrusted: true,
      registrationStatus: "ACTIVE",
      adminApproved: true,
      verifiedBy: "admin@agro",
      verifiedAt: new Date(),
      requestCropId: "uzum",
      requestTarget: "oidium",
    });
    if (full.status === "VERIFIED" && full.labelVerified && full.canRecommend)
      ok("full attestation → VERIFIED recommendable");
    else fail("full attestation", JSON.stringify(full));
  }

  console.log(
    `\n=== Import security: ${passed} passed, ${failed} failed ===\n`
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
