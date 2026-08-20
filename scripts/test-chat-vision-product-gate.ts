/**
 * Chat/vision product-gate integration (DB-mocked via absent/unknown IDs).
 * Run: npx tsx scripts/test-chat-vision-product-gate.ts
 */
import { applyProductGateToAnswer } from "../server/kb/products/gate-products";
import { sanitizeDisplayText } from "../lib/agronom/display-sanitize";

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
  {
    const gated = await applyProductGateToAnswer({
      displayText:
        "Pomidorda oidium ehtimoli bor.\nTavsiya etiladigan preparat: Topaz\nDoza: 2 ml/l\nRasmiy tasdiqlangan.\nhttps://evil.test\n---AGRO_META---\n{}",
      candidateIds: ["fake-prod-1", "fake-prod-2"],
      language: "uz",
      requestCropId: "pomidor",
      requestTarget: "oidium",
    });
    const answer = sanitizeDisplayText(gated.displayText);
    if (
      gated.products.length === 0 &&
      !/Ro‘yxatdan o‘tgan preparatlar/i.test(answer) &&
      !/doza\s*:/i.test(answer) &&
      !/rasmiy\s+tasdiqlangan/i.test(answer) &&
      !/https?:\/\//i.test(answer) &&
      !/agro_meta/i.test(answer)
    )
      ok("chat path: verifiedProducts=0 → no products / no claims / no leak");
    else fail("chat path zero verified", answer.slice(0, 200));
  }

  {
    // Vision recommendation uses the same gate helper
    const gated = await applyProductGateToAnswer({
      displayText:
        "Ehtimoliy muammo: zamburug‘.\nPreparat: Ridomil Gold\nPHI: 14 kun",
      candidateIds: [],
      language: "uz",
    });
    if (
      gated.products.length === 0 &&
      !/\bPHI\b/i.test(gated.displayText) &&
      !/Ro‘yxatdan o‘tgan preparatlar/i.test(gated.displayText)
    )
      ok("vision path: empty candidates → no product section");
    else fail("vision empty candidates", gated.displayText.slice(0, 200));
  }

  {
    // Contract: products omitted when empty (caller responsibility)
    const gated = await applyProductGateToAnswer({
      displayText: "Barglarni kuzating.",
      candidateIds: ["x"],
      language: "uz",
    });
    const payload: Record<string, unknown> = {
      success: true,
      answer: gated.displayText,
    };
    if (gated.products.length > 0) {
      payload.products = gated.products.map((p) => p.id);
    }
    if (!("products" in payload))
      ok("API contract: products field omitted when empty");
    else fail("products omitted", JSON.stringify(payload));
  }

  console.log(
    `\n=== Chat/vision product gate: ${passed} passed, ${failed} failed ===\n`
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
