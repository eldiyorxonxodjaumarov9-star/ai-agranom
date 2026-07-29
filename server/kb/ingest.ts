import { createHash } from "crypto";
import { readFileSync } from "fs";
import type { EntityType, KnowledgeChunk, KbStatus } from "./types";
import { getSourceById } from "./source-registry";
import { contentChecksum, loadSources, saveSources, upsertChunks } from "./store";

export interface IngestChunkInput {
  id?: string;
  entityType: EntityType;
  entityId: string;
  language: KnowledgeChunk["language"];
  title: string;
  content: string;
  keywords?: string[];
  cropIds?: string[];
  plantParts?: string[];
  regions?: string[];
  sourceRegistryId: string;
  sourceUrl: string;
  sourceTitle: string;
  organization?: string;
  reliabilityScore?: number;
  status?: KbStatus;
}

function idFrom(input: IngestChunkInput): string {
  if (input.id) return input.id;
  const raw = `${input.entityType}:${input.entityId}:${input.language}:${input.title}`;
  return `chunk-${createHash("sha256").update(raw).digest("hex").slice(0, 12)}`;
}

export function normalizeIngestItem(input: IngestChunkInput): KnowledgeChunk | null {
  const registry = getSourceById(input.sourceRegistryId);
  if (!registry || !registry.allowedForIngestion || !registry.enabled) {
    return null;
  }
  if (!input.title?.trim() || !input.content?.trim()) return null;

  const status: KbStatus = input.status ?? "NEEDS_REVIEW";
  // Safety: treatment/product never auto-VERIFIED on import
  const safeStatus =
    (input.entityType === "treatment" || input.entityType === "product") &&
    status === "VERIFIED"
      ? "NEEDS_REVIEW"
      : status;

  return {
    id: idFrom(input),
    entityType: input.entityType,
    entityId: input.entityId,
    language: input.language,
    title: input.title.trim(),
    content: input.content.trim(),
    keywords: input.keywords ?? [],
    cropIds: input.cropIds,
    plantParts: input.plantParts,
    regions: input.regions,
    sourceId: `src-${input.sourceRegistryId}-${contentChecksum(input.sourceUrl)}`,
    sourceUrl: input.sourceUrl,
    sourceTitle: input.sourceTitle,
    organization: input.organization || registry.name,
    reliabilityScore: input.reliabilityScore ?? 0.7,
    status: safeStatus,
    version: 1,
    updatedAt: new Date().toISOString(),
    checksum: contentChecksum(input.content.trim()),
  };
}

export function ingestJsonItems(items: IngestChunkInput[]): {
  added: number;
  updated: number;
  skipped: number;
  rejected: number;
} {
  const prepared: KnowledgeChunk[] = [];
  let rejected = 0;
  for (const item of items) {
    const n = normalizeIngestItem(item);
    if (!n) {
      rejected++;
      continue;
    }
    prepared.push(n);

    const sources = loadSources();
    if (!sources.some((s) => s.id === n.sourceId)) {
      sources.push({
        id: n.sourceId,
        title: n.sourceTitle,
        organization: n.organization,
        url: n.sourceUrl,
        accessedAt: new Date().toISOString().slice(0, 10),
        license: getSourceById(item.sourceRegistryId)?.license || "verify",
        reliabilityScore: n.reliabilityScore,
        registryId: item.sourceRegistryId,
        checksum: n.checksum,
      });
      saveSources(sources);
    }
  }

  const result = upsertChunks(prepared);
  return { ...result, rejected };
}

export function ingestJsonFile(filePath: string) {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as
    | IngestChunkInput[]
    | { chunks: IngestChunkInput[] };
  const items = Array.isArray(raw) ? raw : raw.chunks;
  return ingestJsonItems(items);
}

/** Minimal CSV: id,entityType,entityId,language,title,content,keywords,sourceRegistryId,sourceUrl,sourceTitle,status */
export function ingestCsvFile(filePath: string) {
  const text = readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { added: 0, updated: 0, skipped: 0, rejected: 0 };
  const header = lines[0].split(",").map((h) => h.trim());
  const items: IngestChunkInput[] = [];

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    items.push({
      id: row.id || undefined,
      entityType: row.entityType as EntityType,
      entityId: row.entityId,
      language: row.language as KnowledgeChunk["language"],
      title: row.title,
      content: row.content,
      keywords: row.keywords ? row.keywords.split("|").map((k) => k.trim()) : [],
      sourceRegistryId: row.sourceRegistryId,
      sourceUrl: row.sourceUrl,
      sourceTitle: row.sourceTitle,
      status: (row.status as KbStatus) || "NEEDS_REVIEW",
    });
  }

  return ingestJsonItems(items);
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}
