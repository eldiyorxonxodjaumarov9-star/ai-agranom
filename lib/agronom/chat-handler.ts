import {
  generateAgronomAnswer,
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
import type { AgronomStructuredResponse } from "@/server/schemas/agronom-response";
import { sanitizeDisplayText } from "@/lib/agronom/display-sanitize";
import { applyProductGateToAnswer } from "@/server/kb/products/gate-products";

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
  if (input.imageIds?.length) {
    extras.push(`imageIds_ignored:${input.imageIds.length}`);
  }
  const message =
    extras.length > 0
      ? `${input.message}\n\n(${extras.join("; ")})`
      : input.message;

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

async function enrichResponse(
  displayText: string,
  language: string,
  rag: RagRetrievalResult | null,
  structured?: AgronomStructuredResponse | null,
  crop?: string
): Promise<ChatApiSuccessResponse> {
  const gated = await applyProductGateToAnswer({
    displayText,
    candidateIds: structured?.productCandidates || [],
    language,
    requestCropId: crop || structured?.diagnosis?.crop || null,
    requestTarget: null,
  });
  const answer = sanitizeDisplayText(gated.displayText);
  const sources =
    rag?.sources?.map((s) => ({
      organization: s.organization,
      title: s.title,
      url: s.url,
    })) ?? undefined;

  const confidence =
    typeof structured?.confidence === "number"
      ? structured.confidence
      : rag?.confidence;

  const requiresExpertReview =
    structured?.requiresExpertReview ??
    (typeof confidence === "number" ? confidence < 0.45 : undefined);

  const products =
    gated.products.length > 0
      ? gated.products.map((p) => p.id)
      : undefined;

  return {
    success: true,
    answer,
    language,
    service: SERVICE_NAME,
    ...(sources?.length ? { sources } : {}),
    ...(typeof confidence === "number" ? { confidence } : {}),
    ...(products?.length ? { products } : {}),
    ...(requiresExpertReview !== undefined ? { requiresExpertReview } : {}),
  };
}

export async function processChat(
  input: ProcessChatInput
): Promise<ChatApiSuccessResponse | ChatApiErrorResponse> {
  try {
    const { answer, structured, rag } = await generateAgronomAnswer(
      await toRequest(input)
    );
    const response = await enrichResponse(
      answer,
      responseLanguage(input.language, input.message),
      rag,
      structured,
      input.crop
    );

    if (input.sessionId) {
      await appendSessionHistoryAsync(
        input.sessionId,
        input.message,
        response.answer
      );
    }

    return response;
  } catch (error) {
    console.error("[agronom/chat] Error:", error);
    return AI_ERROR;
  }
}

export async function* processChatStream(
  input: ProcessChatInput
): AsyncGenerator<string, string, unknown> {
  // Generate fully, then gate products, then stream gated displayText only.
  const { answer, structured } = await generateAgronomAnswer(
    await toRequest(input)
  );
  const gated = await applyProductGateToAnswer({
    displayText: answer,
    candidateIds: structured?.productCandidates || [],
    language: responseLanguage(input.language, input.message),
    requestCropId: input.crop || structured?.diagnosis?.crop || null,
    requestTarget: null,
  });
  const fullAnswer = sanitizeDisplayText(gated.displayText);

  const chunkSize = 48;
  for (let i = 0; i < fullAnswer.length; i += chunkSize) {
    yield fullAnswer.slice(i, i + chunkSize);
  }

  if (input.sessionId) {
    await appendSessionHistoryAsync(input.sessionId, input.message, fullAnswer);
  }

  return fullAnswer;
}
