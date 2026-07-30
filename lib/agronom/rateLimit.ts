/**
 * Shared rate limiter: Upstash Redis if configured, else PostgreSQL.
 * In-memory Map is only a last-resort local-dev fallback.
 */
import { getPrisma, isDatabaseConfigured } from "@/server/kb/db/client";

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000) || 60_000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX || 20) || 20;

export const RATE_LIMIT_ERROR = {
  success: false as const,
  error: "Too many requests. Please try again later.",
};

const memory = new Map<string, { count: number; resetAt: number }>();

async function checkUpstash(key: string): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const redisKey = `rl:${key}`;
  const r1 = await fetch(`${url}/incr/${encodeURIComponent(redisKey)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r1.ok) return null;
  const j1 = (await r1.json()) as { result?: number };
  const count = Number(j1.result || 0);
  if (count === 1) {
    await fetch(
      `${url}/pexpire/${encodeURIComponent(redisKey)}/${WINDOW_MS}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
  }
  return count <= MAX_REQUESTS;
}

async function checkPostgres(key: string): Promise<boolean | null> {
  if (!isDatabaseConfigured()) return null;
  const prisma = getPrisma();
  if (!prisma) return null;
  try {
    const now = new Date();
    const rows = await prisma.$queryRaw<
      Array<{ count: number; reset_at: Date }>
    >`
      INSERT INTO "RateLimitBucket" (key, count, "resetAt")
      VALUES (${key}, 1, ${new Date(now.getTime() + WINDOW_MS)})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN "RateLimitBucket"."resetAt" < ${now} THEN 1
          ELSE "RateLimitBucket".count + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitBucket"."resetAt" < ${now} THEN ${new Date(now.getTime() + WINDOW_MS)}
          ELSE "RateLimitBucket"."resetAt"
        END
      RETURNING count, "resetAt" as reset_at
    `;
    const count = Number(rows[0]?.count || 1);
    return count <= MAX_REQUESTS;
  } catch (err) {
    console.warn(
      "[rateLimit] postgres unavailable:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

function checkMemory(key: string): boolean {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now > entry.resetAt) {
    memory.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) return false;
  entry.count += 1;
  return true;
}

/** Async shared limiter. Prefer Upstash → Postgres → memory (dev only). */
export async function checkRateLimitAsync(key: string): Promise<boolean> {
  try {
    const up = await checkUpstash(key);
    if (up !== null) return up;
  } catch {
    /* fall through */
  }
  try {
    const pg = await checkPostgres(key);
    if (pg !== null) return pg;
  } catch {
    /* fall through */
  }
  if (process.env.NODE_ENV === "production") {
    // Fail closed-ish: allow small burst via memory but log
    console.warn("[rateLimit] falling back to memory in production");
  }
  return checkMemory(key);
}

/** @deprecated sync wrapper — prefer checkRateLimitAsync */
export function checkRateLimit(key: string): boolean {
  return checkMemory(key);
}

export function buildRateLimitKey(
  ip: string,
  keyFingerprint: string,
  sessionId?: string
): string {
  const parts = [ip || "unknown", keyFingerprint || "anon"];
  if (sessionId) parts.push(sessionId.slice(0, 64));
  return parts.join(":");
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
