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
}

function buildMessages(
  message: string,
  history: ChatHistoryItem[],
  ragContext: string,
  language: SupportedLanguage = "uz"
): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: buildAgronomPrompt(ragContext, language) },
    ...history.slice(-10).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];
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
    language
  );

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    temperature: 0.7,
    max_completion_tokens: MAX_OUTPUT_TOKENS,
  });

  const answer = completion.choices[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("Empty response from OpenAI");
  }

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
    language
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
    if (content) {
      yield content;
    }
  }
}
