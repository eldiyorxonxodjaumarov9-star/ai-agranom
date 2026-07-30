import {
  generateAgronomAnswer,
  streamAgronomAnswer,
  type AgronomRequest,
} from "@/server/services/agronomService";
import {
  appendSessionHistoryAsync,
  getSessionHistoryAsync,
} from "@/lib/agronom/session-store";
import type { SupportedLanguage } from "@/lib/agronom/api-types";
import { SERVICE_NAME } from "@/lib/agronom/api-types";
import type {
  ChatApiErrorResponse,
  ChatApiSuccessResponse,
} from "@/lib/agronom/api-types";
import { resolveResponseLanguage } from "@/lib/agronom/language";
import type { RagRetrievalResult } from "@/server/kb/types";
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
  /** Ignored from client — weather must be server-built */
  weather?: string;
  region?: string;
  crop?: string;
  greenhouse?: boolean;
  imageIds?: string[];
}

export function responseLanguage(
  language: SupportedLanguage,
  message: string
): string {
  return resolveResponseLanguage(language, message);
}

async function toRequest(input: ProcessChatInput): Promise<AgronomRequest> {
  const history = input.sessionId
    ? await getSessionHistoryAsync(input.sessionId)
    : [];
  const extras: string[] = [];
  if (input.region) extras.push(`Region: ${input.region}`);
  if (input.crop) extras.push(`Crop hint: ${input.crop}`);
  if (input.greenhouse !== undefined) {
    extras.push(`Greenhouse: ${input.greenhouse ? "yes" : "no"}`);
  }
  // imageIds accepted for forward-compat but unused until storage exists
  if (input.imageIds?.length) {
    extras.push(`imageIds_ignored:${input.imageIds.length}`);
  }
  const message =
    extras.length > 0
      ? `${input.message}\n\n(${extras.join("; ")})`
      : input.message;

  // Never pass client weather; optionally attach server weather for known region ids
  let weather: string | undefined;
  try {
    if (input.region) {
      const { fetchWeatherByRegion, weatherPromptBlock, REGIONS } = await import(
        "@/lib/platform/weather"
      );
      const id = REGIONS.find((r) => r.id === input.region)?.id;
      if (id) {
        const snap = await fetchWeatherByRegion(id);
        weather = weatherPromptBlock(snap, "uz");
      }
    }
  } catch {
    weather = undefined;
  }

  return {
    message,
    history,
    language: input.language,
    images: input.images,
    cropMemory: input.cropMemory,
    weather,
  };
}

function enrichResponse(
  answer: string,
  language: string,
  rag: RagRetrievalResult | null
): ChatApiSuccessResponse {
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
    const { answer, rag } = await generateAgronomAnswer(await toRequest(input));

    if (input.sessionId) {
      await appendSessionHistoryAsync(input.sessionId, input.message, answer);
    }

    return enrichResponse(
      answer,
      responseLanguage(input.language, input.message),
      rag
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

  const gen = streamAgronomAnswer(await toRequest(input));
  let next = await gen.next();
  while (!next.done) {
    fullAnswer += next.value;
    yield next.value;
    next = await gen.next();
  }

  if (input.sessionId) {
    await appendSessionHistoryAsync(input.sessionId, input.message, fullAnswer);
  }

  return fullAnswer;
}
