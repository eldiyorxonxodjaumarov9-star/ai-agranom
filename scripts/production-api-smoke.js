/**
 * Production API smoke test — secrets from env only, never logged.
 * Run: AGRO_API_KEY=... node scripts/production-api-smoke.js
 */
const BASE = process.env.API_BASE_URL || "https://ai-agranom.vercel.app";
const CHAT = `${BASE}/api/agronom/chat`;
const HEALTH = `${BASE}/api/agronom/health`;
const KEY = process.env.AGRO_API_KEY || "";

let passed = 0;
let failed = 0;

function ok(name) {
  console.log(`PASS: ${name}`);
  passed++;
}

function fail(name, detail) {
  console.error(`FAIL: ${name} — ${detail}`);
  failed++;
}

async function postChat(headers, body) {
  const res = await fetch(CHAT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, json };
}

async function main() {
  // Health
  try {
    const h = await fetch(HEALTH);
    const j = await h.json();
    if (h.status === 200 && j.status === "ok" && j.service === "agro-olam-ai-agronom") {
      ok("health endpoint");
    } else {
      fail("health endpoint", `status=${h.status}`);
    }
  } catch (e) {
    fail("health endpoint", String(e.message || e));
  }

  // No auth
  const noAuth = await postChat(
    {},
    { message: "test", language: "auto", sessionId: "smoke-noauth" }
  );
  if (noAuth.status === 401 && noAuth.json.success === false) {
    ok("no API key → 401");
  } else {
    fail("no API key", `status=${noAuth.status}`);
  }

  // Wrong key
  const badKey = await postChat(
    { Authorization: "Bearer invalid-smoke-key" },
    { message: "test", language: "auto", sessionId: "smoke-badkey" }
  );
  if (badKey.status === 401 && badKey.json.success === false) {
    ok("wrong API key → 401");
  } else {
    fail("wrong API key", `status=${badKey.status}`);
  }

  // Valid bearer (requires production AGRO_API_KEY in CI secrets)
  if (!KEY || KEY === "super_secret_api_key_here") {
    console.warn("SKIP: valid Bearer test (AGRO_API_KEY not configured)");
  } else {
    const agro = await postChat(
      { Authorization: `Bearer ${KEY}` },
      {
        message: "Почему желтеют листья томата?",
        language: "auto",
        sessionId: "smoke-agro-" + Date.now(),
      }
    );
    const j = agro.json;
    if (
      agro.status === 200 &&
      j.success === true &&
      typeof j.answer === "string" &&
      j.answer.length > 0 &&
      j.service === "agro-olam-ai-agronom"
    ) {
      ok("valid Bearer agro → 200 success");
    } else {
      fail("valid Bearer", `status=${agro.status} success=${j.success}`);
    }

    const ky = await postChat(
      { Authorization: `Bearer ${KEY}` },
      {
        message: "Помидордун жалбырагы эмне үчүн саргайып жатат?",
        language: "auto",
        sessionId: "smoke-ky-" + Date.now(),
      }
    );
    if (ky.status === 200 && ky.json.success && ky.json.language === "ky") {
      ok("Kyrgyz agro → language ky");
    } else {
      fail("Kyrgyz agro", `lang=${ky.json.language}`);
    }

    const kyReject = await postChat(
      { Authorization: `Bearer ${KEY}` },
      {
        message: "Месси ким?",
        language: "auto",
        sessionId: "smoke-ky-reject-" + Date.now(),
      }
    );
    if (
      kyReject.status === 200 &&
      kyReject.json.success &&
      kyReject.json.language === "ky"
    ) {
      ok("Kyrgyz non-agro → language ky");
    } else {
      fail("Kyrgyz non-agro", `lang=${kyReject.json.language}`);
    }
  }

  console.log(`\n=== Smoke: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e.message || e);
  process.exit(1);
});
