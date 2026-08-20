/**
 * Preview smoke: auth + leakage checks (no secrets logged).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const key = process.env.AGRO_API_KEY?.trim();
  const base = (
    process.env.AGRO_SMOKE_BASE_URL ||
    "https://ai-agranom-peytyo94c-eldiyorxonxodjaumarov9-5892s-projects.vercel.app"
  ).replace(/\/$/, "");

  if (!key) {
    console.log(JSON.stringify({ ok: false, error: "no_key" }));
    process.exit(1);
  }

  const missing = await fetch(`${base}/api/agronom/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ message: "x", language: "uz" }),
  });

  const bad = await fetch(`${base}/api/agronom/chat`, {
    method: "POST",
    headers: {
      Authorization: "Bearer wrong-key-not-real",
      "Content-Type": "application/json",
      Origin: base,
    },
    body: JSON.stringify({ message: "x", language: "uz" }),
  });

  const chat = await fetch(`${base}/api/agronom/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Origin: base,
    },
    body: JSON.stringify({
      message: "Pomidor bargida oq dog' — nima bo'lishi mumkin?",
      language: "uz",
    }),
  });
  const chatBody = await chat.text();
  const leakage =
    /agro_meta/i.test(chatBody) ||
    /manbalar:/i.test(chatBody) ||
    /https?:\/\//i.test(chatBody);

  const visionMissing = await fetch(`${base}/api/agronom/vision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ images: [] }),
  });

  const visionBad = await fetch(`${base}/api/agronom/vision`, {
    method: "POST",
    headers: {
      Authorization: "Bearer wrong-key-not-real",
      "Content-Type": "application/json",
      Origin: base,
    },
    body: JSON.stringify({ images: ["data:image/png;base64,AAAA"] }),
  });

  console.log(
    JSON.stringify(
      {
        base,
        chat: {
          missingAuth: missing.status,
          badAuth: bad.status,
          valid: chat.status,
          leakage,
          answerLen: chatBody.length,
        },
        vision: {
          missingAuth: visionMissing.status,
          badAuth: visionBad.status,
        },
        ok:
          missing.status === 401 &&
          bad.status === 401 &&
          chat.status === 200 &&
          !leakage &&
          visionMissing.status === 401 &&
          visionBad.status === 401,
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
