/**
 * Knowledge Base public API — Phase 1.
 */
export { SOURCE_REGISTRY, getAllowedSources, getSourceById } from "./source-registry";
export { SEED_CHUNKS, SEED_SOURCES } from "./seed";
export {
  loadChunks,
  loadSources,
  getVerifiedChunks,
  upsertChunks,
} from "./store";
export { retrieveKnowledge } from "./retrieve";
export {
  KnowledgeRagProvider,
  getLastRagResult,
  retrieveContextWithMeta,
} from "./provider";
export { ingestJsonFile, ingestCsvFile, ingestJsonItems } from "./ingest";
export type { IngestChunkInput } from "./ingest";
export type * from "./types";
