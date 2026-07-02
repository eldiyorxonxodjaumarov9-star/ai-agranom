import { getRejectionMessage } from "./language";
import type { SupportedLanguage } from "./api-types";

const LANGUAGES: SupportedLanguage[] = ["uz", "ru", "en"];

export function isRejectionAnswer(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();

  return LANGUAGES.some((lang) => {
    const rejection = getRejectionMessage(lang).toLowerCase();
    return (
      normalized === rejection ||
      normalized.includes(rejection.slice(0, 30))
    );
  });
}
