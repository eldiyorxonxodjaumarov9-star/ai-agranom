#!/usr/bin/env npx tsx
/**
 * Import KZ PPP rows from CSV/JSON (admin / CLI).
 *
 *   npm run kb:import-kz-ppp -- --file ./data/kz-ppp.csv
 *   npm run kb:import-kz-ppp -- --file ./data/kz-ppp.json
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  importKzPppRows,
  parseKzPppCsv,
  parseKzPppJson,
} from "../server/kb/products/kz-ppp-import";
import { getPrisma } from "../server/kb/db/client";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function main() {
  const file = arg("--file");
  if (!file) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "Provide --file path to official CSV/JSON export",
        hint: "No Google scraping. Use official registry export or admin upload.",
      })
    );
    process.exit(1);
  }
  const abs = resolve(file);
  const raw = readFileSync(abs, "utf8");
  const rows = abs.toLowerCase().endsWith(".json")
    ? parseKzPppJson(raw)
    : parseKzPppCsv(raw);
  const report = await importKzPppRows(rows, {
    filename: abs,
    kind: "admin_upload",
  });
  console.log(JSON.stringify({ ok: true, ...report }, null, 2));
  await getPrisma()?.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
