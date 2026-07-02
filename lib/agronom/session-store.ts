import type { ChatHistoryItem } from "@/server/services/agronomService";

const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 500;

interface SessionEntry {
  history: ChatHistoryItem[];
  expiresAt: number;
}

const sessions = new Map<string, SessionEntry>();

function cleanupSessions(): void {
  const now = Date.now();
  sessions.forEach((entry, id) => {
    if (entry.expiresAt < now) {
      sessions.delete(id);
    }
  });

  if (sessions.size > MAX_SESSIONS) {
    const oldest = Array.from(sessions.entries()).sort(
      (a, b) => a[1].expiresAt - b[1].expiresAt
    );
    const toRemove = oldest.slice(0, sessions.size - MAX_SESSIONS);
    toRemove.forEach(([id]) => sessions.delete(id));
  }
}

export function getSessionHistory(sessionId: string): ChatHistoryItem[] {
  cleanupSessions();
  const entry = sessions.get(sessionId);
  if (!entry || entry.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return [];
  }
  return [...entry.history];
}

export function appendSessionHistory(
  sessionId: string,
  userMessage: string,
  assistantMessage: string
): void {
  cleanupSessions();
  const existing = sessions.get(sessionId);
  const history = existing?.history ?? [];

  history.push(
    { role: "user", content: userMessage },
    { role: "assistant", content: assistantMessage }
  );

  sessions.set(sessionId, {
    history: history.slice(-20),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}
