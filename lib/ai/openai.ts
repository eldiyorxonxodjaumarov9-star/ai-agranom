/**
 * Legacy parallel AI path — delegates to canonical server gateway.
 * Prefer importing from @/server/services/agronomService directly.
 */
import { generateAgronomAnswer } from "@/server/services/agronomService";
import type { MessageRole } from "@/lib/chat/types";

export interface GenerateReplyOptions {
  message: string;
  history?: Array<{ role: MessageRole; content: string }>;
}

/** @deprecated Use generateAgronomAnswer from server/services/agronomService */
export async function generateAgronomReply(
  options: GenerateReplyOptions
): Promise<string> {
  const { answer } = await generateAgronomAnswer({
    message: options.message,
    history: (options.history || []).map((h) => ({
      role: h.role === "assistant" ? "assistant" : "user",
      content: h.content,
    })),
  });
  return answer;
}
