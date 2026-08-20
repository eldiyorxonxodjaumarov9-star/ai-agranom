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

/** Canonical text model (Structured Outputs). */
export const OPENAI_TEXT_MODEL =
  process.env.OPENAI_TEXT_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-5.4-mini";

/** Canonical vision model. */
export const OPENAI_VISION_MODEL =
  process.env.OPENAI_VISION_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-5.4-mini";

/** @deprecated use OPENAI_TEXT_MODEL */
export const OPENAI_MODEL = OPENAI_TEXT_MODEL;

export const MAX_OUTPUT_TOKENS = Number(
  process.env.OPENAI_MAX_OUTPUT_TOKENS || 1800
);

export type VisionImageDetail = "low" | "high" | "original";

export function getVisionImageDetail(): VisionImageDetail {
  const v = (process.env.VISION_IMAGE_DETAIL || "high").toLowerCase();
  if (v === "low" || v === "original" || v === "high") return v;
  return "high";
}
