import { createHash } from "crypto";
import type { FetchCacheEntry } from "./types";
import {
  loadFetchCache,
  saveFetchCache,
} from "../sync/persist";

const DEFAULT_UA =
  "AgroOlamKnowledgeBot/1.0 (+https://ai-agranom.vercel.app; research; respect-robots)";

export class HttpFetchError extends Error {
  constructor(
    message: string,
    public status?: number,
    public retryable = false
  ) {
    super(message);
    this.name = "HttpFetchError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function sha16(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/**
 * Conditional GET with ETag / Last-Modified, timeout, retry, crawl delay.
 * Never used for Google SERP scraping — only allowlisted official URLs.
 */
export async function fetchWithPolicy(
  url: string,
  options?: {
    crawlDelayMs?: number;
    timeoutMs?: number;
    retries?: number;
    method?: "GET" | "HEAD";
  }
): Promise<{
  ok: boolean;
  status: number;
  body: string;
  etag?: string;
  lastModified?: string;
  unchanged: boolean;
  checksum: string;
}> {
  const crawlDelayMs = options?.crawlDelayMs ?? 3000;
  const timeoutMs = options?.timeoutMs ?? 15000;
  const retries = options?.retries ?? 2;
  const method = options?.method ?? "GET";

  if (crawlDelayMs > 0) await sleep(crawlDelayMs);

  const cache = loadFetchCache();
  const prev = cache[url];

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(500 * Math.pow(2, attempt));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        "User-Agent": DEFAULT_UA,
        Accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.8",
      };
      if (prev?.etag) headers["If-None-Match"] = prev.etag;
      if (prev?.lastModified) headers["If-Modified-Since"] = prev.lastModified;

      const res = await fetch(url, {
        method,
        headers,
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timer);

      if (res.status === 304 && prev) {
        return {
          ok: true,
          status: 304,
          body: "",
          etag: prev.etag,
          lastModified: prev.lastModified,
          unchanged: true,
          checksum: prev.checksum,
        };
      }

      if (res.status === 429 || res.status >= 500) {
        throw new HttpFetchError(`HTTP ${res.status}`, res.status, true);
      }

      if (!res.ok) {
        throw new HttpFetchError(`HTTP ${res.status}`, res.status, false);
      }

      const body = method === "HEAD" ? "" : await res.text();
      const etag = res.headers.get("etag") || undefined;
      const lastModified = res.headers.get("last-modified") || undefined;
      const checksum = sha16(body || `${etag || ""}:${lastModified || ""}:${url}`);

      const entry: FetchCacheEntry = {
        url,
        etag,
        lastModified,
        checksum,
        accessedAt: new Date().toISOString(),
        statusCode: res.status,
      };
      cache[url] = entry;
      saveFetchCache(cache);

      const unchanged = Boolean(prev && prev.checksum === checksum);

      return {
        ok: true,
        status: res.status,
        body,
        etag,
        lastModified,
        unchanged,
        checksum,
      };
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));
      const retryable =
        err instanceof HttpFetchError
          ? err.retryable
          : lastError.name === "AbortError" || /network|fetch/i.test(lastError.message);
      if (!retryable || attempt === retries) break;
    }
  }

  throw lastError || new HttpFetchError("fetch failed");
}

/** Lightweight robots.txt check — disallow path → skip live fetch. */
export async function isPathAllowedByRobots(
  baseUrl: string,
  path: string
): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": DEFAULT_UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return true; // fail-open cautiously for missing robots
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    let applies = false;
    const disallows: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      if (/^user-agent:\s*\*/i.test(t)) {
        applies = true;
        continue;
      }
      if (/^user-agent:/i.test(t)) {
        applies = false;
        continue;
      }
      if (applies) {
        const m = t.match(/^disallow:\s*(.*)$/i);
        if (m) disallows.push(m[1].trim());
      }
    }
    return !disallows.some((d) => d && path.startsWith(d));
  } catch {
    return true;
  }
}
