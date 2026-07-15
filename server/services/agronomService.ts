import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { buildAgronomPrompt } from "../prompts/system";
import { retrieveContext } from "../rag/provider";
import type { SupportedLanguage } from "@/lib/agronom/api-types";
import {
  getOpenAIClient,
  OPENAI_MODEL,
  MAX_OUTPUT_TOKENS,
} from "./openaiClient";

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
  weather?: string;
}

function buildMessages(
  message: string,
  history: ChatHistoryItem[],
  ragContext: string,
  language: SupportedLanguage = "uz",
  extras?: { cropMemory?: string; weather?: string; images?: string[] }
): ChatCompletionMessageParam[] {
  const system = buildAgronomPrompt(ragContext, language, {
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

  const imgs = extras?.images?.slice(0, 10) || [];
  if (imgs.length > 0) {
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text:
            message +
            `\n\n(${imgs.length} ta rasm yuborildi. Har birini alohida tahlil qil.)`,
        },
        ...imgs.map((url) => ({
          type: "image_url" as const,
          image_url: { url, detail: "low" as const },
        })),
      ],
    });
  } else {
    messages.push({ role: "user", content: message });
  }

  return messages;
}

export async function generateAgronomAnswer(
  request: AgronomRequest
): Promise<string> {
  const client = getOpenAIClient();
  const language = request.language ?? "uz";
  const ragContext = await retrieveContext(request.message);
  const messages = buildMessages(
    request.message,
    request.history ?? [],
    ragContext,
    language,
    {
      cropMemory: request.cropMemory,
      weather: request.weather,
      images: request.images,
    }
  );

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    temperature: 0.7,
    max_completion_tokens: MAX_OUTPUT_TOKENS,
  });

  const answer = completion.choices[0]?.message?.content?.trim();
  if (!answer) throw new Error("Empty response from OpenAI");
  return answer;
}

export async function* streamAgronomAnswer(
  request: AgronomRequest
): AsyncGenerator<string, void, unknown> {
  const client = getOpenAIClient();
  const language = request.language ?? "uz";
  const ragContext = await retrieveContext(request.message);
  const messages = buildMessages(
    request.message,
    request.history ?? [],
    ragContext,
    language,
    {
      cropMemory: request.cropMemory,
      weather: request.weather,
      images: request.images,
    }
  );

  const stream = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    temperature: 0.7,
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
