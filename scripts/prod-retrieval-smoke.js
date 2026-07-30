#!/usr/bin/env node
/**
 * Production retrieval smoke via protected cron endpoint.
 * Uses CRON_SECRET from env / .cron-secret.local — never logs secret values.
 *
 *   node scripts/prod-retrieval-smoke.js
 */
const { readFileSync, existsSync } = require("fs");
const { createHash } = require("crypto");
const path = require("path");

const BASE = process.env.PROD_BASE_URL || "https://ai-agranom.vercel.app";

function loadSecret() {
  if (process.env.CRON_SECRET?.trim()) return process.env.CRON_SECRET.trim();
  const p = path.join(process.cwd(), ".cron-secret.local");
  if (existsSync(p)) return readFileSync(p, "utf8").trim();
  return "";
}

async function main() {
  const secret = loadSecret();
  if (!secret) {
    console.log(JSON.stringify({ ok: false, error: "CRON_SECRET_REQUIRED" }, null, 2));
    process.exit(2);
  }

  const res = await fetch(`${BASE}/api/cron/kb-retrieval-smoke`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  const report = {
    ok: res.status === 200 && body.semanticRetrievalPassed === true,
    httpStatus: res.status,
    cronSecretFp: createHash("sha256").update(secret).digest("hex").slice(0, 12),
    embeddings: body.embeddings,
    semanticRetrievalPassed: body.semanticRetrievalPassed,
    allPassed: body.allPassed,
    cases: body.cases,
    health: body.health,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 2);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message || String(e) }));
  process.exit(1);
});
