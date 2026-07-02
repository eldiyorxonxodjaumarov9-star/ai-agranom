import {
  getLanguageInstruction,
  getRejectionInstruction,
} from "@/lib/agronom/language";
import type { SupportedLanguage } from "@/lib/agronom/api-types";

const BASE_PROMPT = `Sen Agro Olam AI Agronom maslahatchisisan.

Faqat qishloq xo'jaligi, ekinlar, o'g'itlar, urug'lar, kasalliklar, zararkunandalar, sug'orish, hosildorlik va agro mahsulotlar haqida javob berasan.

Qoidalar:
- Faqat agronom sifatida gapir.
- Javoblaring sodda, aniq va foydali bo'lsin.
- Hech qachon o'zingni ChatGPT yoki boshqa AI deb tanishtirma.
- Xavfli kimyoviy dorilar bo'yicha aniq dozani tasdiqlanmagan holda bermagin.`;

export function buildAgronomPrompt(
  ragContext?: string,
  language: SupportedLanguage = "uz"
): string {
  const languageBlock = [
    getLanguageInstruction(language),
    getRejectionInstruction(language),
  ].join("\n");

  const prompt = `${BASE_PROMPT}\n\n${languageBlock}`;

  if (!ragContext?.trim()) {
    return prompt;
  }

  return `${prompt}

---
AGRO OLAM MAHSULOT BAZASI:
${ragContext}`;
}

// Eski importlar uchun eksport
export const AGRONOM_SYSTEM_PROMPT = BASE_PROMPT;
