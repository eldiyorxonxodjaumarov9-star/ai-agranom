/**
 * Time-budgeted, checkpointed corpus → DB migration for serverless/cron.
 * Safe to call repeatedly; resumes from ImportJob.checkpoint.
 */
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { getPrisma, isDatabaseConfigured, getRecordCounts } from "./client";
import { buildCorpusChunks, corpusStats } from "../corpus/build";
import { migrateCorpusToDatabase } from "./migrate-corpus";

const JOB_KEY = "corpus_bootstrap:main";
const JOB_KIND = "corpus_bootstrap";

export type BootstrapCheckpoint = {
  stage: "entities" | "chunks" | "done";
  chunkIndex: number;
  entitiesDone: boolean;
};

export type BootstrapBatchReport = {
  done: boolean;
  stage: string;
  chunkIndex: number;
  expectedChunks: number;
  chunksInDb: number;
  processedThisRun: number;
  skippedChecksum: number;
  failed: number;
  errors: string[];
  elapsedMs: number;
  checkpoint: BootstrapCheckpoint;
  recordCounts: Awaited<ReturnType<typeof getRecordCounts>>;
  corpus: ReturnType<typeof corpusStats>;
};

function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

function parseCheckpoint(raw: string | null | undefined): BootstrapCheckpoint {
  if (!raw) {
    return { stage: "entities", chunkIndex: 0, entitiesDone: false };
  }
  try {
    const j = JSON.parse(raw) as BootstrapCheckpoint;
    return {
      stage: j.stage || "entities",
      chunkIndex: Number(j.chunkIndex) || 0,
      entitiesDone: Boolean(j.entitiesDone),
    };
  } catch {
    return { stage: "entities", chunkIndex: 0, entitiesDone: false };
  }
}

/**
 * Run one bounded bootstrap slice.
 * @param maxMs stop before serverless timeout (default 240s)
 */
