/**
 * Recommend-gate integration tests (registry + seller + freshness).
 * Run: npx tsx scripts/test-recommend-gate-integration.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { evaluateProductRecommendation } from "../server/kb/products/recommend-gate";
import {
  assertSellerDomainAllowed,
  matchOfferToVerifiedProductId,
  parseSellerPage,
} from "../server/kb/adapters/seller-offer";
import { isOfferFresh } from "../server/kb/parsers/policy";
import {
  parseOfficialPppCsv,
  importOfficialPppRows,
} from "../server/kb/products/official-ppp-import";

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
  const baseOk = {
    registryRecordExists: true,
    registrationNumber: "UZ-PPP-2024-001",
    registrationCountry: "UZ",
    manufacturer: "Syngenta",
    activeIngredient: "Metalaxyl-M + Mancozeb",
    concentration: "40+640 g/kg",
    formulation: "WG",
    approvedCrops: ["pomidor", "kartoshka"],
    approvedTargets: ["phytophthora", "late blight"],
    labelUrl: "https://akk.karantin.uz/media/labels/uz-ppp-2024-001.pdf",
    sourceChecksum: "abc123checksum",
    sourceDocumentId: "uz-official-doc-001",
    sourceDocumentSha256: "a".repeat(64),
    sourceDocumentCountry: "UZ",
    trustedOfficialSource: true,
    officialHostTrusted: true,
    adminApproved: true,
    verifiedBy: "admin",
    verifiedAt: new Date(),
    expiresAt: "2028-12-31",
    registrationStatus: "ACTIVE" as const,
    requestCropId: "pomidor",
    requestTarget: "phytophthora",
    productStatus: "VERIFIED",
    labelVerified: true,
    bannedActiveIngredient: false,
    offerLastCheckedAt: new Date(),
  };

  {
    const r = evaluateProductRecommendation(baseOk);
    if (r.allowed && r.offerFresh)
      ok("ACTIVE+VERIFIED+crop/target → recommend");
    else fail("ACTIVE+VERIFIED+crop/target → recommend", JSON.stringify(r));
  }

  {
    const r = evaluateProductRecommendation({
      ...baseOk,
      expiresAt: new Date(Date.now() - 86400000),
      registrationStatus: "EXPIRED",
      productStatus: "EXPIRED",
    });
    if (!r.allowed) ok("expired blocked");
    else fail("expired blocked", JSON.stringify(r));
  }

  {
    const r = evaluateProductRecommendation({
      ...baseOk,
      revoked: true,
      registrationStatus: "REVOKED",
      productStatus: "REVOKED",
    });
    if (!r.allowed) ok("revoked blocked");
    else fail("revoked blocked");
  }

  {
    const r = evaluateProductRecommendation({
      ...baseOk,
      bannedActiveIngredient: true,
    });
    if (!r.allowed && r.reasons.includes("banned_active_ingredient"))
      ok("banned AI blocked");
    else fail("banned AI blocked", JSON.stringify(r));
  }

  {
    const r = evaluateProductRecommendation({
      ...baseOk,
      labelVerified: false,
      labelUrl: undefined,
    });
    if (!r.allowed) ok("no label blocked");
    else fail("no label blocked", JSON.stringify(r));
  }

  {
    const r = evaluateProductRecommendation({
      ...baseOk,
      requestCropId: "paxta",
    });
    if (!r.allowed) ok("crop mismatch blocked");
    else fail("crop mismatch blocked", JSON.stringify(r));
  }

  {
    const r = evaluateProductRecommendation({
      registryRecordExists: false,
      registrationNumber: null,
      manufacturer: "ShopBrand",
      activeIngredient: "unknown",
      formulation: "SC",
      approvedCrops: [],
      approvedTargets: [],
      labelUrl: null,
      sourceChecksum: null,
      productStatus: "NEEDS_REVIEW",
      labelVerified: false,
      registrationStatus: "UNKNOWN",
    });
    if (!r.allowed) ok("seller-only (no registry) not recommended");
    else fail("seller-only (no registry) not recommended", JSON.stringify(r));
  }

  {
    const staleAt = new Date(Date.now() - 100 * 3600_000);
    const r = evaluateProductRecommendation({
      ...baseOk,
      offerLastCheckedAt: staleAt,
      offerFreshnessHours: 72,
    });
    if (r.allowed && !r.offerFresh && r.reasons.includes("offer_stale"))
      ok("stale offer not current (price/stock)");
    else fail("stale offer not current", JSON.stringify(r));
    if (!isOfferFresh(staleAt, 72)) ok("isOfferFresh agrees stale");
    else fail("isOfferFresh agrees stale");
  }

  {
    const linked = matchOfferToVerifiedProductId({
      tradeName: "Ridomil Gold MZ 68 WG",
      candidates: [
        {
          id: "uz-1",
          name: "Ridomil Gold MZ 68 WG",
          status: "VERIFIED",
          registrationStatus: "ACTIVE",
        },
        {
          id: "uz-2",
          name: "Shop Only Product",
          status: "NEEDS_REVIEW",
          registrationStatus: "UNKNOWN",
        },
      ],
    });
    if (linked === "uz-1") ok("offer links only VERIFIED+ACTIVE name match");
    else fail("offer links only VERIFIED+ACTIVE", String(linked));

    const noLink = matchOfferToVerifiedProductId({
      tradeName: "Shop Only Product",
      candidates: [
        {
          id: "uz-2",
          name: "Shop Only Product",
          status: "NEEDS_REVIEW",
          registrationStatus: "UNKNOWN",
        },
      ],
    });
    if (noLink === null) ok("seller-only name does not link as verified");
    else fail("seller-only name does not link");
  }

  {
    const domainGate = assertSellerDomainAllowed({
      domain: "unknown-shop.uz",
      allowlist: ["allowed-pharmacy.uz"],
      robotsTxt: "User-agent: *\nAllow: /\n",
      robotsFetchFailed: false,
      path: "/product/1",
    });
    if (!domainGate.allowed && domainGate.reason === "domain_not_allowlisted")
      ok("seller domain allowlist enforced");
    else fail("seller domain allowlist", JSON.stringify(domainGate));
  }

  {
    const html = `<html><head>
<script type="application/ld+json">
{"@type":"Product","name":"Topaz 100 EC","brand":{"name":"Syngenta"},"offers":{"@type":"Offer","price":"125000","priceCurrency":"UZS","availability":"https://schema.org/InStock"}}
</script></head><body></body></html>`;
    const offers = parseSellerPage(html, "https://allowed-pharmacy.uz/p/topaz");
    if (
      offers.length === 1 &&
      offers[0].tradeName === "Topaz 100 EC" &&
      offers[0].parseMethod === "json_ld" &&
      offers[0].price === 125000 &&
      offers[0].checksum
    )
      ok("seller JSON-LD parse");
    else fail("seller JSON-LD parse", JSON.stringify(offers));
  }

  {
    const csv = readFileSync(
      resolve("scripts/fixtures/uz-ppp-registry-sample.csv"),
      "utf8"
    );
    const rows = parseOfficialPppCsv(csv, "UZ");
    if (rows.length >= 3) ok(`fixture parse ${rows.length} rows`);
    else fail("fixture parse", String(rows.length));

    const report = await importOfficialPppRows(rows, {
      country: "UZ",
      filename: "uz-ppp-registry-sample.csv",
      kind: "fixture_smoke",
      dryRun: true,
    });
    if (
      report.parsed >= 3 &&
      report.failed === 0 &&
      report.verified === 0 &&
      report.imported === 0
    )
      ok(
        `fixture dryRun parsed=${report.parsed} verified=${report.verified} needsReview=${report.needsReview}`
      );
    else fail("offline import report", JSON.stringify(report));
  }

  console.log(
    `\n=== Recommend-gate integration: ${passed} passed, ${failed} failed ===\n`
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
