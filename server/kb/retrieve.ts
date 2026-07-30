import type {
  KnowledgeChunk,
  RagCitation,
  RagRetrievalResult,
  RetrievedChunk,
} from "./types";
import { getVerifiedChunks } from "./store";
import { cosineSimilarity } from "./embeddings";
import {
  searchChunksByVector,
  searchChunksInDb,
  searchExactScientificOrEppo,
} from "./db/chunks";
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
      "Recommend marketplace products only if VERIFIED + ACTIVE + labelVerified + crop/target/region match.",
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

function mergeUnique(chunks: KnowledgeChunk[]): KnowledgeChunk[] {
  const map = new Map<string, KnowledgeChunk>();
  for (const c of chunks) {
    if (!map.has(c.id)) map.set(c.id, c);
  }
  return Array.from(map.values());
}

function isEligibleForContext(c: KnowledgeChunk): boolean {
  if (c.status !== "VERIFIED") return false;
  if (typeof c.qualityScore === "number" && c.qualityScore < 70) return false;
  if (c.deletedAt) return false;
  return true;
}

function rankChunks(
  query: string,
  chunks: KnowledgeChunk[],
  tokens: string[],
  embeddings: Record<string, number[]>,
  queryVec: number[] | null,
  options?: { limit?: number; language?: string; cropHint?: string },
  retrievalModes: string[] = [],
  precomputedSim?: Record<string, number>
): RagRetrievalResult {
  const limit = options?.limit ?? 8;

  const scored: RetrievedChunk[] = chunks.filter(isEligibleForContext).map((chunk) => {
    const kw = keywordScore(chunk, tokens);
    let vec = 0;
    const pre = precomputedSim?.[chunk.id];
    if (typeof pre === "number") {
      vec = pre;
    } else {
      const emb = chunk.embedding || embeddings[chunk.id];
      if (queryVec && emb) {
        vec = cosineSimilarity(queryVec, emb);
      }
    }

    // Vector-first weighting when embeddings available
    let score =
      vec > 0 || (chunk.embedding || embeddings[chunk.id])
        ? vec * 0.55 + kw * 0.2 + chunk.reliabilityScore * 0.1
        : kw * 0.45 + chunk.reliabilityScore * 0.15;

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
      score += 0.08;
    }

    if (/\b[A-Z]{4,6}\b/.test(query) && chunk.keywords.some((k) => query.includes(k))) {
      score += 0.1;
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

  // Rerank: blend score with quality
  const top = scored
    .filter(
      (c) =>
        c.score > 0.12 ||
        (c.keywordScore ?? 0) > 0 ||
        (c.vectorScore ?? 0) > 0.28
    )
    .sort((a, b) => {
      const qa = (a.qualityScore ?? 70) / 100;
      const qb = (b.qualityScore ?? 70) / 100;
      const ra = a.score * 0.8 + qa * 0.05 + (a.vectorScore ?? 0) * 0.15;
      const rb = b.score * 0.8 + qb * 0.05 + (b.vectorScore ?? 0) * 0.15;
      return rb - ra;
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
    retrievalModes,
  };
}

/**
 * Retrieval order:
 * 1. exact scientific name / EPPO
 * 2. pgvector / embeddingJson semantic search
 * 3. PostgreSQL keyword / FTS-style contains
 * 4. synonym/trigram-ish keyword fallback (same SQL path with looser merge)
 * 5. corpus fallback only if DB unavailable or empty
 */
export async function retrieveKnowledge(
  query: string,
  options?: { limit?: number; language?: string; cropHint?: string }
): Promise<RagRetrievalResult> {
  const tokens = tokenize(query);
  const candidates: KnowledgeChunk[] = [];
  let dbUsed = false;
  const modes: string[] = [];

  // Single query embedding for the whole request
  let queryVec: number[] | null = null;
  try {
    if (isDatabaseConfigured()) {
      const { embedTexts } = await import("./embeddings");
      const [v] = await embedTexts([query]);
      queryVec = v ?? null;
    }
  } catch {
    queryVec = null;
  }

  if (isDatabaseConfigured()) {
    const exact = await searchExactScientificOrEppo(query, {
      limit: 24,
      language: options?.language,
    });
    if (exact.length) {
      candidates.push(...exact);
      modes.push("exact");
    }

    const vector = await searchChunksByVector(query, {
      limit: 40,
      language: options?.language,
      cropHint: options?.cropHint,
      queryVec: queryVec || undefined,
    });
    if (vector && vector.length) {
      candidates.push(...vector);
      dbUsed = true;
      modes.push("vector");
    }

    const keyword = await searchChunksInDb(query, {
      limit: 40,
      language: options?.language,
      cropHint: options?.cropHint,
    });
    if (keyword && keyword.length) {
      candidates.push(...keyword);
      dbUsed = true;
      modes.push("full_text");
    } else if (exact.length) {
      dbUsed = true;
    }
  }

  let chunks = mergeUnique(candidates);
  if (!dbUsed || chunks.length === 0) {
    if (!isDatabaseConfigured() || chunks.length === 0) {
      chunks = getVerifiedChunks();
      modes.push("corpus_fallback");
    }
  }

  if (process.env.KB_RETRIEVAL_DEBUG === "1") {
    console.info("[kb/retrieve]", {
      modes,
      candidateCount: chunks.length,
      queryPreview: query.slice(0, 80),
    });
  }

  const embeddingMap: Record<string, number[]> = {};
  const precomputedSim: Record<string, number> = {};
  for (const c of chunks) {
    const sim = (c as KnowledgeChunk & { _sim?: number })._sim;
    if (typeof sim === "number") precomputedSim[c.id] = sim;
    if (c.embedding?.length) embeddingMap[c.id] = c.embedding;
  }

  return rankChunks(
    query,
    chunks,
    tokens,
    embeddingMap,
    queryVec,
    options,
    modes,
    precomputedSim
  );
}
