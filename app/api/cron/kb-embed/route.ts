import { NextRequest, NextResponse } from "next/server";
import {
  authorizeCronRequest,
  logCronUnauthorized,
} from "@/lib/agronom/cron-auth";
import { checkDatabaseHealth } from "@/server/kb/db/client";
import { runEmbeddingBatch } from "@/server/kb/db/embed-batch";
import { getEmbeddingStats } from "@/server/kb/db/embedding-stats";
import { retrieveKnowledge } from "@/server/kb/retrieve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Short embedding batches (resume-safe). Full reindex: GitHub Actions preferred.
 * Auth: Authorization: Bearer CRON_SECRET
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
    logCronUnauthorized("/api/cron/kb-embed", auth);
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const health = await checkDatabaseHealth();
  if (health.database !== "connected") {
    return NextResponse.json(
      { success: false, error: "database_not_connected", health },
      { status: 503 }
    );
  }

  if (request.nextUrl.searchParams.get("status") === "1") {
    return NextResponse.json({
      success: true,
      embeddings: await getEmbeddingStats(),
    });
  }

  if (request.nextUrl.searchParams.get("smoke") === "1") {
    const cases = await runRetrievalSmoke();
    return NextResponse.json({
      success: true,
      embeddings: await getEmbeddingStats(),
      cases,
      vectorLikelyCount: cases.filter((c) => c.modeHint === "vector_likely")
        .length,
    });
  }

  const unpooled =
    process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
  if (unpooled && /^postgres(ql)?:\/\//i.test(unpooled)) {
    process.env.DATABASE_URL = unpooled;
  }

  const force = request.nextUrl.searchParams.get("force") === "1";
  const maxMs = Number(
    request.nextUrl.searchParams.get("maxMs") ||
      process.env.KB_EMBED_MAX_MS ||
      45000
  );
  const batchSize = Number(
    request.nextUrl.searchParams.get("batch") ||
      process.env.KB_EMBED_BATCH ||
      24
  );

  try {
    const report = await runEmbeddingBatch({ force, maxMs, batchSize });
    return NextResponse.json({
      success: true,
      authVia: auth.via,
      report,
      hint: report.done
        ? "complete"
        : report.rateLimited
          ? "rate_limited — call again to resume"
          : "resume: call again (checkpoint saved)",
    });
  } catch (err) {
    console.error(
      "[kb-embed] failed",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "embed_failed",
        embeddings: await getEmbeddingStats(),
      },
      { status: 500 }
    );
  }
}

async function runRetrievalSmoke() {
  async function one(label: string, query: string, language?: string) {
    process.env.KB_RETRIEVAL_DEBUG = "1";
    const rag = await retrieveKnowledge(query, { limit: 5, language });
    return {
      label,
      language: language || "auto",
      hits: rag.chunks.length,
      topScore: rag.chunks[0]?.score ?? 0,
      topVector: rag.chunks[0]?.vectorScore ?? 0,
      topKeyword: rag.chunks[0]?.keywordScore ?? 0,
      modeHint:
        (rag.chunks[0]?.vectorScore ?? 0) > 0.28
          ? "vector_likely"
          : (rag.chunks[0]?.keywordScore ?? 0) > 0
            ? "keyword_or_exact"
            : "weak",
    };
  }

  return [
    await one("uz_semantic", "Pomidor barglarida oq unsimon dog'lar paydo bo'ldi", "uz"),
    await one("ru_semantic", "Жёлтая ржавчина пшеницы что делать", "ru"),
    await one("kk_semantic", "Алмада қара дақтар бар", "kk"),
    await one("ky_semantic", "Картошка жалбырагы саргайып жатат", "ky"),
    await one("scientific", "Phytophthora infestans", "en"),
    await one("synonym", "late blight tomato", "en"),
    await one("typo", "phytophthora infestans tomatto blight", "en"),
  ];
}
