#!/usr/bin/env node
/**
 * Production embedding loop via CRON_SECRET.
 * Never prints secret values.
 *
 *   $env:CRON_SECRET=...; node scripts/prod-embed-loop.js
 */
const { createHash } = require("crypto");

const BASE = process.env.PROD_BASE_URL || "https://ai-agranom.vercel.app";

function fp(s) {
  return createHash("sha256")
    .update(s || "none")
    .digest("hex")
    .slice(0, 12);
}

async function call(path, authHeader) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authHeader ? { Authorization: authHeader } : {},
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 400) };
  }
  return { status: res.status, body };
}

async function main() {
  const secret = (process.env.CRON_SECRET || "").trim();
  const report = {
    cronSecretPresent: Boolean(secret),
    cronSecretFp: secret ? fp(secret) : null,
    embedCalls: 0,
    ok: false,
    final: null,
    smoke: null,
  };

  if (!secret) {
    report.error = "CRON_SECRET_REQUIRED";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const maxRounds = Number(process.env.KB_EMBED_MAX_ROUNDS || 500);
  for (let i = 0; i < maxRounds; i++) {
    const r = await call("/api/cron/kb-embed?maxMs=45000&batch=24", `Bearer ${secret}`);
    report.embedCalls += 1;
    if (r.status === 401) {
      report.error = "unauthorized";
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }
    if (r.status !== 200 && r.status !== 504) {
      report.error = `http_${r.status}`;
      report.last = { success: r.body?.success, error: r.body?.error };
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }

    const emb =
      r.body?.report?.embeddings ||
      r.body?.embeddings ||
      {};
    const pending = emb.pending ?? -1;
    const embedded = emb.embedded ?? 0;
    const failed = emb.failed ?? 0;
    const cov = emb.coveragePercent ?? 0;
    console.error(
      `[embed] round=${i} status=${r.status} processed=${r.body?.report?.processedThisRun ?? "?"} embedded=${embedded} pending=${pending} failed=${failed} cov=${cov}% rateLimited=${r.body?.report?.rateLimited}`
    );

    if (r.body?.report?.done || (pending === 0 && failed === 0 && embedded > 0)) {
      report.final = emb;
      report.ok = pending === 0 && failed === 0 && (emb.vectorIndexReady || embedded > 0);
      break;
    }

    if (r.body?.report?.rateLimited) {
      await new Promise((res) => setTimeout(res, 45000));
    } else {
      await new Promise((res) => setTimeout(res, 800));
    }
  }

  if (report.ok) {
    const smoke = await call("/api/cron/kb-embed?smoke=1", `Bearer ${secret}`);
    report.smoke = {
      status: smoke.status,
      vectorLikelyCount: smoke.body?.vectorLikelyCount,
      cases: smoke.body?.cases,
      embeddings: smoke.body?.embeddings,
    };
    report.ok =
      report.ok &&
      smoke.status === 200 &&
      (smoke.body?.vectorLikelyCount || 0) >= 3;
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 2);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message || String(e) }));
  process.exit(1);
});
