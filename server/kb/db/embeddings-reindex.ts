/**
 * Offline / CLI embedding reindex for KnowledgeChunkRow.
 * Never invoke from short-lived Vercel request handlers.
 */
import { createHash } from "crypto";
import { getPrisma, isDatabaseConfigured } from "./client";
import { embedTexts } from "../embeddings";
import { getEmbeddingStats } from "./embedding-stats";

const EMBED_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const DEFAULT_BATCH = Math.min(
  64,
  Math.max(1, Number(process.env.KB_EMBED_BATCH || 32) || 32)
);
const MAX_RETRIES = 5;
const CHECKPOINT_KIND = "embedding_reindex";

export type ReindexProgress = {
  totalChunks: number;
  embedded: number;
  pending: number;
  failed: number;
  processedThisRun: number;
  skippedFresh: number;
  tokenEstimate: number;
  estimatedCostUsd: number;
  model: string;
  resumedFrom: string | null;
  errors: string[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function embedPayload(row: {
  title: string;
  content: string;
  keywords: string[];
}): string {
  return `${row.title}\n${row.content}\n${row.keywords.join(" ")}`;
}

function estimateTokens(text: string): number {
  // Rough heuristic for Latin/Cyrillic mixed agronomy text
  return Math.ceil(text.length / 4);
}

/** text-embedding-3-small list price approx $0.02 / 1M tokens */
function estimateCostUsd(tokens: number): number {
  return (tokens / 1_000_000) * 0.02;
}

function contentChecksum(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function hasUsableEmbedding(embeddingJson: unknown): boolean {
  return Array.isArray(embeddingJson) && embeddingJson.length > 0;
}

async function withBackoff<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const delay = Math.min(30_000, 500 * 2 ** attempt);
      console.warn(
        `[kb:reindex] retry ${attempt + 1}/${MAX_RETRIES} ${label} in ${delay}ms:`,
        err instanceof Error ? err.message : err
      );
      await sleep(delay);
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export async function reindexEmbeddings(options?: {
  batchSize?: number;
  limit?: number;
  force?: boolean;
  dryRun?: boolean;
}): Promise<ReindexProgress> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL_REQUIRED");
  }
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL_REQUIRED");

  const batchSize = options?.batchSize ?? DEFAULT_BATCH;
  const force = options?.force === true;
  const dryRun = options?.dryRun === true;
  const limit = options?.limit;

  const job = await prisma.importJob.upsert({
    where: { idempotencyKey: `${CHECKPOINT_KIND}:main` },
    create: {
      kind: CHECKPOINT_KIND,
      status: "running",
      progressJson: {},
      idempotencyKey: `${CHECKPOINT_KIND}:main`,
      checkpoint: null,
      attempts: 1,
    },
    update: {
      status: "running",
      attempts: { increment: 1 },
      lastError: null,
    },
  });

  const resumeAfterId = job.checkpoint || null;
  const progress: ReindexProgress = {
    totalChunks: 0,
    embedded: 0,
    pending: 0,
    failed: 0,
    processedThisRun: 0,
    skippedFresh: 0,
    tokenEstimate: 0,
    estimatedCostUsd: 0,
    model: EMBED_MODEL,
    resumedFrom: resumeAfterId,
    errors: [],
  };

  const verifiedWhere = {
    deletedAt: null as null,
    status: "VERIFIED" as const,
  };

  progress.totalChunks = await prisma.knowledgeChunkRow.count({
    where: verifiedWhere,
  });

  let cursor = resumeAfterId;
  let done = false;

  while (!done) {
    const rows = await prisma.knowledgeChunkRow.findMany({
      where: verifiedWhere,
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor
        ? { skip: 1, cursor: { id: cursor } }
        : {}),
      select: {
        id: true,
        title: true,
        content: true,
        keywords: true,
        checksum: true,
        embeddingJson: true,
      },
    });

    if (rows.length === 0) {
      done = true;
      break;
    }

    const needEmbed = force
      ? rows
      : rows.filter((r) => {
          if (!hasUsableEmbedding(r.embeddingJson)) return true;
          // Invalidate when content checksum no longer matches stored marker
          const meta = (r.embeddingJson as { __checksum?: string } | number[]) || null;
          if (Array.isArray(meta)) {
            // Plain float array — treat as fresh unless force
            return false;
          }
          if (meta && typeof meta === "object" && meta.__checksum) {
            return meta.__checksum !== r.checksum;
          }
          return false;
        });

    progress.skippedFresh += rows.length - needEmbed.length;

    if (needEmbed.length === 0) {
      cursor = rows[rows.length - 1].id;
      await prisma.importJob.update({
        where: { id: job.id },
        data: {
          checkpoint: cursor,
          progressJson: progress as never,
        },
      });
      if (limit && progress.processedThisRun >= limit) break;
      if (rows.length < batchSize) done = true;
      continue;
    }

    const texts = needEmbed.map(embedPayload);
    for (const t of texts) progress.tokenEstimate += estimateTokens(t);

    if (dryRun) {
      progress.processedThisRun += needEmbed.length;
      cursor = rows[rows.length - 1].id;
      console.info(
        `[kb:reindex] dry-run batch cursor=${cursor} pending_embed=${needEmbed.length}`
      );
      if (limit && progress.processedThisRun >= limit) break;
      if (rows.length < batchSize) done = true;
      continue;
    }

    try {
      const vectors = await withBackoff(
        () => embedTexts(texts),
        `batch@${needEmbed[0].id}`
      );

      for (let i = 0; i < needEmbed.length; i++) {
        const row = needEmbed[i];
        const vector = vectors[i];
        try {
          await prisma.knowledgeChunkRow.update({
            where: { id: row.id },
            data: { embeddingJson: vector as never },
          });
          await prisma.embeddingJob.create({
            data: {
              chunkId: row.id,
              model: EMBED_MODEL,
              status: "completed",
            },
          });
          progress.processedThisRun++;
        } catch (err) {
          progress.failed++;
          const msg = err instanceof Error ? err.message : String(err);
          progress.errors.push(`${row.id}: ${msg}`);
          await prisma.embeddingJob.create({
            data: {
              chunkId: row.id,
              model: EMBED_MODEL,
              status: "failed",
              error: msg.slice(0, 500),
            },
          });
        }
      }

      // Soft rate limit between batches
      await sleep(Number(process.env.KB_EMBED_DELAY_MS || 200) || 200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      progress.errors.push(`batch: ${msg}`);
      for (const row of needEmbed) {
        progress.failed++;
        await prisma.embeddingJob.create({
          data: {
            chunkId: row.id,
            model: EMBED_MODEL,
            status: "failed",
            error: msg.slice(0, 500),
          },
        });
      }
    }

    cursor = rows[rows.length - 1].id;
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        checkpoint: cursor,
        progressJson: progress as never,
      },
    });

    console.info(
      `[kb:reindex] progress processed=${progress.processedThisRun} failed=${progress.failed} cursor=${cursor} tokens≈${progress.tokenEstimate}`
    );

    if (limit && progress.processedThisRun >= limit) break;
    if (rows.length < batchSize) done = true;
  }

  progress.estimatedCostUsd =
    Math.round(estimateCostUsd(progress.tokenEstimate) * 1e6) / 1e6;

  const stats = await getEmbeddingStats();
  if (stats) {
    progress.totalChunks = stats.totalChunks;
    progress.embedded = stats.embedded;
    progress.pending = stats.pending;
    progress.failed = Math.max(progress.failed, stats.failed);
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: progress.pending === 0 && progress.failed === 0 ? "completed" : "completed_partial",
      checkpoint: cursor,
      progressJson: progress as never,
      lastError: progress.errors[0] || null,
    },
  });

  // Silence unused helper in production builds that tree-shake oddly
  void contentChecksum;
  return progress;
}

export async function resetEmbeddingCheckpoint(): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;
  await prisma.importJob.updateMany({
    where: { kind: CHECKPOINT_KIND },
    data: { checkpoint: null, status: "reset" },
  });
}
