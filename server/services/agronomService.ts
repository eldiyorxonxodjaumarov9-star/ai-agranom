import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  buildAgronomPrompt,
  buildUserContextBlock,
} from "../prompts/system";
import { retrieveContextWithMeta } from "@/server/kb/provider";
import type { RagRetrievalResult } from "@/server/kb/types";
import type { SupportedLanguage } from "@/lib/agronom/api-types";
import {
  getOpenAIClient,
  OPENAI_TEXT_MODEL,
  MAX_OUTPUT_TOKENS,
  getVisionImageDetail,
} from "./openaiClient";
import {
  AGRONOM_RESPONSE_JSON_SCHEMA,
  fallbackAgronomResponse,
  safeParseAgronomResponse,
  type AgronomStructuredResponse,
} from "@/server/schemas/agronom-response";
import { sanitizeDisplayText } from "@/lib/agronom/display-sanitize";

export interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface AgronomRequest {
  message: string;
  history?: ChatHistoryItem[];
  language?: SupportedLanguage;
  images?: string[];
  cropMemory?: string;
  /** Server-generated weather only — never trust client weather as system */
  weather?: string;
}

export interface AgronomAnswerResult {
  answer: string;
  structured: AgronomStructuredResponse;
  rag: RagRetrievalResult;
}

function buildMessages(
  message: string,
  history: ChatHistoryItem[],
  ragContext: string,
  language: SupportedLanguage = "uz",
  extras?: { cropMemory?: string; weather?: string; images?: string[] }
): ChatCompletionMessageParam[] {
  const system = buildAgronomPrompt(ragContext, language);
  const userContext = buildUserContextBlock({
    cropMemory: extras?.cropMemory,
    weather: extras?.weather,
  });

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...history.slice(-10).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
  ];

  const textBody = userContext ? `${message}\n\n${userContext}` : message;
  const imgs = extras?.images?.slice(0, 10) || [];
  const detail = getVisionImageDetail();

  if (imgs.length > 0) {
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text:
            textBody +
            `\n\n(${imgs.length} ta rasm yuborildi. Har birini alohida tahlil qil. displayText ichida URL/JSON/ID yozma.)`,
        },
        ...imgs.map((url) => ({
          type: "image_url" as const,
          image_url: {
            url,
            detail: detail === "original" ? ("high" as const) : detail,
          },
        })),
      ],
    });
  } else {
    messages.push({ role: "user", content: textBody });
  }

  return messages;
}

function normalizeStructured(
  raw: AgronomStructuredResponse,
  rag: RagRetrievalResult
): AgronomStructuredResponse {
  const displayText = sanitizeDisplayText(raw.displayText);
  let confidence =
    typeof raw.confidence === "number"
      ? Math.min(0.99, Math.max(0, raw.confidence))
      : rag.confidence;
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
    confidence = raw.diagnosis?.overallConfidence ?? 0.4;
  }
  confidence = Math.min(0.99, confidence);

  let requiresExpertReview = Boolean(raw.requiresExpertReview);
  if (confidence < 0.55) requiresExpertReview = true;
  if (raw.diagnosis?.requiresExpertReview) requiresExpertReview = true;
  if (raw.diagnosis?.imageQuality === "poor") requiresExpertReview = true;

  return {
    ...raw,
    displayText:
      displayText ||
      fallbackAgronomResponse().displayText,
    confidence,
    requiresExpertReview,
    productCandidates: (raw.productCandidates || []).slice(0, 12),
    sourceIds: (raw.sourceIds || []).slice(0, 20),
  };
}

async function completeStructured(
  request: AgronomRequest
): Promise<AgronomAnswerResult> {
  const client = getOpenAIClient();
  const language = request.language ?? "uz";
  const { contextText, result: rag } = await retrieveContextWithMeta(
    request.message
  );

  const messages = buildMessages(
    request.message,
    request.history ?? [],
    contextText,
    language,
    {
      cropMemory: request.cropMemory,
      weather: request.weather,
      images: request.images,
    }
  );

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: OPENAI_TEXT_MODEL,
      messages,
      temperature: 0.4,
      max_completion_tokens: MAX_OUTPUT_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: AGRONOM_RESPONSE_JSON_SCHEMA,
      },
    });
  } catch (err) {
    // One controlled fallback without uncontrolled retries
    console.error(
      "[agronom] structured output failed, using safe fallback:",
      err instanceof Error ? err.message : String(err)
    );
    const fb = normalizeStructured(fallbackAgronomResponse(), rag);
    return { answer: fb.displayText, structured: fb, rag };
  }

  const choice = completion.choices[0];
  const finish = choice?.finish_reason;
  const content = choice?.message?.content?.trim();

  if (!content || finish === "content_filter") {
    const fb = normalizeStructured(
      fallbackAgronomResponse(
        "Javobni xavfsiz tarzda yakunlab bo'lmadi. Iltimos, savolni qisqaroq qilib qayta yuboring."
      ),
      rag
    );
    return { answer: fb.displayText, structured: fb, rag };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    const fb = normalizeStructured(fallbackAgronomResponse(), rag);
    return { answer: fb.displayText, structured: fb, rag };
  }

  const structured = safeParseAgronomResponse(parsedJson);
  if (!structured) {
    const fb = normalizeStructured(fallbackAgronomResponse(), rag);
    return { answer: fb.displayText, structured: fb, rag };
  }

  const normalized = normalizeStructured(structured, rag);
  return {
    answer: normalized.displayText,
    structured: normalized,
    rag,
  };
}

export async function generateAgronomAnswer(
  request: AgronomRequest
): Promise<AgronomAnswerResult> {
  return completeStructured(request);
}

/**
 * Stream only sanitized displayText chunks after full structured completion.
 * Never yields raw model JSON tokens.
 */
export async function* streamAgronomAnswer(
  request: AgronomRequest
): AsyncGenerator<string, AgronomAnswerResult, unknown> {
  const result = await completeStructured(request);
  const text = result.answer;
  const chunkSize = 48;
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
  }
  return result;
}
