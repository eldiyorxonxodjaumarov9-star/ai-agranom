/**
 * OpenAI strict schema recursive compliance.
 * Run: npx tsx scripts/test-strict-schemas.ts
 */
import { AGRONOM_RESPONSE_JSON_SCHEMA } from "../server/schemas/agronom-response";
import {
  VISUAL_FEATURES_JSON_SCHEMA,
  VISION_DIFFERENTIAL_JSON_SCHEMA,
} from "../server/schemas/vision-diagnosis";
import { assertStrictSchemaCompliance } from "../server/schemas/strict-json-schema";
import { sanitizeDisplayText } from "../lib/agronom/display-sanitize";
import {
  applyProductGateToAnswer,
  stripUngatedProductClaims,
} from "../server/kb/products/gate-products";

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
  for (const [name, schema] of [
    ["AGRONOM", AGRONOM_RESPONSE_JSON_SCHEMA.schema],
    ["VISUAL_FEATURES", VISUAL_FEATURES_JSON_SCHEMA.schema],
    ["VISION_DIFFERENTIAL", VISION_DIFFERENTIAL_JSON_SCHEMA.schema],
  ] as const) {
    const errors = assertStrictSchemaCompliance(schema);
    if (errors.length === 0) ok(`${name} strict schema compliance`);
    else fail(`${name} strict schema`, errors.slice(0, 5).join("; "));
  }

  {
    const dirty =
      "Tavsiya: Ridomil.\n---AGRO_META---\n{}\nManbalar:\nhttps://evil.test\n```json\n{}\n```";
    const clean = sanitizeDisplayText(dirty);
    if (
      !/agro_meta/i.test(clean) &&
      !/manbalar:/i.test(clean) &&
      !/https?:\/\//i.test(clean) &&
      !/```/.test(clean)
    )
      ok("SSE/final leakage sanitize");
    else fail("SSE/final leakage sanitize", clean.slice(0, 120));
  }

  {
    const stripped = stripUngatedProductClaims(
      "Doza: 2 ml/l\nRasmiy tasdiqlangan preparat: Topaz\nUmumiy maslahat: barglarni kuzating."
    );
    if (!/doza\s*:/i.test(stripped) && !/rasmiy\s+tasdiqlangan/i.test(stripped))
      ok("ungated product claims stripped");
    else fail("ungated claims", stripped);
  }

  {
    const r = await applyProductGateToAnswer({
      displayText: "Barglarni kuzating. Topaz tavsiya etiladi.",
      candidateIds: ["nonexistent-id"],
      language: "uz",
    });
    if (
      r.products.length === 0 &&
      !/Ro‘yxatdan o‘tgan preparatlar/i.test(r.displayText)
    )
      ok("zero verified → no products field/section");
    else fail("zero verified gate", JSON.stringify(r));
  }

  console.log(`\n=== Strict schemas: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
