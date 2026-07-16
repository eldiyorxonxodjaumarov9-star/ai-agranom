import type { SupportedLanguage } from "./api-types";

export type DetectedLanguage = "uz" | "ru" | "en" | "kk" | "ky";

const REJECTION_MESSAGES: Record<string, string> = {
  uz: "Kechirasiz, men faqat agronomiya bo'yicha yordam bera olaman.",
  ru: "Извините, я могу помочь только по вопросам агрономии.",
  kk: "Кешіріңіз, мен тек агрономия мәселелері бойынша көмектесе аламын.",
  ky: "Кечиресиз, мен агрономия боюнча гана жардам бере алам.",
  en: "Sorry, I can only help with agronomy-related questions.",
};

/** Kazakh-only Cyrillic letters (not shared with Kyrgyz as primary signal) */
const KK_UNIQUE_CHARS = "әғқұіһ";

/** Kyrgyz-priority shared Turkic letters */
const KY_PRIORITY_CHARS = "ңөү";

const KY_WORDS = [
  "эмне",
  "кантип",
  "керек",
  "үчүн",
  "менен",
  "өсүмдүк",
  "өсүмдүккө",
  "жалбырак",
  "жалбырагы",
  "жалбырактары",
  "помидор",
  "помидордун",
  "сугаруу",
  "жер семирткич",
  "семирткич",
  "зыянкеч",
  "оору",
  "түшүм",
  "дыйкан",
  "айыл чарба",
  "жардам",
  "ким",
  "кайсы",
  "жакшы",
  "саргайып",
  "куурап",
  "өстүрүү",
  "бадыраң",
  "бадыраңды",
  "кандай",
  "маселе",
];

const KK_WORDS = [
  "неге",
  "қалай",
  "керек",
  "өсімдік",
  "жапырақ",
  "жапырағы",
  "жапырақтары",
  "тыңайтқыш",
  "суару",
  "қызанақ",
  "қызанақтың",
  "қияр",
  "қиярды",
  "кім",
  "деген",
  "сарғайып",
  "сарғайып жатыр",
];

const RU_WORDS = [
  "почему",
  "желтеют",
  "листья",
  "листь",
  "томата",
  "томат",
  "какой",
  "как",
  "кто",
  "такой",
  "удобр",
  "вредител",
  "полив",
  "пшеницы",
  "огурцов",
  "яблони",
];

const EXPLICIT_LANGUAGES = new Set<SupportedLanguage>([
  "uz",
  "ru",
  "en",
  "kk",
  "ky",
]);

function countChars(text: string, chars: string): number {
  const lower = text.toLowerCase();
  let n = 0;
  for (const c of lower) {
    if (chars.includes(c)) n++;
  }
  return n;
}

function countWordHits(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const w of words) {
    if (lower.includes(w)) hits++;
  }
  return hits;
}

