import OpenAI from "openai";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { buildKnowledgeContext } from "@/lib/knowledge/base";
import type { MessageRole } from "@/lib/chat/types";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return new OpenAI({ apiKey });
}

export interface GenerateReplyOptions {
  message: string;
  history?: Array<{ role: MessageRole; content: string }>;
}

export async function generateAgronomReply(
  options: GenerateReplyOptions
): Promise<string> {
  const { message, history = [] } = options;
  const client = getOpenAIClient();

  const knowledgeContext = await buildKnowledgeContext(message);
  const systemPrompt = buildSystemPrompt(knowledgeContext);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.7,
    max_tokens: 1000,
  });

  const reply = completion.choices[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("Empty response from AI");
  }

  return reply;
}
