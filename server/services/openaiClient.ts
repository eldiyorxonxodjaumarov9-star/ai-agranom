import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  client = new OpenAI({ apiKey });
  return client;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
export const MAX_OUTPUT_TOKENS = 500;
