/**
 * Smoke: POST official UZ fixture to production admin import (no secret logging).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { resolve } from "path";

async function main() {
  const key = process.env.AGRO_API_KEY?.trim();
  if (!key) {
    console.log(JSON.stringify({ ok: false, error: "AGRO_API_KEY missing" }));
    process.exit(1);
  }
  const csv = readFileSync(
    resolve("scripts/fixtures/uz-ppp-registry-sample.csv"),
    "utf8"
  );
  const base =
    process.env.AGRO_SMOKE_BASE_URL?.replace(/\/$/, "") ||
    "https://ai-agranom.vercel.app";

  const res = await fetch(`${base}/api/admin/kb/products/import`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: "uz-ppp-registry-sample.csv",
      format: "csv",
      country: "UZ",
      content: csv,
    }),
  });

  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.log(
      JSON.stringify({
        ok: false,
        status: res.status,
        error: "non_json",
        bodyLen: text.length,
      })
    );
    process.exit(1);
  }

  const report = (json.report || {}) as Record<string, unknown>;
  console.log(
    JSON.stringify(
      {
        ok: res.ok && json.success === true,
        status: res.status,
        counts: {
          parsed: report.parsed,
          imported: report.imported,
          updated: report.updated,
          skipped: report.skipped,
          failed: report.failed,
          verified: report.verified,
          expired: report.expired,
        },
        sampleProductIds: report.sampleProductIds,
        error: json.error,
        note: json.note,
      },
      null,
      2
    )
  );
  process.exit(res.ok && json.success === true ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
