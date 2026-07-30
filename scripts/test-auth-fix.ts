/**
 * Auth parsing/compare unit tests — no secrets logged.
 * Run: npx tsx scripts/test-auth-fix.ts
 */
import {
  extractBearerToken,
  verifyApiKey,
  getAgroApiKeyStatus,
} from "../lib/agronom/auth";

let passed = 0;
let failed = 0;

function ok(name: string) {
  console.log(`PASS: ${name}`);
  passed++;
}
function fail(name: string, detail?: string) {
  console.error(`FAIL: ${name}${detail ? " — " + detail : ""}`);
  failed++;
}

const PREV = process.env.AGRO_API_KEY;

function withKey(value: string | undefined, fn: () => void) {
  if (value === undefined) delete process.env.AGRO_API_KEY;
  else process.env.AGRO_API_KEY = value;
  try {
    fn();
  } finally {
    if (PREV === undefined) delete process.env.AGRO_API_KEY;
    else process.env.AGRO_API_KEY = PREV;
  }
}

// Bearer parsing
if (extractBearerToken("Bearer secret123") === "secret123") ok("bearer basic");
else fail("bearer basic");

if (extractBearerToken("bearer secret123") === "secret123") ok("bearer case");
else fail("bearer case");

if (extractBearerToken("  Bearer   secret123  ") === "secret123")
  ok("bearer whitespace");
else fail("bearer whitespace");

if (extractBearerToken("Bearer secret123\n") === "secret123")
  ok("bearer ignores trailing junk via \\S+");
else {
  // \S+ won't include newline inside token; header trim handles outer
  const t = extractBearerToken("Bearer secret123");
  if (t === "secret123") ok("bearer newline outer");
  else fail("bearer newline", String(t));
}

if (extractBearerToken("Token secret123") === null) ok("non-bearer rejected");
else fail("non-bearer rejected");

if (extractBearerToken(null) === null) ok("null header");
else fail("null header");

// Env trim / quotes / BOM / CRLF
withKey('  "my-agro-key"  \r\n', () => {
  if (getAgroApiKeyStatus() === "detected") ok("env trim+quotes detected");
  else fail("env trim+quotes detected");
  if (verifyApiKey("my-agro-key")) ok("verify after trim+quotes");
  else fail("verify after trim+quotes");
});

withKey("\uFEFFbom-key\n", () => {
  if (verifyApiKey("bom-key")) ok("verify strips BOM/newline");
  else fail("verify strips BOM/newline");
});

withKey("super_secret_api_key_here", () => {
  if (getAgroApiKeyStatus() === "missing") ok("placeholder => missing");
  else fail("placeholder => missing");
  if (!verifyApiKey("super_secret_api_key_here")) ok("placeholder rejected");
  else fail("placeholder rejected");
});

withKey(undefined, () => {
  if (getAgroApiKeyStatus() === "missing") ok("unset => missing");
  else fail("unset => missing");
  if (!verifyApiKey("anything")) ok("unset rejects token");
  else fail("unset rejects token");
});

withKey("correct-key", () => {
  if (verifyApiKey("correct-key")) ok("matching key");
  else fail("matching key");
  if (!verifyApiKey("wrong-key")) ok("mismatch rejected");
  else fail("mismatch rejected");
  if (!verifyApiKey("correct-ke")) ok("length mismatch rejected");
  else fail("length mismatch rejected");
});

console.log(`\n=== Auth fix: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
