import { getOpenAIClient } from "@/server/services/openaiClient";
import type { KnowledgeChunk } from "./types";
import {
  getVerifiedChunks,
  loadEmbeddings,
  saveEmbeddings,
  type EmbeddingMap,
} from "./store";

const EMBED_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function embedText(chunk: KnowledgeChunk): string {
  return `${chunk.title}\n${chunk.content}\n${chunk.keywords.join(" ")}`;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getOpenAIClient();
  const res = await client.embeddings.create({
    model: EMBED_MODEL,
    input: texts,
  });
  return res.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding as number[]);
}

/** Ensure verified chunks have embeddings cached on disk. */
export async function ensureChunkEmbeddings(
  chunks: KnowledgeChunk[] = getVerifiedChunks()
): Promise<EmbeddingMap> {
  const map = loadEmbeddings();
  const missing = chunks.filter((c) => !map[c.id] || map[c.id].length === 0);
  if (missing.length === 0) return map;

  try {
    const vectors = await embedTexts(missing.map(embedText));
    missing.forEach((c, i) => {
      map[c.id] = vectors[i];
    });
    saveEmbeddings(map);
  } catch (err) {
    console.warn(
      "[kb] embedding failed, falling back to keyword retrieval:",
      err instanceof Error ? err.message : err
    );
  }
  return map;
}
