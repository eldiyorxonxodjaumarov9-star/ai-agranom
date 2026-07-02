import type { SupportedLanguage } from "./api-types";

const REJECTION_MESSAGES: Record<string, string> = {
  uz: "Kechirasiz, men faqat agronomiya bo'yicha yordam bera olaman.",
  ru: "Извините, я могу помочь только по вопросам агрономии.",
  en: "Sorry, I can only help with agronomy-related questions.",
};

export function getRejectionMessage(language: string): string {
  return REJECTION_MESSAGES[language] ?? REJECTION_MESSAGES.uz;
}

export function detectLanguage(text: string): SupportedLanguage {
  const lower = text.toLowerCase();

  if (/[а-яё]/i.test(text) && !/[oʻgʻshch]/i.test(lower)) {
    return "ru";
  }

  if (
    /\b(the|what|how|why|is|are|can|help)\b/i.test(text) &&
    !/[а-яё]/i.test(text)
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
    return detectLanguage(message);
  }

  if (requested === "uz" || requested === "ru" || requested === "en") {
    return requested;
  }

  return detectLanguage(message);
}

export function getLanguageInstruction(language: SupportedLanguage): string {
  switch (language) {
    case "ru":
      return "Отвечай только на русском языке.";
    case "en":
      return "Respond only in English.";
    case "uz":
    default:
      return "Faqat o'zbek tilida javob ber.";
  }
}

export function getRejectionInstruction(language: SupportedLanguage): string {
  const msg = getRejectionMessage(language);
  return `Agar savol agro bo'lmagan bo'lsa, faqat shu javobni ber: "${msg}"`;
}
