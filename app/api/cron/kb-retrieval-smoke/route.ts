import { NextRequest, NextResponse } from "next/server";
import {
  authorizeCronRequest,
  logCronUnauthorized,
} from "@/lib/agronom/cron-auth";
import { retrieveKnowledge } from "@/server/kb/retrieve";
import { getEmbeddingStats } from "@/server/kb/db/embedding-stats";
import { checkDatabaseHealth } from "@/server/kb/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CASES: Array<{ label: string; query: string; language?: string; expect: string }> = [
  {
    label: "uz_semantic",
    query: "Pomidor barglarida oq unsimon dog'lar paydo bo'ldi",
    language: "uz",
    expect: "vector",
  },
  {
    label: "ru_semantic",
    query: "Жёлтая ржавчина пшеницы что делать",
    language: "ru",
    expect: "vector",
  },
  {
    label: "kk_semantic",
    query: "Алмада қара дақтар бар",
    language: "kk",
    expect: "vector",
  },
  {
    label: "ky_semantic",
    query: "Картошка жалбырагы саргайып жатат",
    language: "ky",
    expect: "vector",
  },
  {
    label: "scientific",
    query: "Phytophthora infestans",
    language: "en",
    expect: "exact",
  },
  {
    label: "synonym",
    query: "late blight tomato",
    language: "en",
    expect: "vector",
  },
  {
    label: "typo",
    query: "phytophthora infestans tomatto blight",
    language: "en",
    expect: "vector",
  },
];

/**
 * Production retrieval smoke (CRON_SECRET).
 * Does not log secrets. Chat API unchanged.
 */
export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    logCronUnauthorized("/api/cron/kb-retrieval-smoke", auth);
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const health = await checkDatabaseHealth();
  const embeddings = await getEmbeddingStats();
  process.env.KB_RETRIEVAL_DEBUG = "1";

  const cases = [];
  for (const c of CASES) {
    const start = Date.now();
    const rag = await retrieveKnowledge(c.query, {
      limit: 5,
      language: c.language,
    });
    const modes = rag.retrievalModes || [];
    const topVector = rag.chunks[0]?.vectorScore ?? 0;
    const topKeyword = rag.chunks[0]?.keywordScore ?? 0;
    const modePrimary =
      modes.includes(c.expect) && c.expect === "exact"
        ? "exact"
        : modes.includes("vector")
          ? "vector"
          : modes.includes("exact")
            ? "exact"
            : modes.includes("full_text")
              ? "full_text"
              : modes.includes("corpus_fallback")
                ? "corpus_fallback"
                : "none";
    const pass =
      c.expect === "exact"
        ? modes.includes("exact") || topKeyword > 0
        : modes.includes("vector") && topVector > 0.22;

    cases.push({
      label: c.label,
      expect: c.expect,
      modes,
      modePrimary,
      hits: rag.chunks.length,
      topScore: rag.chunks[0]?.score ?? 0,
      topVector,
      topKeyword,
      confidence: rag.confidence,
      ms: Date.now() - start,
      pass,
    });
  }

  const semantic = cases.filter((c) =>
    ["uz_semantic", "ru_semantic", "kk_semantic", "ky_semantic", "synonym"].includes(
      c.label
    )
  );
  const semanticPassed = semantic.every((c) => c.pass);
  const allPassed = cases.every((c) => c.pass);

  return NextResponse.json({
    success: true,
    authVia: auth.via,
    health: {
      database: health.database,
      knowledgeBaseMode: health.knowledgeBaseMode,
    },
    embeddings: embeddings
      ? {
          embedded: embeddings.embedded,
          pending: embeddings.pending,
          failed: embeddings.failed,
          coveragePercent: embeddings.coveragePercent,
          vectorIndexReady: embeddings.vectorIndexReady,
        }
      : null,
    semanticRetrievalPassed: semanticPassed,
    allPassed,
    cases,
  });
}
