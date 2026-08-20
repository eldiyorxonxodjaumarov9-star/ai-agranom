/**
 * Parser fixture / policy unit tests (no live network).
 * Run: npx tsx scripts/test-parser-fixtures.ts
 */
import {
  assertRobotsAllowed,
  isOfferFresh,
} from "../server/kb/parsers/policy";
import {
  evaluateProductRecommendation,
  normalizeTradeName,
} from "../server/kb/products/recommend-gate";
import { isPrivateIp } from "../lib/agronom/ssrf";

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

const denyRobots = `User-agent: *\nDisallow: /products\n`;
const allowRobots = `User-agent: *\nAllow: /\n`;

{
  const r = assertRobotsAllowed({
    robotsTxt: denyRobots,
    fetchFailed: false,
    path: "/products/foo",
    mode: "commercial",
  });
  if (!r.allowed && r.reason === "robots_deny") ok("robots deny");
  else fail("robots deny", JSON.stringify(r));
}

{
  const r = assertRobotsAllowed({
    robotsTxt: null,
    fetchFailed: true,
    path: "/",
    mode: "commercial",
  });
  if (!r.allowed) ok("commercial robots fail-closed");
  else fail("commercial robots fail-closed");
}

{
  const r = assertRobotsAllowed({
    robotsTxt: allowRobots,
    fetchFailed: false,
    path: "/ok",
    mode: "commercial",
  });
  if (r.allowed) ok("robots allow");
  else fail("robots allow", JSON.stringify(r));
}

{
  // Longest-match: Allow /products/public wins over Disallow /products
  const robots = `User-agent: *\nDisallow: /products\nAllow: /products/public\n`;
  const a = assertRobotsAllowed({
    robotsTxt: robots,
    fetchFailed: false,
    path: "/products/public/item",
    mode: "commercial",
  });
  const b = assertRobotsAllowed({
    robotsTxt: robots,
    fetchFailed: false,
    path: "/products/secret",
    mode: "commercial",
  });
  if (a.allowed && !b.allowed) ok("robots longest-match Allow/Disallow");
  else fail("robots longest-match", JSON.stringify({ a, b }));
}

{
  const robots = `User-agent: *\nDisallow: /*.pdf$\nAllow: /\n`;
  const pdf = assertRobotsAllowed({
    robotsTxt: robots,
    fetchFailed: false,
    path: "/docs/label.pdf",
    mode: "commercial",
  });
  const html = assertRobotsAllowed({
    robotsTxt: robots,
    fetchFailed: false,
    path: "/docs/page.html",
    mode: "commercial",
  });
  if (!pdf.allowed && html.allowed) ok("robots wildcard $ end-anchor");
  else fail("robots wildcard $", JSON.stringify({ pdf, html }));
}

{
  if (isPrivateIp("127.0.0.1") && isPrivateIp("10.1.2.3")) ok("private IP blocked helpers");
  else fail("private IP blocked helpers");
}

{
  const stale = isOfferFresh(new Date(Date.now() - 100 * 3600_000), 72);
  const fresh = isOfferFresh(new Date(), 72);
  if (!stale && fresh) ok("offer freshness");
  else fail("offer freshness");
}

{
  const banned = evaluateProductRecommendation({
    registryRecordExists: true,
    registrationNumber: "UZ-1",
    manufacturer: "X",
    activeIngredient: "y",
    formulation: "SC",
    approvedCrops: ["pomidor"],
    approvedTargets: ["oidium"],
    labelUrl: "https://example.com/label.pdf",
    sourceChecksum: "abc",
    registrationStatus: "ACTIVE",
    requestCropId: "pomidor",
    requestTarget: "oidium",
    productStatus: "VERIFIED",
    labelVerified: true,
    bannedActiveIngredient: true,
  });
  if (!banned.allowed) ok("banned AI blocked");
  else fail("banned AI blocked");
}

{
  const okRec = evaluateProductRecommendation({
    registryRecordExists: true,
    registrationNumber: "UZ-1",
    registrationCountry: "UZ",
    manufacturer: "X",
    activeIngredient: "y",
    concentration: "250",
    formulation: "SC",
    approvedCrops: ["pomidor"],
    approvedTargets: ["oidium"],
    labelUrl: "https://akk.karantin.uz/media/labels/real.pdf",
    sourceChecksum: "abc",
    sourceDocumentId: "doc-uz-1",
    sourceDocumentSha256: "b".repeat(64),
    sourceDocumentCountry: "UZ",
    trustedOfficialSource: true,
    officialHostTrusted: true,
    adminApproved: true,
    verifiedBy: "admin",
    verifiedAt: new Date(),
    expiresAt: "2028-01-01",
    registrationStatus: "ACTIVE",
    requestCropId: "pomidor",
    requestTarget: "oidium",
    productStatus: "VERIFIED",
    labelVerified: true,
    bannedActiveIngredient: false,
    offerLastCheckedAt: new Date(),
  });
  if (okRec.allowed && okRec.offerFresh) ok("verified product recommendable");
  else fail("verified product recommendable", JSON.stringify(okRec));
}

{
  const a = normalizeTradeName("  Topáz  ");
  const b = normalizeTradeName("topaz");
  // different spelling remains different; whitespace/case normalized
  if (normalizeTradeName("TOPAZ!!") === "topaz") ok("trade name normalize");
  else fail("trade name normalize", `${a}/${b}`);
}

{
  const expired = evaluateProductRecommendation({
    registryRecordExists: true,
    registrationNumber: "KZ-1",
    manufacturer: "X",
    activeIngredient: "y",
    formulation: "WP",
    approvedCrops: ["bugdoy"],
    approvedTargets: ["rust"],
    labelUrl: "https://example.com/l.pdf",
    sourceChecksum: "x",
    registrationStatus: "EXPIRED",
    expiresAt: new Date(Date.now() - 86400000),
    productStatus: "EXPIRED",
    labelVerified: true,
  });
  if (!expired.allowed) ok("expired registration blocked");
  else fail("expired registration blocked");
}

console.log(`\n=== Parser fixtures: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
