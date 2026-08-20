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
import type { AgronomStructuredResponse } from "@/server/schemas/agronom-response";
import { sanitizeDisplayText } from "@/lib/agronom/display-sanitize";

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

function enrichResponse(
  displayText: string,
  language: string,
  rag: RagRetrievalResult | null,
  structured?: AgronomStructuredResponse | null
): ChatApiSuccessResponse {
  const answer = sanitizeDisplayText(displayText);
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

  const products = structured?.productCandidates?.length
    ? structured.productCandidates
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
    const clean = sanitizeDisplayText(answer);

    if (input.sessionId) {
      await appendSessionHistoryAsync(input.sessionId, input.message, clean);
    }

    return enrichResponse(
      clean,
      responseLanguage(input.language, input.message),
      rag,
      structured
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
  let structured: AgronomStructuredResponse | null = null;

  const gen = streamAgronomAnswer(await toRequest(input));
  let next = await gen.next();
  while (!next.done) {
    fullAnswer += next.value;
    yield next.value;
    next = await gen.next();
  }
  if (next.done && next.value) {
    structured = next.value.structured;
    fullAnswer = sanitizeDisplayText(next.value.answer || fullAnswer);
  } else {
    fullAnswer = sanitizeDisplayText(fullAnswer);
  }

  if (input.sessionId) {
    await appendSessionHistoryAsync(input.sessionId, input.message, fullAnswer);
  }

  // Attach structured on the generator return value via fullAnswer only;
  // chat-route uses yielded chunks + final answer string.
  void structured;
  return fullAnswer;
}
