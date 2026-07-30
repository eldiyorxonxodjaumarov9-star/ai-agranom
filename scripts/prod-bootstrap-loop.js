#!/usr/bin/env node
/**
 * Production cron auth + bootstrap loop using env-injected CRON_SECRET.
 * Never prints secret values — only fingerprints and counts.
 */
const { createHash } = require("crypto");

const BASE = process.env.PROD_BASE_URL || "https://ai-agranom.vercel.app";

function fp(s) {
  return createHash("sha256")
    .update(s || "none")
    .digest("hex")
    .slice(0, 12);
}

async function health() {
  const res = await fetch(`${BASE}/api/agronom/health`);
  const text = await res.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

async function callBootstrap(authHeader) {
  const url = `${BASE}/api/cron/kb-bootstrap?maxMs=45000`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeader ? { Authorization: authHeader } : {},
  });
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return { status: res.status, body };
}

async function main() {
  const secret = (process.env.CRON_SECRET || "").trim();
  const report = {
    cronSecretPresent: Boolean(secret),
    cronSecretFp: secret ? fp(secret) : null,
    auth: {},
    bootstrapCalls: 0,
    finalHealth: null,
    gap: null,
    ok: false,
  };

  if (!secret) {
    report.error = "CRON_SECRET_REQUIRED";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const missing = await callBootstrap(null);
  report.auth.missing = { status: missing.status, expect: 401, pass: missing.status === 401 };

  const invalid = await callBootstrap("Bearer invalid-cron-secret-value");
  report.auth.invalid = {
    status: invalid.status,
    expect: 401,
    pass: invalid.status === 401,
  };

  // Valid: 200 means auth+batch OK; 504 means auth OK but previous long batch timed out
  const valid = await callBootstrap(`Bearer ${secret}`);
  const validAuthOk = valid.status === 200 || valid.status === 504;
  report.auth.valid = {
    status: valid.status,
    expect: "200 (auth ok; 504=timeout before short-batch deploy)",
    pass: validAuthOk,
    success: Boolean(valid.body?.success),
    done: valid.body?.report?.done,
  };
  report.bootstrapCalls += 1;

  if (!report.auth.missing.pass || !report.auth.invalid.pass || !validAuthOk) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const maxRounds = Number(process.env.KB_BOOTSTRAP_MAX_ROUNDS || 80);
  for (let i = 0; i < maxRounds; i++) {
    const h = await health();
    const m = h.body?.migration || {};
    const counts = h.body?.recordCounts || {};
    const gapChunks = m.gapChunks ?? Math.max(0, 10870 - (counts.chunks || 0));
    const gapDiseases = m.gapDiseases ?? Math.max(0, 300 - (counts.diseases || 0));
    const gapPests = m.gapPests ?? Math.max(0, 158 - (counts.pests || 0));
    const gap = gapChunks + gapDiseases + gapPests;
    report.gap = {
      chunks: gapChunks,
      diseases: gapDiseases,
      pests: gapPests,
      total: gap,
      counts,
    };
    console.error(
      `[bootstrap] round=${i} gap=${gap} chunks=${counts.chunks} dis=${counts.diseases} pest=${counts.pests}`
    );

    if (
      gap === 0 &&
      (counts.chunks || 0) >= 10080 &&
      (counts.diseases || 0) >= 279 &&
      (counts.pests || 0) >= 142
    ) {
      report.finalHealth = {
        recordCounts: counts,
        embeddings: h.body.embeddings,
        migration: h.body.migration,
        cronSecretRequired: h.body.cronSecretRequired,
        cronSecretConfigured: h.body.cronSecretConfigured,
      };
      report.ok = true;
      break;
    }

    const r = await callBootstrap(`Bearer ${secret}`);
    report.bootstrapCalls += 1;
    if (r.status === 401) {
      report.error = "unauthorized_mid_loop";
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }
    // 200 or 504: keep going (504 = platform cut; next call resumes)
    if (r.status !== 200 && r.status !== 504) {
      report.error = `bootstrap_http_${r.status}`;
      report.lastBody = {
        success: r.body?.success,
        error: r.body?.error,
        done: r.body?.report?.done,
      };
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }

    await new Promise((res) => setTimeout(res, 800));
  }

  if (!report.ok) {
    const h = await health();
    report.finalHealth = {
      recordCounts: h.body?.recordCounts,
      embeddings: h.body?.embeddings,
      migration: h.body?.migration,
      cronSecretConfigured: h.body?.cronSecretConfigured,
    };
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 2);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message || String(e) }));
  process.exit(1);
});
