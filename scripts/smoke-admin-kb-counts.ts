/**
 * Fetch admin KB counts after import (no secrets logged).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const key = process.env.AGRO_API_KEY?.trim();
  if (!key) {
    console.log(JSON.stringify({ ok: false, error: "no_key" }));
    process.exit(1);
  }
  const base =
    process.env.AGRO_SMOKE_BASE_URL?.replace(/\/$/, "") ||
    "https://ai-agranom.vercel.app";
  const res = await fetch(`${base}/api/admin/kb`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = (await res.json()) as Record<string, unknown>;
  const counts = json.counts || json.recordCounts || json.stats || null;
  // Prefer nested shapes without dumping full payload
  const safe = {
    ok: res.ok,
    status: res.status,
    keys: Object.keys(json).slice(0, 20),
    counts,
    products: json.products ?? null,
    database: json.database ?? json.db ?? null,
  };
  console.log(JSON.stringify(safe, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