export async function runCorpusBootstrapBatch(options?: {
  maxMs?: number;
  batchSize?: number;
  force?: boolean;
}): Promise<BootstrapBatchReport> {
  if (!isDatabaseConfigured()) throw new Error("DATABASE_URL_REQUIRED");
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL_REQUIRED");

  const maxMs = options?.maxMs ?? Number(process.env.KB_BOOTSTRAP_MAX_MS || 240000);
  const batchSize = options?.batchSize ?? 40;
  const started = Date.now();
  const corpus = corpusStats();
  const expectedChunks = corpus.totalChunks;

  const job = await prisma.importJob.upsert({
    where: { idempotencyKey: JOB_KEY },
    create: {
      kind: JOB_KIND,
      status: "running",
      progressJson: {},
      idempotencyKey: JOB_KEY,
      checkpoint: JSON.stringify({
        stage: "entities",
        chunkIndex: 0,
        entitiesDone: false,
      } satisfies BootstrapCheckpoint),
      attempts: 1,
    },
    update: {
      status: "running",
      attempts: { increment: 1 },
      lastError: null,
    },
  });

  let cp = parseCheckpoint(job.checkpoint);
  const report: BootstrapBatchReport = {
    done: false,
    stage: cp.stage,
    chunkIndex: cp.chunkIndex,
    expectedChunks,
    chunksInDb: 0,
    processedThisRun: 0,
    skippedChecksum: 0,
    failed: 0,
    errors: [],
    elapsedMs: 0,
    checkpoint: cp,
    recordCounts: null,
    corpus,
  };

  const timeLeft = () => maxMs - (Date.now() - started);

  // Phase 1: entities (crops/diseases/pests/products) via full migrate when not done
  // Full migrate also writes chunks — for resume we prefer chunk-only after entities.
  if (!cp.entitiesDone || cp.stage === "entities" || options?.force) {
    if (timeLeft() < 30_000) {
      report.elapsedMs = Date.now() - started;
      report.recordCounts = await getRecordCounts();
      report.chunksInDb = report.recordCounts?.chunks ?? 0;
      return report;
    }

    // Ensure entities+chunks progress using existing idempotent migrate.
    // If already near complete, migrate skips quickly.
    process.env.FORCE_CORPUS_MIGRATE = options?.force ? "1" : process.env.FORCE_CORPUS_MIGRATE || "0";

    // Prefer chunk-only resume when entities mostly present
    const counts = await getRecordCounts();
    const entitiesLikelyDone =
      counts &&
      counts.crops >= corpus.crops &&
      counts.diseases >= Math.floor(corpus.diseases * 0.9) &&
      counts.pests >= Math.floor(corpus.pests * 0.9);

    if (!entitiesLikelyDone || options?.force) {
      // Run full migrate but it may exceed maxMs — caller should re-invoke.
      // Soft guard: only call if plenty of time.
      if (timeLeft() > 60_000) {
        try {
          await migrateCorpusToDatabase();
        } catch (e) {
          report.failed++;
          report.errors.push(e instanceof Error ? e.message : String(e));
        }
      }
    }

    cp = {
      stage: "chunks",
      chunkIndex: Math.max(cp.chunkIndex, 0),
      entitiesDone: true,
    };
    await prisma.importJob.update({
      where: { id: job.id },
      data: { checkpoint: JSON.stringify(cp), progressJson: report as never },
    });
  }

  // Phase 2: chunk upserts from checkpoint index
  const chunks = buildCorpusChunks();
  let i = cp.chunkIndex;
  while (i < chunks.length && timeLeft() > 15_000) {
    const end = Math.min(i + batchSize, chunks.length);
    for (let j = i; j < end; j++) {
      if (timeLeft() < 10_000) break;
      const c = chunks[j];
      try {
        const existing = await prisma.knowledgeChunkRow.findUnique({
          where: { id: c.id },
          select: { checksum: true },
        });
        if (existing?.checksum === c.checksum) {
          report.skippedChecksum++;
          continue;
        }
        const sourceId = c.organization.includes("EPPO")
          ? "src-eppo"
          : c.organization.includes("USDA")
            ? "src-usda"
            : "src-fao";
        await prisma.knowledgeChunkRow.upsert({
          where: { id: c.id },
          create: {
            id: c.id,
            entityType: c.entityType as never,
            entityId: c.entityId,
            language: c.language,
            title: c.title,
            content: c.content,
            keywords: c.keywords,
            cropIds: c.cropIds || [],
            plantParts: c.plantParts || [],
            regions: c.regions || [],
            sourceId,
            sourceUrl: c.sourceUrl,
            sourceTitle: c.sourceTitle,
            organization: c.organization,
            reliabilityScore: c.reliabilityScore,
            qualityScore: c.qualityScore ?? 70,
            status: c.status as never,
            version: c.version,
            checksum: c.checksum,
          },
          update: {
            title: c.title,
            content: c.content,
            keywords: c.keywords,
            qualityScore: c.qualityScore ?? 70,
            status: c.status as never,
            checksum: c.checksum,
            version: { increment: 1 },
            // Clear embedding when content checksum changes
            embeddingJson: Prisma.DbNull,
          },
        });
        report.processedThisRun++;
      } catch (e) {
        report.failed++;
        report.errors.push(
          `${c.id}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
    i = end;
    cp = { stage: "chunks", chunkIndex: i, entitiesDone: true };
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        checkpoint: JSON.stringify(cp),
        progressJson: {
          ...report,
          chunkIndex: i,
          percent: Math.round((i / chunks.length) * 1000) / 10,
        } as never,
      },
    });
    console.info(
      `[kb-bootstrap-batch] chunks ${i}/${chunks.length} (+${report.processedThisRun})`
    );
  }

  const countsAfter = await getRecordCounts();
  report.recordCounts = countsAfter;
  report.chunksInDb = countsAfter?.chunks ?? 0;
  report.chunkIndex = i;
  report.checkpoint = cp;
  report.elapsedMs = Date.now() - started;

  const done =
    report.chunksInDb >= expectedChunks &&
    (countsAfter?.diseases ?? 0) >= corpus.diseases &&
    (countsAfter?.pests ?? 0) >= corpus.pests;

  if (done || i >= chunks.length) {
    cp = { stage: "done", chunkIndex: chunks.length, entitiesDone: true };
    report.done = done || report.chunksInDb >= expectedChunks;
    report.stage = "done";
    report.checkpoint = cp;
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: report.done ? "completed" : "completed_partial",
        checkpoint: JSON.stringify(cp),
        progressJson: report as never,
      },
    });
  } else {
    report.done = false;
    report.stage = "chunks";
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "running",
        checkpoint: JSON.stringify(cp),
        progressJson: report as never,
      },
    });
  }

  void sha;
  return report;
}

export async function getBootstrapStatus(): Promise<{
  job: {
    status: string;
    checkpoint: BootstrapCheckpoint;
    attempts: number;
    updatedAt: string;
  } | null;
  recordCounts: Awaited<ReturnType<typeof getRecordCounts>>;
  corpus: ReturnType<typeof corpusStats>;
  gap: { chunks: number; diseases: number; pests: number };
}> {
  const prisma = getPrisma();
  const corpus = corpusStats();
  const recordCounts = await getRecordCounts();
  let job = null;
  if (prisma) {
    const row = await prisma.importJob.findUnique({
      where: { idempotencyKey: JOB_KEY },
    });
    if (row) {
      job = {
        status: row.status,
        checkpoint: parseCheckpoint(row.checkpoint),
        attempts: row.attempts,
        updatedAt: row.updatedAt.toISOString(),
      };
    }
  }
  return {
    job,
    recordCounts,
    corpus,
    gap: {
      chunks: Math.max(0, corpus.totalChunks - (recordCounts?.chunks ?? 0)),
      diseases: Math.max(0, corpus.diseases - (recordCounts?.diseases ?? 0)),
      pests: Math.max(0, corpus.pests - (recordCounts?.pests ?? 0)),
    },
  };
}
