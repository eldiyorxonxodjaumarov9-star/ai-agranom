import type { ChatMessage } from "./types";
import { CHAT_STORAGE_KEY, SESSION_STORAGE_KEY, MAX_STORED_MESSAGES } from "./types";

export function loadChatHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (m) =>
        m &&
        typeof m.id === "string" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    );
  } catch {
    return [];
  }
}

export function saveChatHistory(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;

  try {
    const trimmed = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function clearChatHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHAT_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    return `sess-${Date.now()}`;
  }
}

export function resetSessionId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
