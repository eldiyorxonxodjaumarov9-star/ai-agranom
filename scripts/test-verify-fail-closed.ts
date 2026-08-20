/**
 * Fail-closed product verification negatives.
 * Run: npx tsx scripts/test-verify-fail-closed.ts
 */
import { verifyProductRecord } from "../server/kb/products/verify";
import { parseOfficialLabelUrl } from "../server/kb/products/official-hosts";
import { parseOfficialPppXlsxBuffer } from "../server/kb/products/official-ppp-import";

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
const base = {
  registryRecordExists: true,
  registrationNumber: "UZ-1",
  registrationCountry: "UZ",
  manufacturer: "Syngenta",
  activeIngredient: "Penconazole",
  formulation: "EC",
  concentration: "100 g/l",
  approvedCrops: ["uzum"],
  approvedTargets: ["oidium"],
  labelUrl: "https://akk.karantin.uz/media/labels/real.pdf",
  expiresAt: "2028-06-01",
  sourceChecksum: "abc123",
  sourceDocumentId: "doc-1",
  sourceDocumentSha256: "deadbeef".repeat(8),
  sourceDocumentCountry: "UZ",
  trustedOfficialSource: true,
  officialHostTrusted: true,
  adminApproved: true,
  verifiedBy: "actor-hash",
  verifiedAt: new Date(),
  registrationStatus: "ACTIVE" as const,
};

{
  const r = verifyProductRecord({
    ...base,
    labelUrl: "https://cdn.example.com/label.pdf",
    officialHostTrusted: false,
  });
  if (r.status !== "VERIFIED" && !r.labelVerified)
    ok("arbitrary HTTPS label → not VERIFIED");
  else fail("arbitrary HTTPS", JSON.stringify(r));
}

{
  const r = verifyProductRecord({
    ...base,
    sourceDocumentId: "",
    trustedOfficialSource: false,
  });
  if (r.status !== "VERIFIED") ok("unknown/missing sourceDocumentId → not VERIFIED");
  else fail("unknown sourceDocumentId");
}

{
  const r = verifyProductRecord({ ...base, manufacturer: "" });
  if (r.status !== "VERIFIED") ok("empty manufacturer → not VERIFIED");
  else fail("empty manufacturer");
}

{
  const r = verifyProductRecord({ ...base, activeIngredient: "  " });
  if (r.status !== "VERIFIED") ok("empty active ingredient → not VERIFIED");
  else fail("empty AI");
}

{
  const r = verifyProductRecord({ ...base, formulation: null });
  if (r.status !== "VERIFIED") ok("empty formulation → not VERIFIED");
  else fail("empty formulation");
}

{
  const r = verifyProductRecord({ ...base, expiresAt: "not-a-date" });
  if (r.status !== "VERIFIED") ok("invalid expiry → not VERIFIED");
  else fail("invalid expiry");
}

{
  const r = verifyProductRecord({
    ...base,
    expiresAt: new Date(Date.now() - 86400000).toISOString(),
  });
  if (r.status === "EXPIRED") ok("expired date → EXPIRED");
  else fail("expired date", JSON.stringify(r));
}

{
  const r = verifyProductRecord({
    ...base,
    filename: "uz-ppp-registry-sample.csv",
  });
  if (r.status !== "VERIFIED") ok("fixture filename → not VERIFIED");
  else fail("fixture filename");
}

{
  // Client cannot spoof actor via verifiedBy alone without adminApproved from server
  const r = verifyProductRecord({
    ...base,
    adminApproved: false,
    verifiedBy: "super-admin",
  });
  if (r.status !== "VERIFIED" && r.reasons.some((x) => /admin attestation/i.test(x)))
    ok("request verifiedBy without server adminApproved ignored");
  else fail("verifiedBy spoof", JSON.stringify(r));
}

{
  const full = verifyProductRecord(base);
  if (full.status === "VERIFIED" && full.labelVerified && full.canRecommend)
    ok("full persisted attestation → VERIFIED");
  else fail("full attestation", JSON.stringify(full));
}

{
  if (!parseOfficialLabelUrl("https://evil.example.com/x.pdf").ok)
    ok("example host blocked");
  else fail("example host blocked");
}

{
  try {
    await parseOfficialPppXlsxBuffer(Buffer.from("PK"), "UZ");
    fail("xlsx disabled throws");
  } catch (e) {
    if (e instanceof Error && /XLSX_DISABLED/i.test(e.message))
      ok("xlsx import disabled");
    else fail("xlsx disabled message", String(e));
  }
}

console.log(`\n=== Verify fail-closed: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
