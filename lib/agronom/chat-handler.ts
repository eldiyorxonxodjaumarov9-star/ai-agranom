import {
  generateAgronomAnswer,
  streamAgronomAnswer,
  type AgronomRequest,
} from "@/server/services/agronomService";
import {
  appendSessionHistory,
  getSessionHistory,
} from "@/lib/agronom/session-store";
import type { SupportedLanguage } from "@/lib/agronom/api-types";
import { SERVICE_NAME } from "@/lib/agronom/api-types";
import type {
  ChatApiErrorResponse,
  ChatApiSuccessResponse,
} from "@/lib/agronom/api-types";
import { detectLanguage } from "@/lib/agronom/language";

const AI_ERROR: ChatApiErrorResponse = {
  success: false,
  error: "AI javob berishda muammo bo'ldi",
};

export interface ProcessChatInput {
  message: string;
  language: SupportedLanguage;
  sessionId?: string;
  images?: string[];
  cropMemory?: string;
  weather?: string;
}

/** API response til maydoni: auto bo‘lsa detect qilinadi (uz/ru/en) */
export function responseLanguage(
  language: SupportedLanguage,
  message: string
): string {
  if (language === "auto") return detectLanguage(message);
  return language;
}

function toRequest(input: ProcessChatInput): AgronomRequest {
  const history = input.sessionId ? getSessionHistory(input.sessionId) : [];
  return {
    message: input.message,
    history,
    language: input.language,
    images: input.images,
    cropMemory: input.cropMemory,
    weather: input.weather,
  };
}

export async function processChat(
  input: ProcessChatInput
): Promise<ChatApiSuccessResponse | ChatApiErrorResponse> {
  try {
    const answer = await generateAgronomAnswer(toRequest(input));

    if (input.sessionId) {
      appendSessionHistory(input.sessionId, input.message, answer);
    }

    return {
      success: true,
      answer,
      language: responseLanguage(input.language, input.message),
      service: SERVICE_NAME,
    };
  } catch (error) {
    console.error("[agronom/chat] Error:", error);
    return AI_ERROR;
  }
}

export async function* processChatStream(
  input: ProcessChatInput
): AsyncGenerator<string, string, unknown> {
  let fullAnswer = "";

  for await (const chunk of streamAgronomAnswer(toRequest(input))) {
    fullAnswer += chunk;
    yield chunk;
  }

  if (input.sessionId && fullAnswer) {
    appendSessionHistory(input.sessionId, input.message, fullAnswer);
  }

  return fullAnswer;
}
