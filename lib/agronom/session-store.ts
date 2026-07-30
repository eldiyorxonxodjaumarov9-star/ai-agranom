import type { ChatHistoryItem } from "@/server/services/agronomService";
import { getPrisma, isDatabaseConfigured } from "@/server/kb/db/client";

const SESSION_TTL_MS = 30 * 60 * 1000;

async function upsertPostgres(
  sessionId: string,
  history: ChatHistoryItem[]
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const prisma = getPrisma();
  if (!prisma) return false;
  try {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await prisma.$executeRaw`
      INSERT INTO "ChatSession" (id, history, "expiresAt", "updatedAt")
      VALUES (${sessionId}, ${JSON.stringify(history)}::jsonb, ${expiresAt}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        history = EXCLUDED.history,
        "expiresAt" = EXCLUDED."expiresAt",
        "updatedAt" = NOW()
    `;
    return true;
  } catch (err) {
    console.warn(
      "[session] postgres write failed:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

async function readPostgres(sessionId: string): Promise<ChatHistoryItem[] | null> {
  if (!isDatabaseConfigured()) return null;
  const prisma = getPrisma();
  if (!prisma) return null;
  try {
    const rows = await prisma.$queryRaw<
      Array<{ history: unknown; expiresAt: Date }>
    >`
      SELECT history, "expiresAt" FROM "ChatSession"
      WHERE id = ${sessionId} AND "expiresAt" > NOW()
      LIMIT 1
    `;
    if (!rows[0]) return [];
    const h = rows[0].history;
    return Array.isArray(h) ? (h as ChatHistoryItem[]) : [];
  } catch {
    return null;
  }
}

export async function getSessionHistoryAsync(
  sessionId: string
): Promise<ChatHistoryItem[]> {
  const fromDb = await readPostgres(sessionId);
  if (fromDb !== null) return fromDb;
  return [];
}

export async function appendSessionHistoryAsync(
  sessionId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  const existing = await getSessionHistoryAsync(sessionId);
  const history = [
    ...existing,
    { role: "user" as const, content: userMessage },
    { role: "assistant" as const, content: assistantMessage },
  ].slice(-20);
  await upsertPostgres(sessionId, history);
}

/** Sync API kept for callers — delegates to async fire-and-forget where needed */
export function getSessionHistory(sessionId: string): ChatHistoryItem[] {
  // Sync path cannot await DB; return empty and prefer async callers.
  void sessionId;
  return [];
}

export function appendSessionHistory(
  sessionId: string,
  userMessage: string,
  assistantMessage: string
): void {
  void appendSessionHistoryAsync(sessionId, userMessage, assistantMessage);
}

export function clearSession(sessionId: string): void {
  void (async () => {
    const prisma = getPrisma();
    if (!prisma) return;
    try {
      await prisma.$executeRaw`DELETE FROM "ChatSession" WHERE id = ${sessionId}`;
    } catch {
      /* ignore */
    }
  })();
}
