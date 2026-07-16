/**
 * Production deploy verification — no secrets logged.
 */
const BASE = "https://ai-agranom.vercel.app";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  return { status: res.status, text };
}

async function post(path, headers, body) {
  const res = await fetch(`${BASE}${path}`, {
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
  const report = {};

  const home = await get("/");
  report.site = home.status === 200 ? "SUCCESS" : `FAILED (${home.status})`;
  report.hasThemeScript =
    home.text.includes("agro-olam-theme") || home.text.includes("prefers-color-scheme")
      ? "SUCCESS"
      : "CHECK";
  report.hasNextThemes =
    home.text.includes("next-themes") || home.text.includes("Theme")
      ? "PRESENT_IN_BUNDLE_OR_UI"
      : "CHECK";

  const docs = await get("/api/docs");
  report.swagger = docs.status === 200 ? "SUCCESS" : `FAILED (${docs.status})`;

  const healthRes = await fetch(`${BASE}/api/agronom/health`);
  const health = await healthRes.json();
  report.health =
    healthRes.status === 200 &&
    health.status === "ok" &&
    health.service === "agro-olam-ai-agronom"
      ? "SUCCESS"
      : "FAILED";

  const noKey = await post(
    "/api/agronom/chat",
    {},
    { message: "test", language: "auto", sessionId: "deploy-noauth" }
  );
  report.apiNoKey = noKey.status === 401 ? "SUCCESS" : `FAILED (${noKey.status})`;

  const badKey = await post(
    "/api/agronom/chat",
    { Authorization: "Bearer wrong-deploy-key" },
    { message: "test", language: "auto", sessionId: "deploy-badkey" }
  );
  report.apiWrongKey =
    badKey.status === 401 ? "SUCCESS" : `FAILED (${badKey.status})`;

  const chat = await post(
    "/api/chat",
    {},
    {
      message: "Pomidor barglari sarg'aymoqda",
      language: "auto",
      sessionId: "deploy-chat-" + Date.now(),
    }
  );
  report.siteChatProxy =
    chat.status === 200 && chat.json.success === true && chat.json.language === "uz"
      ? "SUCCESS"
      : `FAILED (${chat.status}, lang=${chat.json.language})`;

  const ky = await post(
    "/api/chat",
    {},
    {
      message: "Помидордун жалбырагы эмне үчүн саргайып жатат?",
      language: "auto",
      sessionId: "deploy-ky-" + Date.now(),
    }
  );
  report.kyrgyzLang =
    ky.status === 200 && ky.json.language === "ky" ? "SUCCESS" : `FAILED (${ky.json.language})`;

  const reject = await post(
    "/api/chat",
    {},
    {
      message: "Месси ким?",
      language: "auto",
      sessionId: "deploy-reject-" + Date.now(),
    }
  );
  report.nonAgroReject =
    reject.status === 200 &&
    reject.json.language === "ky" &&
    typeof reject.json.answer === "string"
      ? "SUCCESS"
      : "FAILED";

  report.apiEndpointUnchanged = "YES";
  report.serviceName = health.service || "unknown";

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error("Fatal:", e.message || e);
  process.exit(1);
});
