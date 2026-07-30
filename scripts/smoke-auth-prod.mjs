/**
 * Production auth smoke — never prints secret values.
 * Run via: npx vercel env run --environment production -- node scripts/smoke-auth-prod.mjs
 */
import https from "https";

const HOST = "ai-agranom.vercel.app";
const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function post(path, headers, body) {
  const data = JSON.stringify(body);
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: HOST,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          ...headers,
        },
      },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => resolve({ status: res.statusCode, body: b }));
      }
    );
    req.on("error", (e) => resolve({ status: 0, body: e.message }));
    req.write(data);
    req.end();
  });
}

function parse(body) {
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

const key = (process.env.AGRO_API_KEY || "").trim().replace(/^["']|["']$/g, "");
const envStatus =
  key && key !== "super_secret_api_key_here" ? "detected" : "missing";
console.log(`AGRO_API_KEY ${envStatus}`);

if (envStatus === "missing") {
  console.log("ABORT: cannot run valid-auth smoke without key");
  process.exit(1);
}

const visionBody = {
  images: [{ url: `data:image/png;base64,${PNG}` }],
  message: "Pomidor bargida nima muammo bor?",
  language: "uz",
  sessionId: "auth-smoke-vision",
};
const chatBody = {
  message: "Pomidor barglari sargaymoqda",
  language: "uz",
  sessionId: "auth-smoke-chat",
};

const visionValid = await post(
  "/api/agronom/vision",
  { Authorization: `Bearer ${key}` },
  visionBody
);
const vv = parse(visionValid.body);
console.log(
  `vision_valid=${visionValid.status} success=${vv.success === true}`
);

const chatValid = await post(
  "/api/agronom/chat",
  { Authorization: `Bearer ${key}`, "Sec-Fetch-Site": "none" },
  chatBody
);
const cv = parse(chatValid.body);
console.log(
  `chat_valid=${chatValid.status} success=${cv.success === true} hasAnswer=${Boolean(cv.answer)}`
);

const visionBad = await post(
  "/api/agronom/vision",
  { Authorization: "Bearer wrong-key" },
  visionBody
);
console.log(`vision_invalid=${visionBad.status}`);

const chatBad = await post(
  "/api/agronom/chat",
  { Authorization: "Bearer wrong-key", "Sec-Fetch-Site": "none" },
  chatBody
);
console.log(`chat_invalid=${chatBad.status}`);

const visionMissing = await post("/api/agronom/vision", {}, visionBody);
console.log(`vision_missing=${visionMissing.status}`);

const chatMissing = await post(
  "/api/agronom/chat",
  { "Sec-Fetch-Site": "none" },
  chatBody
);
console.log(`chat_missing=${chatMissing.status}`);

const ok =
  visionValid.status === 200 &&
  vv.success === true &&
  chatValid.status === 200 &&
  cv.success === true &&
  visionBad.status === 401 &&
  chatBad.status === 401 &&
  visionMissing.status === 401 &&
  chatMissing.status === 401;

console.log(ok ? "SMOKE_PASS" : "SMOKE_FAIL");
process.exit(ok ? 0 : 1);
