/**
 * Time-budgeted embedding batch for serverless cron.
 * Prefer GitHub Actions for full reindex; this endpoint resumes safely in short slices.
 */
import { getPrisma, isDatabaseConfigured } from "./client";
import { embedTexts } from "../embeddings";
import { getEmbeddingStats } from "./embedding-stats";
import { wrapEmbedding } from "./embedding-json";

const EMBED_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const CHECKPOINT_KIND = "embedding_reindex";

export type EmbedBatchReport = {
  done: boolean;
  processedThisRun: number;
  skippedFresh: number;
  failed: number;
  errors: string[];
  checkpoint: string | null;
  elapsedMs: number;
  embeddings: Awaited<ReturnType<typeof getEmbeddingStats>>;
  rateLimited: boolean;
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

function isRateLimitError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("too many requests")
  );
}

/**
 * Embed chunks missing embeddingJson until maxMs budget.
 * Idempotent: already-embedded rows are never selected.
 */
export async function runEmbeddingBatch(options?: {
  maxMs?: number;
  batchSize?: number;
  force?: boolean;
}): Promise<EmbedBatchReport> {
  if (!isDatabaseConfigured()) throw new Error("DATABASE_URL_REQUIRED");
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL_REQUIRED");

  const maxMs = options?.maxMs ?? Number(process.env.KB_EMBED_MAX_MS || 45000);
  const batchSize = Math.min(
    48,
    Math.max(
      1,
      options?.batchSize ?? (Number(process.env.KB_EMBED_BATCH || 24) || 24)
    )
  );
  const force = options?.force === true;
  const started = Date.now();
  const timeLeft = () => maxMs - (Date.now() - started);

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

  const report: EmbedBatchReport = {
    done: false,
    processedThisRun: 0,
    skippedFresh: 0,
    failed: 0,
    errors: [],
    checkpoint: job.checkpoint,
    elapsedMs: 0,
    embeddings: null,
    rateLimited: false,
  };

  while (timeLeft() > 12_000) {
    const rows = await prisma.knowledgeChunkRow.findMany({
      where: force
        ? { deletedAt: null }
        : {
            deletedAt: null,
            embeddingJson: { equals: null as never },
          },
      orderBy: { id: "asc" },
      take: batchSize,
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
      break;
    }

    try {
      const texts = rows.map(embedPayload);
      const vectors = await embedTexts(texts);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          await prisma.knowledgeChunkRow.update({
            where: { id: row.id },
            data: {
              embeddingJson: wrapEmbedding(row.checksum, vectors[i]) as never,
            },
          });
          await prisma.embeddingJob.create({
            data: {
              chunkId: row.id,
              model: EMBED_MODEL,
              status: "completed",
            },
          });
          report.processedThisRun++;
          report.checkpoint = row.id;
        } catch (err) {
          report.failed++;
          const msg = err instanceof Error ? err.message : String(err);
          report.errors.push(`${row.id}: ${msg}`);
        }
      }
      await sleep(Number(process.env.KB_EMBED_DELAY_MS || 150) || 150);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push(`batch: ${msg}`);
      if (isRateLimitError(err)) {
        report.rateLimited = true;
        await prisma.importJob.update({
          where: { id: job.id },
          data: {
            status: "completed_partial",
            checkpoint: report.checkpoint,
            lastError: "rate_limited_resume",
            progressJson: report as never,
          },
        });
        break;
      }
      report.failed += rows.length;
    }

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        checkpoint: report.checkpoint,
        progressJson: {
          processedThisRun: report.processedThisRun,
          failed: report.failed,
        } as never,
      },
    });

    console.info(
      `[kb-embed-batch] +${rows.length} run=${report.processedThisRun} last=${report.checkpoint}`
    );

    // force mode would re-embed forever — one batch only when force
    if (force) break;
  }

  report.embeddings = await getEmbeddingStats();
  report.done =
    !report.rateLimited &&
    (report.embeddings?.pending ?? 1) === 0 &&
    (report.embeddings?.failed ?? 0) === 0;
  report.elapsedMs = Date.now() - started;

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: report.done
        ? "completed"
        : report.rateLimited
          ? "completed_partial"
          : "running",
      checkpoint: report.done ? null : report.checkpoint,
      progressJson: report as never,
      lastError: report.errors[0] || null,
    },
  });

  return report;
}
