require("dotenv").config({ path: ".env.local" });

const key = process.env.AGRO_API_KEY;
const base = process.argv[2] || "http://localhost:3000";

async function hit(name, path, opts = {}) {
  const res = await fetch(`${base}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  const summary = JSON.stringify(json).slice(0, 200);
  console.log(`${name}: ${res.status} ${summary}`);
  return { status: res.status, json };
}

(async () => {
  await hit("health", "/api/agronom/health");
  await hit("agro", "/api/agronom/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      message: "Pomidor barglari sarg'aymoqda",
      language: "auto",
      sessionId: "prod-check-1",
    }),
  });
  await hit("nongro", "/api/agronom/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ message: "Messi kim?", language: "uz" }),
  });
  await hit("badkey", "/api/agronom/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer wrong",
    },
    body: JSON.stringify({ message: "test" }),
  });
  await hit("nokey", "/api/agronom/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "test" }),
  });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
