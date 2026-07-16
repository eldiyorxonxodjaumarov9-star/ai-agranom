/**
 * Fail if BOM or emoji-mojibake remains in AgronomChat / locales.
 * Run: node scripts/test-encoding.js
 */
const fs = require("fs");
const path = require("path");

let failed = 0;

function checkFile(file, { allowCyrillic = true } = {}) {
  const buf = fs.readFileSync(file);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    console.error("BOM:", file);
    failed++;
  }
  const text = buf.toString("utf8");
  // Classic mojibake markers from UTF-8 emoji mis-decoded as CP1251
  if (/aria-hidden>[\u0432\u0440][\u0400-\u04FF\u2010-\u2027]/.test(text)) {
    console.error("MOJIBAKE icon:", file);
    failed++;
  }
  if (/Рџереимен|Р—акреп|РЈдалить/.test(text)) {
    console.error("MOJIBAKE text:", file);
    failed++;
  }
  void allowCyrillic;
}

checkFile("components/platform/AgronomChat.tsx");
checkFile("lib/i18n/messages.ts");
for (const loc of ["uz", "ru", "kk", "ky"]) {
  checkFile(path.join("locales", `${loc}.json`));
}

console.log(failed === 0 ? "ENCODING: SUCCESS" : `ENCODING: FAILED (${failed})`);
process.exit(failed ? 1 : 0);
