import type { SupportedLanguage } from "./api-types";

const REJECTION_MESSAGES: Record<string, string> = {
  uz: "Kechirasiz, men faqat agronomiya bo'yicha yordam bera olaman.",
  ru: "Извините, я могу помочь только по вопросам агрономии.",
  kk: "Кешіріңіз, мен тек агрономия мәселелері бойынша көмектесе аламын.",
  en: "Sorry, I can only help with agronomy-related questions.",
};

export function getRejectionMessage(language: string): string {
  return REJECTION_MESSAGES[language] ?? REJECTION_MESSAGES.uz;
}

export function detectLanguage(text: string): SupportedLanguage | "kk" | "ky" {
  const lower = text.toLowerCase();

  if (/[әғқңөұүһі]/i.test(text)) {
    return "kk";
  }

  if (/[өүң]/i.test(text) && /[а-яё]/i.test(text)) {
    return "ky";
  }

  if (/[а-яё]/i.test(text) && !/[oʻgʻshch]/i.test(lower)) {
    return "ru";
  }

  if (
    /\b(the|what|how|why|is|are|can|help)\b/i.test(text) &&
    !/[а-яёәғқңөұүһі]/i.test(text)
  ) {
    return "en";
  }

  return "uz";
}

export function resolveLanguage(
  requested: string | undefined,
  message: string
): SupportedLanguage {
  if (!requested || requested === "auto") {
    // Keep auto so model mirrors any of 100+ user languages
    void message;
    return "auto";
  }

  if (requested === "uz" || requested === "ru" || requested === "en") {
    return requested;
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
    case "auto":
      return "Respond in the EXACT same language the user wrote in (any of 100+ languages). Never translate their message into another language.";
    default:
      return "Respond in the EXACT same language the user wrote in. Never translate.";
  }
}

export function getRejectionInstruction(language: SupportedLanguage): string {
  const msg = getRejectionMessage(language);
  return `Agar savol agro bo'lmagan bo'lsa, faqat shu javobni ber: "${msg}"`;
}
