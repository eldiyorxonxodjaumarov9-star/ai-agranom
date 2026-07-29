import { createHash } from "crypto";
import { getAllAdapters, getAdapterById } from "../adapters";
import type { AdapterRunResult } from "../adapters/types";
import type { SyncJobKind, SyncJobRecord } from "../adapters/types";
import { deduplicateChunks } from "../dedup";
import { loadChunks } from "../store";
import { appendSyncJob, updateSyncJob, loadFetchCache, saveFetchCache } from "./persist";
import { fetchWithPolicy } from "../adapters/http";

const KIND_ADAPTERS: Record<Exclude<SyncJobKind, "full" | "broken_links">, string[]> = {
  diseases: ["eppo", "fao", "usda-nifa"],
  pests: ["eppo", "fao"],
  product_registry: ["kz-ppp-registry"],
};

export function adaptersForKind(kind: SyncJobKind): string[] {
  if (kind === "full") return getAllAdapters().map((a) => a.id);
  if (kind === "broken_links") return [];
  return KIND_ADAPTERS[kind] || [];
}

async function checkBrokenLinks(): Promise<{
  checked: number;
  broken: number;
  errors: string[];
}> {
  const chunks = loadChunks();
  const urls = Array.from(new Set(chunks.map((c) => c.sourceUrl).filter(Boolean)));
  let broken = 0;
  const errors: string[] = [];
  const cache = loadFetchCache();

  for (const url of urls.slice(0, 40)) {
    try {
      const res = await fetchWithPolicy(url, {
        crawlDelayMs: 500,
        timeoutMs: 10000,
        retries: 1,
        method: "HEAD",
      });
      if (!res.ok || res.status >= 400) {
        broken++;
        errors.push(`${url} → ${res.status}`);
      }
    } catch (err) {
      broken++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${url} → ${msg}`);
      cache[url] = {
        url,
        checksum: cache[url]?.checksum || "broken",
        accessedAt: new Date().toISOString(),
        statusCode: 0,
      };
    }
  }
  saveFetchCache(cache);
  return { checked: Math.min(urls.length, 40), broken, errors };
}

export async function runSyncJob(options: {
  kind: SyncJobKind;
  triggeredBy?: SyncJobRecord["triggeredBy"];
  adapterIds?: string[];
}): Promise<SyncJobRecord> {
  const kind = options.kind;
  const adapterIds =
    options.adapterIds?.length ? options.adapterIds : adaptersForKind(kind);
  const jobId = `sync-${createHash("sha256")
    .update(`${kind}:${Date.now()}`)
    .digest("hex")
    .slice(0, 10)}`;

  const job: SyncJobRecord = {
    id: jobId,
    kind,
    adapterIds,
    status: "running",
    startedAt: new Date().toISOString(),
    imported: 0,
    updated: 0,
    skipped: 0,
    duplicatesMerged: 0,
    conflicts: 0,
    failed: 0,
    errors: [],
    triggeredBy: options.triggeredBy || "manual",
  };
  appendSyncJob(job);

  try {
    if (kind === "broken_links") {
      const linkResult = await checkBrokenLinks();
      job.skipped = linkResult.checked - linkResult.broken;
      job.failed = linkResult.broken;
      job.errors = linkResult.errors.slice(0, 20);
      job.status = linkResult.broken > 0 ? "partial" : "succeeded";
      job.finishedAt = new Date().toISOString();
      updateSyncJob(jobId, job);
      return job;
    }

    const results: AdapterRunResult[] = [];
    for (const id of adapterIds) {
      const adapter = getAdapterById(id);
      if (!adapter) {
        job.failed++;
        job.errors.push(`Unknown adapter: ${id}`);
        continue;
      }
      // Filter by kind when running diseases/pests
      const result = await adapter.run();
      if (kind === "diseases") {
        // Adapter already imported mixed types; OK for Phase 2
      }
      results.push(result);
      job.imported += result.imported;
      job.updated += result.updated;
      job.skipped += result.skipped;
      job.failed += result.failed;
      job.errors.push(...result.errors.slice(0, 5));
    }

    const dedup = deduplicateChunks(loadChunks());
    job.duplicatesMerged = dedup.duplicatesMerged;
    job.conflicts = dedup.conflicts.filter((c) => c.status === "pending").length;

    job.status =
      job.failed > 0 && job.imported + job.updated === 0
        ? "failed"
        : job.failed > 0
          ? "partial"
          : "succeeded";
    job.finishedAt = new Date().toISOString();
    updateSyncJob(jobId, job);
    return job;
  } catch (err) {
    job.status = "failed";
    job.finishedAt = new Date().toISOString();
    job.errors.push(err instanceof Error ? err.message : String(err));
    updateSyncJob(jobId, job);
    return job;
  }
}

/** Cron schedule mapping (Vercel cron paths call these kinds). */
export const CRON_SCHEDULE = {
  diseases: "0 3 * * 1", // weekly Monday 03:00 UTC
  pests: "0 4 * * 1",
  product_registry: "0 2 * * *", // daily
  broken_links: "0 5 * * 0", // weekly Sunday
} as const;
