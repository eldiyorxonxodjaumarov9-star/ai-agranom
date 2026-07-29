/**
 * In-process import queue for Vercel (no Redis required).
 * Durable progress when Postgres available later; memory+JSON otherwise.
 * Never run multi-hour crawls inside a single HTTP request — enqueue batches.
 */
import { createHash } from "crypto";
import {
  appendSyncJob,
  loadSyncJobs,
  updateSyncJob,
} from "./persist";
import type { SyncJobKind, SyncJobRecord } from "../adapters/types";
import { runSyncJob } from "./runner";

export interface ImportProgress {
  discovered: number;
  downloaded: number;
  parsed: number;
  validated: number;
  inserted: number;
  updated: number;
  skipped: number;
  duplicates: number;
  conflicts: number;
  failed: number;
}

export interface ImportQueueItem {
  id: string;
  kind: SyncJobKind;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  progress: ImportProgress;
  idempotencyKey: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  jobId?: string;
}

const queue: ImportQueueItem[] = [];
const inflight = new Set<string>();
let processing = false;

function emptyProgress(): ImportProgress {
  return {
    discovered: 0,
    downloaded: 0,
    parsed: 0,
    validated: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    duplicates: 0,
    conflicts: 0,
    failed: 0,
  };
}

export function enqueueImport(options: {
  kind: SyncJobKind;
  idempotencyKey?: string;
}): ImportQueueItem {
  const idempotencyKey =
    options.idempotencyKey ||
    `imp-${options.kind}-${new Date().toISOString().slice(0, 13)}`;

  const existing = queue.find(
    (q) =>
      q.idempotencyKey === idempotencyKey &&
      (q.status === "queued" || q.status === "running")
  );
  if (existing) return existing;

  const item: ImportQueueItem = {
    id: `q-${createHash("sha256").update(`${idempotencyKey}:${Date.now()}`).digest("hex").slice(0, 10)}`,
    kind: options.kind,
    status: "queued",
    createdAt: new Date().toISOString(),
    progress: emptyProgress(),
    idempotencyKey,
    attempts: 0,
    maxAttempts: 3,
  };
  queue.push(item);
  void processQueue();
  return item;
}

export function getImportQueue(): ImportQueueItem[] {
  return queue.slice(-100);
}

export function cancelImport(id: string): boolean {
  const item = queue.find((q) => q.id === id);
  if (!item || item.status === "running") return false;
  item.status = "cancelled";
  return true;
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (true) {
      const next = queue.find((q) => q.status === "queued");
      if (!next) break;
      if (inflight.has(next.idempotencyKey)) {
        next.status = "cancelled";
        next.lastError = "duplicate idempotency key in flight";
        continue;
      }

      next.status = "running";
      next.startedAt = new Date().toISOString();
      next.attempts++;
      inflight.add(next.idempotencyKey);

      try {
        const job: SyncJobRecord = await runSyncJob({
          kind: next.kind,
          triggeredBy: "manual",
        });
        next.jobId = job.id;
        next.progress = {
          discovered: job.imported + job.updated + job.skipped + job.failed,
          downloaded: job.imported + job.updated + job.skipped,
          parsed: job.imported + job.updated + job.skipped,
          validated: job.imported + job.updated + job.skipped,
          inserted: job.imported,
          updated: job.updated,
          skipped: job.skipped,
          duplicates: job.duplicatesMerged,
          conflicts: job.conflicts,
          failed: job.failed,
        };
        next.status = job.status === "failed" ? "failed" : "succeeded";
        next.finishedAt = new Date().toISOString();
        if (job.errors.length) next.lastError = job.errors[0];
      } catch (err) {
        next.lastError = err instanceof Error ? err.message : String(err);
        if (next.attempts < next.maxAttempts) {
          next.status = "queued";
          // exponential backoff
          await new Promise((r) =>
            setTimeout(r, 500 * Math.pow(2, next.attempts))
          );
        } else {
          next.status = "failed";
          next.finishedAt = new Date().toISOString();
        }
      } finally {
        inflight.delete(next.idempotencyKey);
      }
    }
  } finally {
    processing = false;
  }
}

export function listRecentJobs(): SyncJobRecord[] {
  return loadSyncJobs().slice(-50).reverse();
}

/** Keep appendSyncJob import used for typing side-effects in tests */
export { appendSyncJob, updateSyncJob };
