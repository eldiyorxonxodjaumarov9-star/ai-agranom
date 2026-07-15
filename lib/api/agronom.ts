import { getChatEndpoint } from "@/lib/config/api";
import type { ChatApiResponse } from "@/lib/agronom/api-types";

const ERROR_MESSAGE = "AI javob berishda muammo bo'ldi";

export interface AgronomStreamCallbacks {
  onChunk: (content: string) => void;
  onDone: (fullAnswer: string) => void;
  onError: (message: string) => void;
}

export interface ChatRequestOptions {
  message: string;
  language?: string;
  sessionId?: string;
  images?: string[];
  cropMemory?: string;
  weather?: string;
}

export async function streamAgronomReply(
  options: ChatRequestOptions,
  callbacks: AgronomStreamCallbacks
): Promise<void> {
  const response = await fetch(getChatEndpoint(true), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message: options.message,
      language: options.language ?? "auto",
      sessionId: options.sessionId,
      images: options.images,
      cropMemory: options.cropMemory,
      weather: options.weather,
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as ChatApiResponse;
    callbacks.onError(!data.success ? data.error : ERROR_MESSAGE);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(ERROR_MESSAGE);
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullAnswer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data) as {
          content?: string;
          done?: boolean;
          answer?: string;
          success?: boolean;
          error?: string;
        };

        if (parsed.success === false && parsed.error) {
          callbacks.onError(parsed.error);
          return;
        }

        if (parsed.content) {
          fullAnswer += parsed.content;
          callbacks.onChunk(fullAnswer);
        }

        if (parsed.done && parsed.answer) {
          fullAnswer = parsed.answer;
        }
      } catch {
        // skip
      }
    }
  }

  callbacks.onDone(fullAnswer);
}
