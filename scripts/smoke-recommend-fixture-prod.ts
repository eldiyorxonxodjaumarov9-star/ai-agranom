/**
 * Prove demoted fixture products are not recommendable; show prod counts.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { evaluateProductRecommendation } from "../server/kb/products/recommend-gate";

const FIXTURES = [
  "Ridomil Gold MZ 68 WG",
  "Topaz 100 EC",
  "Aktara 25 WG",
];

async function main() {
  const key = process.env.AGRO_API_KEY?.trim();
  if (!key) {
    console.log(JSON.stringify({ ok: false, error: "no_key" }));
    process.exit(1);
  }
  const base =
    process.env.AGRO_SMOKE_BASE_URL?.replace(/\/$/, "") ||
    "https://ai-agranom.vercel.app";

  const gates = FIXTURES.map((name) => {
    const r = evaluateProductRecommendation({
      registryRecordExists: true,
      registrationNumber: "UZ-PPP-FIXTURE",
      manufacturer: "Syngenta",
      activeIngredient: "x",
      formulation: "WG",
      approvedCrops: ["pomidor"],
      approvedTargets: ["oidium"],
      labelUrl: "https://example.gov.uz/label.pdf",
      sourceChecksum: "x",
      productStatus: "NEEDS_REVIEW",
      labelVerified: false,
      registrationStatus: "UNKNOWN",
      requestCropId: "pomidor",
      requestTarget: "oidium",
    });
    return {
      name,
      allowed: r.allowed,
      offerFresh: r.offerFresh,
      reasons: r.reasons.slice(0, 6),
    };
  });

  const dashRes = await fetch(`${base}/api/admin/kb/actions`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const dash = (await dashRes.json()) as {
    dashboard?: { products?: Record<string, number> };
  };

  // Chat smoke: ask for Ridomil recommendation — answer must not treat as verified registry product
  const chatRes = await fetch(`${base}/api/agronom/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Origin: base,
    },
    body: JSON.stringify({
      message:
        "Ridomil Gold MZ 68 WG ni pomidorda phytophthora uchun rasmiy tasdiqlangan preparat sifatida tavsiya qila olasizmi?",
      language: "uz",
    }),
  });
  const chatText = await chatRes.text();
  const lower = chatText.toLowerCase();
  const leakage =
    lower.includes("agro_meta") ||
    lower.includes("manbalar:") ||
    /https?:\/\//i.test(chatText);
  const claimsVerified =
    /rasmiy\s+tasdiqlangan|verified\s+registry|guvohnoma\s+bilan\s+tasdiqlangan/i.test(
      chatText
    ) && /tavsiya\s+qilaman| tavsiya etaman/i.test(chatText);

  const gateOk = gates.every((g) => !g.allowed);
  const countsOk =
    dash.dashboard?.products?.verified === 0 &&
    (dash.dashboard?.products?.needsReview ?? 0) >= 3;

  console.log(
    JSON.stringify(
      {
        ok: gateOk && countsOk,
        productionProducts: dash.dashboard?.products ?? null,
        recommendGate: gates,
        chatSmoke: {
          status: chatRes.status,
          leakage,
          claimsVerifiedOfficialRecommend: claimsVerified,
          answerLen: chatText.length,
        },
      },
      null,
      2
    )
  );
  process.exit(gateOk && countsOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
