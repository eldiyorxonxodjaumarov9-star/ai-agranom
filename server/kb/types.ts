/**
 * Knowledge Base domain types — Phase 1.
 * Prisma/Postgres mapping lives in prisma/schema.prisma for Phase 2+.
 */

export type KbStatus =
  | "DRAFT"
  | "AI_PARSED"
  | "NEEDS_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "ARCHIVED";

export type SourceType =
  | "official_database"
  | "university_extension"
  | "peer_reviewed"
  | "product_label"
  | "open_dataset"
  | "internal_catalog"
  | "pdf_document";

export type EntityType =
  | "crop"
  | "disease"
  | "pest"
  | "symptom"
  | "treatment"
  | "product"
  | "nutrient"
  | "irrigation"
  | "soil"
  | "general";

export interface SourceRegistryEntry {
  id: string;
  name: string;
  baseUrl: string;
  sourceType: SourceType;
  license: string;
  allowedForIngestion: boolean;
  crawlDelayMs: number;
  lastCheckedAt: string;
  enabled: boolean;
  notes?: string;
}

export interface SourceRecord {
  id: string;
  title: string;
  organization: string;
  url: string;
  publishedAt?: string;
  accessedAt: string;
  license: string;
  reliabilityScore: number;
  checksum?: string;
  registryId?: string;
}

export interface KnowledgeChunk {
  id: string;
  entityType: EntityType;
  entityId: string;
  language: "uz" | "ru" | "kk" | "ky" | "en";
  title: string;
  content: string;
  keywords: string[];
  cropIds?: string[];
  plantParts?: string[];
  regions?: string[];
  embedding?: number[];
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  organization: string;
  reliabilityScore: number;
  /** 0–100 composite quality for RAG gating */
  qualityScore?: number;
  status: KbStatus;
  version: number;
  updatedAt: string;
  checksum: string;
  deletedAt?: string | null;
}

export interface RetrievedChunk extends KnowledgeChunk {
  score: number;
  vectorScore?: number;
  keywordScore?: number;
}

export interface RagCitation {
  organization: string;
  title: string;
  url: string;
  updatedAt?: string;
  accessedAt?: string;
}

export interface RagRetrievalResult {
  contextText: string;
  chunks: RetrievedChunk[];
  sources: RagCitation[];
  confidence: number;
}
