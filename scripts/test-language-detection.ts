/**
 * Language detection tests — run: npx tsx scripts/test-language-detection.ts
 */
import {
  detectLanguage,
  resolveLanguage,
  resolveResponseLanguage,
  getRejectionMessage,
} from "../lib/agronom/language";

type Case = {
  label: string;
  message: string;
  expected: string;
  nonAgro?: boolean;
};

const CASES: Case[] = [
  // Kyrgyz
  {
    label: "ky-agro-1",
    message: "Помидордун жалбырагы эмне үчүн саргайып жатат?",
    expected: "ky",
  },
  {
    label: "ky-agro-2",
    message: "Бадыраңды кантип сугаруу керек?",
    expected: "ky",
  },
  { label: "ky-nonagro", message: "Месси ким?", expected: "ky", nonAgro: true },
  {
    label: "ky-agro-3",
    message: "Өсүмдүккө кандай жер семирткич керек?",
    expected: "ky",
  },
  // Kazakh
  {
    label: "kk-agro-1",
    message: "Қызанақтың жапырағы неге сарғайып жатыр?",
    expected: "kk",
  },
  {
    label: "kk-agro-2",
    message: "Қиярды қалай суару керек?",
    expected: "kk",
  },
  { label: "kk-nonagro", message: "Месси кім?", expected: "kk", nonAgro: true },
  // Russian
  {
    label: "ru-agro",
    message: "Почему желтеют листья томата?",
    expected: "ru",
  },
  // Uzbek
  {
    label: "uz-agro",
    message: "Pomidor barglari nega sarg'aymoqda?",
    expected: "uz",
  },
];

const EXPLICIT_CASES: { lang: string; expected: string }[] = [
  { lang: "ky", expected: "ky" },
  { lang: "kk", expected: "kk" },
  { lang: "ru", expected: "ru" },
  { lang: "uz", expected: "uz" },
];

let passed = 0;
let failed = 0;

function fail(msg: string) {
  console.error(`FAIL: ${msg}`);
  failed++;
}

function pass(msg: string) {
  console.log(`PASS: ${msg}`);
  passed++;
}

console.log("=== detectLanguage tests ===\n");

for (const c of CASES) {
  const detected = detectLanguage(c.message);
  const respLang = resolveResponseLanguage("auto", c.message);

  if (detected !== c.expected) {
    fail(`${c.label}: expected ${c.expected}, got ${detected}`);
    continue;
  }
  if (respLang !== c.expected) {
    fail(`${c.label} responseLanguage: expected ${c.expected}, got ${respLang}`);
    continue;
  }

  if (c.nonAgro) {
    const rejection = getRejectionMessage(detected);
    if (!rejection || rejection.length < 10) {
      fail(`${c.label}: empty rejection for ${detected}`);
      continue;
    }
  }

  pass(`${c.label} → ${detected}`);
}

console.log("\n=== explicit language resolve ===\n");

for (const { lang, expected } of EXPLICIT_CASES) {
  const resolved = resolveLanguage(lang, "any message");
  const resp = resolveResponseLanguage(resolved, "Помидор test");
  if (resolved !== expected || resp !== expected) {
    fail(`explicit ${lang}: resolved=${resolved} resp=${resp}`);
  } else {
    pass(`explicit language "${lang}" → ${expected}`);
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
