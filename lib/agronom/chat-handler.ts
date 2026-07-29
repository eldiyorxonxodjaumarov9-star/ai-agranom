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
import { resolveResponseLanguage } from "@/lib/agronom/language";
import { getLastRagResult } from "@/server/kb/provider";
import { stripAgentMeta } from "@/lib/platform/agent-meta";

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
  region?: string;
  crop?: string;
  greenhouse?: boolean;
  imageIds?: string[];
}

/** API response til maydoni: auto bo‘lsa detect qilinadi (uz/ru/kk/ky/en) */
export function responseLanguage(
  language: SupportedLanguage,
  message: string
): string {
  return resolveResponseLanguage(language, message);
}

function toRequest(input: ProcessChatInput): AgronomRequest {
  const history = input.sessionId ? getSessionHistory(input.sessionId) : [];
  const extras: string[] = [];
  if (input.region) extras.push(`Region: ${input.region}`);
  if (input.crop) extras.push(`Crop hint: ${input.crop}`);
  if (input.greenhouse !== undefined) {
    extras.push(`Greenhouse: ${input.greenhouse ? "yes" : "no"}`);
  }
  const message =
    extras.length > 0
      ? `${input.message}\n\n(${extras.join("; ")})`
      : input.message;

  return {
    message,
    history,
    language: input.language,
    images: input.images,
    cropMemory: input.cropMemory,
    weather: input.weather,
  };
}

function enrichResponse(
  answer: string,
  language: string
): ChatApiSuccessResponse {
  const rag = getLastRagResult();
  const { meta } = stripAgentMeta(answer);
  const sources =
    rag?.sources?.map((s) => ({
      organization: s.organization,
      title: s.title,
      url: s.url,
    })) ?? meta?.sources;

  const confidence = rag?.confidence;
  const requiresExpertReview =
    typeof confidence === "number" ? confidence < 0.45 : undefined;

  return {
    success: true,
    answer,
    language,
    service: SERVICE_NAME,
    ...(sources?.length ? { sources } : {}),
    ...(typeof confidence === "number" ? { confidence } : {}),
    ...(meta?.products?.length ? { products: meta.products } : {}),
    ...(requiresExpertReview !== undefined ? { requiresExpertReview } : {}),
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

    return enrichResponse(
      answer,
      responseLanguage(input.language, input.message)
    );
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
