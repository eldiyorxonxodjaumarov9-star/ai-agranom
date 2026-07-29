/**
 * Knowledge Base public API — Phase 1 + Phase 2.
 */
export { SOURCE_REGISTRY, getAllowedSources, getSourceById } from "./source-registry";
export { SEED_CHUNKS, SEED_SOURCES } from "./seed";
export {
  loadChunks,
  loadSources,
  getVerifiedChunks,
  upsertChunks,
  contentChecksum,
  resetKbMemory,
  invalidateEmbeddings,
} from "./store";
export { retrieveKnowledge } from "./retrieve";
export {
  KnowledgeRagProvider,
  getLastRagResult,
  retrieveContextWithMeta,
} from "./provider";
export { ingestJsonFile, ingestCsvFile, ingestJsonItems } from "./ingest";
export type { IngestChunkInput } from "./ingest";
export { getAllAdapters, getAdapterById } from "./adapters";
export { runSyncJob, CRON_SCHEDULE, adaptersForKind } from "./sync/runner";
export { deduplicateChunks, getPendingConflicts } from "./dedup";
export { buildCorpusChunks, corpusStats } from "./corpus/build";
export { CROPS } from "./corpus/crops";
export { DISEASES } from "./corpus/diseases";
export { PESTS } from "./corpus/pests";
export { enqueueImport, getImportQueue } from "./sync/queue";
export type * from "./types";
