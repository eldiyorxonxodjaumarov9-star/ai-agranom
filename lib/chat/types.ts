export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  isStreaming?: boolean;
}

export interface ChatHistoryItem {
  role: MessageRole;
  content: string;
}

export interface AgronomRequestBody {
  message: string;
  history?: ChatHistoryItem[];
}

export interface AgronomResponseBody {
  answer: string;
}

export const CHAT_STORAGE_KEY = "agro-olam-ai-agronom-chat";
export const SESSION_STORAGE_KEY = "agro-olam-session-id";
export const MAX_STORED_MESSAGES = 50;