function scoreText(text: string): Record<DetectedLanguage, number> {
  const lower = text.toLowerCase();
  const scores: Record<DetectedLanguage, number> = {
    uz: 0,
    ru: 0,
    kk: 0,
    ky: 0,
    en: 0,
  };

  // 1) Unique letter scoring
  scores.kk += countChars(text, KK_UNIQUE_CHARS) * 5;
  const kyCharScore = countChars(text, KY_PRIORITY_CHARS);
  scores.ky += kyCharScore * 4;
  scores.kk += kyCharScore * 1;

  // 2) Word scoring
  scores.ky += countWordHits(text, KY_WORDS) * 4;
  scores.kk += countWordHits(text, KK_WORDS) * 4;
  scores.ru += countWordHits(text, RU_WORDS) * 3;

  // 3) Suffix / structure patterns
  if (/дун|дын|го|ко|уун|үүн|ган|ген|ды\b|тип\b|жатат/i.test(lower)) {
    scores.ky += 2;
  }
  if (/тың|дың|ға\b|ге\b|таң|ді\b|жатыр/i.test(lower)) {
    scores.kk += 2;
  }

  // 4) Uzbek (Latin, no Cyrillic)
  const hasCyrillic = /[а-яёәғқңөұүһі]/i.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  if (hasLatin && !hasCyrillic) {
    scores.uz += 4;
    if (/[ʻʼ'o'g']|nega|pomidor|barg|o'g'it|sug'or|kasallik/i.test(lower)) {
      scores.uz += 3;
    }
  }

  // 5) Russian baseline for Cyrillic without strong kk/ky signals
  if (hasCyrillic) {
    scores.ru += 1;
    if (/[ыэъё]/i.test(text)) scores.ru += 1;
  }

  // 6) English
  if (
    /\b(the|what|how|why|is|are|can|help)\b/i.test(text) &&
    !hasCyrillic
  ) {
    scores.en += 5;
  }

  return scores;
}

export function detectLanguage(text: string): DetectedLanguage {
  const scores = scoreText(text);
  const hasCyrillic = /[а-яёәғқңөұүһі]/i.test(text);

  if (scores.en >= 5 && !hasCyrillic) return "en";

  const langs: DetectedLanguage[] = ["ky", "kk", "ru", "uz"];
  langs.sort((a, b) => scores[b] - scores[a]);

  const top = langs[0];
  const topScore = scores[top];
  const secondScore = scores[langs[1]];

  if (topScore === 0) {
    if (hasCyrillic) return "ru";
    if (/[a-zA-Z]/.test(text)) return "uz";
    return "uz";
  }

  // kk vs ky tie-break: Kazakh unique letters always win
  if (top === "ky" || top === "kk" || (topScore === secondScore && scores.kk > 0 && scores.ky > 0)) {
    if (countChars(text, KK_UNIQUE_CHARS) > 0) return "kk";
    if (scores.ky > scores.kk) return "ky";
    if (scores.kk > scores.ky) return "kk";
    return top;
  }

  // If Russian tied with low kk/ky, prefer ru only when no Turkic signals
  if (top === "ru" && scores.ky < 3 && scores.kk < 3) return "ru";

  return top;
}

export function getRejectionMessage(language: string): string {
  return REJECTION_MESSAGES[language] ?? REJECTION_MESSAGES.uz;
}

export function resolveLanguage(
  requested: string | undefined,
  message: string
): SupportedLanguage {
  void message;
  const r = (requested || "auto").toLowerCase().trim();
  if (EXPLICIT_LANGUAGES.has(r as SupportedLanguage)) {
    return r as SupportedLanguage;
  }
  return "auto";
}

export function getLanguageInstruction(language: SupportedLanguage): string {
  switch (language) {
    case "ru":
      return "Отвечай только на русском языке. Не переводи на другой язык.";
    case "en":
      return "Respond only in English. Never translate to another language.";
    case "uz":
      return "Faqat o'zbek tilida javob ber. Boshqa tilga tarjima qilma.";
    case "kk":
      return "Тек қазақ тілінде жауап бер. Басқа тілге аударма.";
    case "ky":
      return "Кыргызча гана жооп бер. Башка тилге которбо.";
    case "auto":
      return "Respond in the EXACT same language the user wrote in (uz, ru, kk, ky, en, or any other). Never translate their message into another language.";
    default:
      return "Respond in the EXACT same language the user wrote in. Never translate.";
  }
}

export function getRejectionInstruction(language: SupportedLanguage): string {
  if (language === "auto") {
    return `Если вопрос НЕ агрономический — выведи только короткий вежливый отказ (одно предложение).
Ответь на ТОМ ЖЕ языке, что использовал пользователь, и сообщи смысл: ты можешь помочь только по вопросам агрономии.
Никаких дополнительных комментариев.`;
  }

  const msg = getRejectionMessage(language);
  return `Agar savol agro bo'lmagan bo'lsa, faqat shu javobni ber: "${msg}"`;
}

/** Resolve response language: explicit code wins, else detect from message */
export function resolveResponseLanguage(
  language: SupportedLanguage,
  message: string
): string {
  if (language !== "auto") return language;
  return detectLanguage(message);
}
