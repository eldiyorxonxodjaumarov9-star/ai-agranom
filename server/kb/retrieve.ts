import type {
  KnowledgeChunk,
  RagCitation,
  RagRetrievalResult,
  RetrievedChunk,
} from "./types";
import { getVerifiedChunks } from "./store";
import { cosineSimilarity, ensureChunkEmbeddings } from "./embeddings";
import { searchChunksInDb } from "./db/chunks";
import { isDatabaseConfigured } from "./db/client";

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9а-яёәғқңөұүһіўқғ\s'-]+/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function keywordScore(chunk: KnowledgeChunk, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const hay = `${chunk.title} ${chunk.content} ${chunk.keywords.join(" ")}`.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (hay.includes(t)) score += 1;
    if (chunk.keywords.some((k) => k.toLowerCase().includes(t))) score += 1.5;
    if (chunk.title.toLowerCase().includes(t)) score += 1;
  }
  return score;
}

function toCitation(chunk: KnowledgeChunk): RagCitation {
  return {
    organization: chunk.organization,
    title: chunk.sourceTitle || chunk.title,
    url: chunk.sourceUrl,
    updatedAt: chunk.updatedAt,
    accessedAt: chunk.updatedAt,
  };
}

function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return [
      "VERIFIED_KB: no high-confidence chunks matched.",
      "If evidence is insufficient, say diagnosis is not certain and ask clarifying questions.",
      "Never invent dosages or unregistered products.",
      "Recommend marketplace products only if VERIFIED + ACTIVE + labelVerified.",
    ].join("\n");
  }

  return chunks
    .map((c, i) => {
      return [
        `[KB#${i + 1} | ${c.entityType} | reliability=${c.reliabilityScore.toFixed(2)} | quality=${c.qualityScore ?? "n/a"} | score=${c.score.toFixed(3)}]`,
        `Title: ${c.title}`,
        `Source: ${c.organization} — ${c.sourceTitle}`,
        `URL: ${c.sourceUrl}`,
        `Content: ${c.content}`,
      ].join("\n");
    })
    .join("\n\n");
}

function rankChunks(
  query: string,
  chunks: KnowledgeChunk[],
  tokens: string[],
  embeddings: Record<string, number[]>,
  queryVec: number[] | null,
  options?: { limit?: number; language?: string; cropHint?: string }
): RagRetrievalResult {
  const limit = options?.limit ?? 8;

  const scored: RetrievedChunk[] = chunks.map((chunk) => {
    const kw = keywordScore(chunk, tokens);
    let vec = 0;
    if (queryVec && embeddings[chunk.id]) {
      vec = cosineSimilarity(queryVec, embeddings[chunk.id]);
    }

    let score = kw * 0.3 + vec * 0.5 + chunk.reliabilityScore * 0.1;
    if (typeof chunk.qualityScore === "number") {
      score += (chunk.qualityScore / 100) * 0.1;
    }

    if (options?.language && chunk.language === options.language) score += 0.05;
    if (
      options?.cropHint &&
      chunk.cropIds?.some((id) =>
        options.cropHint!.toLowerCase().includes(id.toLowerCase())
      )
    ) {
      score += 0.08;
    }

    if (
      /[A-Z][a-z]+ [a-z]+/.test(query) &&
      chunk.keywords.some((k) => query.toLowerCase().includes(k.toLowerCase()))
    ) {
      score += 0.06;
    }

    // EPPO-like codes
    if (/\b[A-Z]{4,6}\b/.test(query) && chunk.keywords.some((k) => query.includes(k))) {
      score += 0.08;
    }

    const hasCyr = /[а-яёәғқңөұүһі]/i.test(query);
    if (hasCyr && (chunk.language === "ru" || chunk.language === "kk" || chunk.language === "ky")) {
      score += 0.03;
    }

    return {
      ...chunk,
      keywordScore: kw,
      vectorScore: vec,
      score,
    };
  });

  const top = scored
    .filter(
      (c) =>
        (c.qualityScore == null || c.qualityScore >= 70) &&
        (c.score > 0.12 || (c.keywordScore ?? 0) > 0)
    )
    .sort((a, b) => {
      const qa = (a.qualityScore ?? 70) / 100;
      const qb = (b.qualityScore ?? 70) / 100;
      return b.score * 0.85 + qb * 0.15 - (a.score * 0.85 + qa * 0.15);
    })
    .slice(0, limit);

  const sourceMap = new Map<string, RagCitation>();
  for (const c of top) {
    sourceMap.set(c.sourceId, toCitation(c));
  }

  const confidence =
    top.length === 0
      ? 0
      : Math.min(
          0.95,
          top[0].score * 0.7 +
            (top.reduce((s, c) => s + c.reliabilityScore, 0) / top.length) * 0.3
        );

  return {
    contextText: formatContext(top),
    chunks: top,
    sources: Array.from(sourceMap.values()),
    confidence,
  };
}

/**
 * Database-first hybrid retrieval with corpus emergency fallback.
 */
export async function retrieveKnowledge(
  query: string,
  options?: { limit?: number; language?: string; cropHint?: string }
): Promise<RagRetrievalResult> {
  const tokens = tokenize(query);

  let chunks: KnowledgeChunk[] | null = null;
  if (isDatabaseConfigured()) {
    chunks = await searchChunksInDb(query, {
      limit: 80,
      language: options?.language,
      cropHint: options?.cropHint,
    });
  }

  const usingDb = Boolean(chunks && chunks.length > 0);
  if (!usingDb) {
    chunks = getVerifiedChunks();
  }

  const embeddings = await ensureChunkEmbeddings(chunks!);

  let queryVec: number[] | null = null;
  try {
    if (Object.keys(embeddings).length > 0) {
      const { embedTexts } = await import("./embeddings");
      const [v] = await embedTexts([query]);
      queryVec = v;
    }
  } catch {
    queryVec = null;
  }

  return rankChunks(query, chunks!, tokens, embeddings, queryVec, options);
}
