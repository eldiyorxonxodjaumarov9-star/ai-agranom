import type { ChatHistoryItem } from "@/lib/chat/types";
import { getAgronomEndpoint } from "@/lib/config/api";

const ERROR_MESSAGE =
  "Kechirasiz, hozir javob berishda muammo bo'ldi. Iltimos, qayta urinib ko'ring.";

export interface AgronomStreamCallbacks {
  onChunk: (content: string) => void;
  onDone: (fullAnswer: string) => void;
  onError: (message: string) => void;
}

export async function streamAgronomReply(
  message: string,
  history: ChatHistoryItem[],
  callbacks: AgronomStreamCallbacks
): Promise<void> {
  const response = await fetch(getAgronomEndpoint(true), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    callbacks.onError(
      (data as { error?: string }).error || ERROR_MESSAGE
    );
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
          error?: string;
        };

        if (parsed.error) {
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
        // skip malformed SSE lines
      }
    }
  }

  callbacks.onDone(fullAnswer);
}

export async function fetchAgronomReply(
  message: string,
  history: ChatHistoryItem[]
): Promise<string> {
  const response = await fetch(getAgronomEndpoint(false), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  const data = (await response.json()) as { answer?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.error || ERROR_MESSAGE);
  }

  if (!data.answer) {
    throw new Error(ERROR_MESSAGE);
  }

  return data.answer;
}
