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

const AI_ERROR: ChatApiErrorResponse = {
  success: false,
  error: "AI javob berishda muammo bo'ldi",
};

export interface ProcessChatInput {
  message: string;
  language: SupportedLanguage;
  sessionId?: string;
}

export async function processChat(
  input: ProcessChatInput
): Promise<ChatApiSuccessResponse | ChatApiErrorResponse> {
  try {
    const history = input.sessionId
      ? getSessionHistory(input.sessionId)
      : [];

    const request: AgronomRequest = {
      message: input.message,
      history,
      language: input.language,
    };

    const answer = await generateAgronomAnswer(request);

    if (input.sessionId) {
      appendSessionHistory(input.sessionId, input.message, answer);
    }

    return {
      success: true,
      answer,
      language: input.language,
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
  const history = input.sessionId ? getSessionHistory(input.sessionId) : [];

  const request: AgronomRequest = {
    message: input.message,
    history,
    language: input.language,
  };

  let fullAnswer = "";

  for await (const chunk of streamAgronomAnswer(request)) {
    fullAnswer += chunk;
    yield chunk;
  }

  if (input.sessionId && fullAnswer) {
    appendSessionHistory(input.sessionId, input.message, fullAnswer);
  }

  return fullAnswer;
}
