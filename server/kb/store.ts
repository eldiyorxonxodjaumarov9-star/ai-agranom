import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { KnowledgeChunk, SourceRecord } from "./types";
import { SEED_CHUNKS, SEED_SOURCES } from "./seed";

const DATA_DIR = join(process.cwd(), "data", "kb");
const CHUNKS_FILE = join(DATA_DIR, "chunks.json");
const SOURCES_FILE = join(DATA_DIR, "sources.json");
const EMBEDDINGS_FILE = join(DATA_DIR, "embeddings.json");

export type EmbeddingMap = Record<string, number[]>;

/** In-memory overlay for serverless (Vercel) where disk may be read-only. */
let memoryChunks: KnowledgeChunk[] | null = null;
let memorySources: SourceRecord[] | null = null;
let memoryEmbeddings: EmbeddingMap | null = null;

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
    if (!existsSync(file)) return fallback;
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): boolean {
  try {
    if (!ensureDir()) return false;
    writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

export function contentChecksum(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function mergeWithSeeds(stored: KnowledgeChunk[]): KnowledgeChunk[] {
  const byId = new Map<string, KnowledgeChunk>();
  for (const c of SEED_CHUNKS) byId.set(c.id, c);
  for (const c of stored) {
    if (!byId.has(c.id) || c.version >= (byId.get(c.id)?.version ?? 0)) {
      byId.set(c.id, c);
    }
  }
  return Array.from(byId.values());
}

/** Load VERIFIED(+imported) chunks. Seeds always available as baseline. */
export function loadChunks(): KnowledgeChunk[] {
  if (memoryChunks) return memoryChunks;

  const stored = readJson<KnowledgeChunk[]>(CHUNKS_FILE, []);
  if (stored.length === 0) {
    writeJson(CHUNKS_FILE, SEED_CHUNKS);
    writeJson(SOURCES_FILE, SEED_SOURCES);
    memoryChunks = [...SEED_CHUNKS];
    return memoryChunks;
  }

  memoryChunks = mergeWithSeeds(stored);
  return memoryChunks;
}

export function loadSources(): SourceRecord[] {
  if (memorySources) return memorySources;

  const stored = readJson<SourceRecord[]>(SOURCES_FILE, []);
  if (stored.length === 0) {
    writeJson(SOURCES_FILE, SEED_SOURCES);
    memorySources = [...SEED_SOURCES];
    return memorySources;
  }
  const byId = new Map<string, SourceRecord>();
  for (const s of SEED_SOURCES) byId.set(s.id, s);
  for (const s of stored) byId.set(s.id, s);
  memorySources = Array.from(byId.values());
  return memorySources;
}

export function saveChunks(chunks: KnowledgeChunk[]): void {
  memoryChunks = chunks;
  writeJson(CHUNKS_FILE, chunks);
}

export function saveSources(sources: SourceRecord[]): void {
  memorySources = sources;
  writeJson(SOURCES_FILE, sources);
}

export function loadEmbeddings(): EmbeddingMap {
  if (memoryEmbeddings) return memoryEmbeddings;
  memoryEmbeddings = readJson<EmbeddingMap>(EMBEDDINGS_FILE, {});
  return memoryEmbeddings;
}

export function saveEmbeddings(map: EmbeddingMap): void {
  memoryEmbeddings = map;
  writeJson(EMBEDDINGS_FILE, map);
}

/** Drop cached vectors for chunk ids (content changed). */
export function invalidateEmbeddings(chunkIds: string[]): void {
  if (chunkIds.length === 0) return;
  const map = loadEmbeddings();
  let changed = false;
  for (const id of chunkIds) {
    if (map[id]) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) saveEmbeddings(map);
}

export function upsertChunks(incoming: KnowledgeChunk[]): {
  added: number;
  updated: number;
  skipped: number;
} {
  const existing = loadChunks();
  const byId = new Map(existing.map((c) => [c.id, c]));
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const invalidated: string[] = [];

  for (const chunk of incoming) {
    const prev = byId.get(chunk.id);
    if (!prev) {
      byId.set(chunk.id, chunk);
      added++;
      continue;
    }
    if (prev.checksum === chunk.checksum) {
      skipped++;
      continue;
    }
    byId.set(chunk.id, {
      ...chunk,
      version: prev.version + 1,
      updatedAt: new Date().toISOString(),
    });
    invalidated.push(chunk.id);
    updated++;
  }

  invalidateEmbeddings(invalidated);
  saveChunks(Array.from(byId.values()));
  return { added, updated, skipped };
}

export function getVerifiedChunks(): KnowledgeChunk[] {
  return loadChunks().filter(
    (c) =>
      c.status === "VERIFIED" &&
      !c.deletedAt &&
      (c.qualityScore == null || c.qualityScore >= 60)
  );
}

/** Test helper: clear in-memory overlay */
export function resetKbMemory(): void {
  memoryChunks = null;
  memorySources = null;
  memoryEmbeddings = null;
}
