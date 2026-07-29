import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type {
  CanonicalEntity,
  ConflictRecord,
  FailedImportRecord,
  FetchCacheEntry,
  SyncJobRecord,
} from "../adapters/types";

const DATA_DIR = join(process.cwd(), "data", "kb");

let memJobs: SyncJobRecord[] | null = null;
let memFailed: FailedImportRecord[] | null = null;
let memConflicts: ConflictRecord[] | null = null;
let memCanonical: CanonicalEntity[] | null = null;
let memCache: Record<string, FetchCacheEntry> | null = null;

function ensureDir(): boolean {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

function readJson<T>(file: string, fallback: T): T {
  try {
    const p = join(DATA_DIR, file);
    if (!existsSync(p)) return fallback;
    return JSON.parse(readFileSync(p, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  try {
    if (!ensureDir()) return;
    writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2), "utf8");
  } catch {
    /* serverless read-only */
  }
}

export function loadSyncJobs(): SyncJobRecord[] {
  if (memJobs) return memJobs;
  memJobs = readJson<SyncJobRecord[]>("sync-jobs.json", []);
  return memJobs;
}

export function saveSyncJobs(jobs: SyncJobRecord[]): void {
  memJobs = jobs.slice(-200);
  writeJson("sync-jobs.json", memJobs);
}

export function appendSyncJob(job: SyncJobRecord): void {
  const jobs = loadSyncJobs();
  jobs.push(job);
  saveSyncJobs(jobs);
}

export function updateSyncJob(id: string, patch: Partial<SyncJobRecord>): SyncJobRecord | null {
  const jobs = loadSyncJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx < 0) return null;
  jobs[idx] = { ...jobs[idx], ...patch };
  saveSyncJobs(jobs);
  return jobs[idx];
}

export function loadFailedImports(): FailedImportRecord[] {
  if (memFailed) return memFailed;
  memFailed = readJson<FailedImportRecord[]>("failed-imports.json", []);
  return memFailed;
}

export function saveFailedImports(rows: FailedImportRecord[]): void {
  memFailed = rows.slice(-500);
  writeJson("failed-imports.json", memFailed);
}

export function recordFailedImport(input: {
  adapterId: string;
  externalId: string;
  url?: string;
  error: string;
}): void {
  const rows = loadFailedImports();
  rows.push({
    id: `fail-${createHash("sha256")
      .update(`${input.adapterId}:${input.externalId}:${Date.now()}`)
      .digest("hex")
      .slice(0, 10)}`,
    adapterId: input.adapterId,
    externalId: input.externalId,
    url: input.url,
    error: input.error,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
  saveFailedImports(rows);
}

export function loadConflicts(): ConflictRecord[] {
  if (memConflicts) return memConflicts;
  memConflicts = readJson<ConflictRecord[]>("conflicts.json", []);
  return memConflicts;
}

export function saveConflicts(rows: ConflictRecord[]): void {
  memConflicts = rows;
  writeJson("conflicts.json", rows);
}

export function loadCanonicalEntities(): CanonicalEntity[] {
  if (memCanonical) return memCanonical;
  memCanonical = readJson<CanonicalEntity[]>("canonical-entities.json", []);
  return memCanonical;
}

export function saveCanonicalEntities(rows: CanonicalEntity[]): void {
  memCanonical = rows;
  writeJson("canonical-entities.json", rows);
}

export function loadFetchCache(): Record<string, FetchCacheEntry> {
  if (memCache) return memCache;
  memCache = readJson<Record<string, FetchCacheEntry>>("fetch-cache.json", {});
  return memCache;
}

export function saveFetchCache(map: Record<string, FetchCacheEntry>): void {
  memCache = map;
  writeJson("fetch-cache.json", map);
}

export function resetSyncMemory(): void {
  memJobs = null;
  memFailed = null;
  memConflicts = null;
  memCanonical = null;
  memCache = null;
}
