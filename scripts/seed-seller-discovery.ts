/**
 * Seed seller discovery candidates as PENDING_REVIEW (no crawl enable).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const DOMAINS = [
  "gozaltabiat.uz",
  "anguzalagro.uz",
  "bizkim.uz",
  "namunagroup.com",
  "pengsheng.uz",
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

  const res = await fetch(`${base}/api/admin/kb/discovery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "add_candidates",
      domains: DOMAINS,
      discoveredBy: "admin_manual_list",
    }),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { rawLen: text.length };
  }
  console.log(
    JSON.stringify(
      {
        ok: res.ok && json.success === true,
        status: res.status,
        upserted: json.upserted,
        errors: json.errors,
        crawlEnabled: json.crawlEnabled,
        note: json.note || json.error,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
