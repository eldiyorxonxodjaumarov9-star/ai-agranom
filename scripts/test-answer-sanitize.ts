/**
 * Answer sanitization / leakage regression tests.
 * Run: npx tsx scripts/test-answer-sanitize.ts
 */
import {
  sanitizeDisplayText,
  assertNoUserFacingLeakage,
} from "../lib/agronom/display-sanitize";
import { stripAgentMeta } from "../lib/platform/agent-meta";

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

const completeMeta = `Pomidorda ehtimoliy zamburug'.

---AGRO_META---
{"products":["npk-20-20-20"],"calendar":[],"health":null,"reminders":[],"imageAnalysis":[],"sources":[{"organization":"EPPO","title":"x","url":"https://gd.eppo.int"}],"confidence":0.7}
---END---`;

const incompleteMeta = `Belgilar: sariq dog'lar.

---AGRO_META---
{"products":["urea-azot"],"confidence":0.8`;

const withManbalar = `Tavsiya: sug'oring.

Manbalar:
- EPPO https://gd.eppo.int/taxon/PHYTIF
- FAO http://www.fao.org/example`;

{
  const t = sanitizeDisplayText(completeMeta);
  if (!/AGRO_META/i.test(t) && !/---END---/i.test(t) && !/https?:\/\//i.test(t)) {
    ok("complete AGRO_META stripped");
  } else fail("complete AGRO_META stripped", t.slice(0, 120));
}

{
  const t = sanitizeDisplayText(incompleteMeta);
  if (!/AGRO_META/i.test(t) && !/"products"/i.test(t)) {
    ok("incomplete AGRO_META stripped");
  } else fail("incomplete AGRO_META stripped", t.slice(0, 120));
}

{
  const t = sanitizeDisplayText(withManbalar);
  if (!/Manbalar/i.test(t) && !/https?:\/\//i.test(t)) {
    ok("Manbalar + URLs stripped");
  } else fail("Manbalar + URLs stripped", t);
}

{
  const { text, meta } = stripAgentMeta(completeMeta);
  if (meta?.products?.[0] === "npk-20-20-20" && assertNoUserFacingLeakage(text).length === 0) {
    ok("stripAgentMeta extracts meta and cleans text");
  } else fail("stripAgentMeta extracts meta and cleans text");
}

{
  const clean = sanitizeDisplayText(
    "Ehtimoliy muammo: oidium.\n\nHozir: shamollatishni yaxshilang."
  );
  if (assertNoUserFacingLeakage(clean).length === 0) ok("clean text no leakage");
  else fail("clean text no leakage");
}

{
  const t = sanitizeDisplayText(
    "Ko'ring [EPPO](https://gd.eppo.int) va ```json\n{\"a\":1}\n```"
  );
  const leaks = assertNoUserFacingLeakage(t);
  if (!leaks.includes("url") && !leaks.includes("code_fence")) {
    ok("markdown link and fence stripped");
  } else fail("markdown link and fence stripped", leaks.join(","));
}

console.log(`\n=== Answer sanitize: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
