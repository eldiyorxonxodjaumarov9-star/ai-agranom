/**
 * Phase 2 domain extensions — adapters, sync, dedup, conflicts.
 */
import type { EntityType, KbStatus, KnowledgeChunk } from "../types";

export type SyncJobKind =
  | "diseases"
  | "pests"
  | "product_registry"
  | "broken_links"
  | "full";

export type SyncJobStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "partial";

export interface SyncJobRecord {
  id: string;
  kind: SyncJobKind;
  adapterIds: string[];
  status: SyncJobStatus;
  startedAt: string;
  finishedAt?: string;
  imported: number;
  updated: number;
  skipped: number;
  duplicatesMerged: number;
  conflicts: number;
  failed: number;
  errors: string[];
  triggeredBy: "cron" | "manual" | "test";
}

export interface FailedImportRecord {
  id: string;
  adapterId: string;
  externalId: string;
  url?: string;
  error: string;
  createdAt: string;
  retryCount: number;
}

export interface ConflictRecord {
  id: string;
  entityType: EntityType;
  canonicalEntityId: string;
  conflictingEntityIds: string[];
  reason: string;
  fields: string[];
  status: "pending" | "resolved" | "rejected";
  createdAt: string;
  sources: string[];
}

export interface CanonicalEntity {
  id: string;
  entityType: EntityType;
  scientificName?: string;
  eppoCode?: string;
  synonyms: string[];
  commonNames: Partial<Record<"uz" | "ru" | "kk" | "ky" | "en", string>>;
  aliases: string[];
  sourceIds: string[];
  chunkIds: string[];
  reliabilityScore: number;
  updatedAt: string;
}

export interface FetchCacheEntry {
  url: string;
  etag?: string;
  lastModified?: string;
  checksum: string;
  accessedAt: string;
  statusCode?: number;
}

export interface AdapterIndexItem {
  externalId: string;
  url: string;
  title: string;
  entityType: EntityType;
  updatedAt?: string;
}

export interface AdapterRawItem {
  externalId: string;
  url: string;
  title: string;
  body: string;
  entityType: EntityType;
  language?: KnowledgeChunk["language"];
  scientificName?: string;
  eppoCode?: string;
  synonyms?: string[];
  commonNames?: Partial<Record<"uz" | "ru" | "kk" | "ky" | "en", string>>;
  cropIds?: string[];
  keywords?: string[];
  publishedAt?: string;
  license?: string;
  etag?: string;
  lastModified?: string;
  unchanged?: boolean;
}

export interface NormalizedAdapterItem {
  entityType: EntityType;
  entityId: string;
  language: KnowledgeChunk["language"];
  title: string;
  content: string;
  keywords: string[];
  cropIds?: string[];
  scientificName?: string;
  eppoCode?: string;
  synonyms: string[];
  commonNames: Partial<Record<"uz" | "ru" | "kk" | "ky" | "en", string>>;
  sourceRegistryId: string;
  sourceUrl: string;
  sourceTitle: string;
  organization: string;
  reliabilityScore: number;
  license: string;
  publishedAt?: string;
  accessedAt: string;
  checksum: string;
  status: KbStatus;
  etag?: string;
  lastModified?: string;
}

export interface AdapterRunResult {
  adapterId: string;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  duplicatesMerged: number;
  conflicts: number;
  errors: string[];
  chunkIds: string[];
}

export interface SourceAdapter {
  readonly id: string;
  fetchIndex(): Promise<AdapterIndexItem[]>;
  fetchItem(item: AdapterIndexItem): Promise<AdapterRawItem | null>;
  parseItem(raw: AdapterRawItem): AdapterRawItem;
  normalizeItem(parsed: AdapterRawItem): NormalizedAdapterItem | null;
  validateItem(item: NormalizedAdapterItem): boolean;
  saveItem(item: NormalizedAdapterItem): Promise<"added" | "updated" | "skipped">;
  run(): Promise<AdapterRunResult>;
}
