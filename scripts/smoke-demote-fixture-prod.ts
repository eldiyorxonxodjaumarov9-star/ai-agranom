/**
 * Emergency: demote fixture PPP rows that were wrongly VERIFIED in production.
 * Uses incomplete fields so legacy verify gate → NEEDS_REVIEW / UNKNOWN / labelVerified=false.
 * No hard delete. Does not log secrets.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const DEMOTE_CSV = `productName,registrationNumber,manufacturer,activeIngredient,concentration,formulation,approvedCrops,approvedTargets,registrationStatus,expiresAt,labelUrl
Ridomil Gold MZ 68 WG,UZ-PPP-2024-001,Syngenta,Metalaxyl-M + Mancozeb,40+640 g/kg,WG,,,UNKNOWN,,
Topaz 100 EC,UZ-PPP-2024-002,Syngenta,Penconazole,100 g/l,EC,,,UNKNOWN,,
Aktara 25 WG,UZ-PPP-2023-015,Syngenta,Thiamethoxam,250 g/kg,WG,,,UNKNOWN,,
Expired Demo SC,UZ-PPP-2018-099,DemoChem,DemoActive,200 g/l,SC,,,EXPIRED,2020-01-01,
`;

async function main() {
  const key = process.env.AGRO_API_KEY?.trim();
  if (!key) {
    console.log(JSON.stringify({ ok: false, error: "AGRO_API_KEY missing" }));
    process.exit(1);
  }
  const base =
    process.env.AGRO_SMOKE_BASE_URL?.replace(/\/$/, "") ||
    "https://ai-agranom.vercel.app";

  const importRes = await fetch(`${base}/api/admin/kb/products/import`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: "fixture-demote-incomplete.csv",
      format: "csv",
      content: DEMOTE_CSV,
    }),
  });
  const importJson = (await importRes.json()) as Record<string, unknown>;
  const report = (importJson.report || {}) as Record<string, unknown>;

  const dashRes = await fetch(`${base}/api/admin/kb/actions`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const dashJson = (await dashRes.json()) as {
    dashboard?: { products?: Record<string, number> };
  };

  console.log(
    JSON.stringify(
      {
        ok: importRes.ok && importJson.success === true,
        importStatus: importRes.status,
        demoteCounts: {
          parsed: report.parsed,
          verified: report.verified,
          needsReview: report.needsReview,
          incomplete: report.incomplete,
          expired: report.expired,
          failed: report.failed,
        },
        productionProducts: dashJson.dashboard?.products ?? null,
        note: "Fixture labels were example.gov.uz — not official UZ registry. Demoted via incomplete checklist (no hard delete).",
      },
      null,
      2
    )
  );
  process.exit(importRes.ok && importJson.success === true ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
