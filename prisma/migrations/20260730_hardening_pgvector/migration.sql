-- Additive hardening: pgvector column, ANN index, RAG indexes, session/rate tables.
-- Does not drop or rewrite existing KnowledgeChunkRow data.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Native embedding column (OpenAI text-embedding-3-small = 1536 dims)
ALTER TABLE "KnowledgeChunkRow"
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Backfill from embeddingJson float arrays and wrapped {v:[...]} forms
UPDATE "KnowledgeChunkRow" kc
SET embedding = (
  CASE
    WHEN jsonb_typeof(kc."embeddingJson"::jsonb) = 'array' THEN (
      SELECT ('[' || string_agg(val::text, ',') || ']')::vector
      FROM jsonb_array_elements_text(kc."embeddingJson"::jsonb) AS t(val)
    )
    WHEN jsonb_typeof(kc."embeddingJson"::jsonb -> 'v') = 'array' THEN (
      SELECT ('[' || string_agg(val::text, ',') || ']')::vector
      FROM jsonb_array_elements_text(kc."embeddingJson"::jsonb -> 'v') AS t(val)
    )
    ELSE NULL
  END
)
WHERE kc."embeddingJson" IS NOT NULL
  AND kc.embedding IS NULL;

CREATE INDEX IF NOT EXISTS knowledge_chunk_embedding_hnsw
  ON "KnowledgeChunkRow"
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL AND "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS knowledge_chunk_rag_pred
  ON "KnowledgeChunkRow" ("status", "deletedAt", "qualityScore", language);

CREATE INDEX IF NOT EXISTS knowledge_chunk_title_trgm
  ON "KnowledgeChunkRow" USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS knowledge_chunk_content_trgm
  ON "KnowledgeChunkRow" USING gin (content gin_trgm_ops);

CREATE TABLE IF NOT EXISTS "ChatSession" (
  id TEXT PRIMARY KEY,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS chat_session_expires ON "ChatSession" ("expiresAt");

CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMPTZ NOT NULL
);
