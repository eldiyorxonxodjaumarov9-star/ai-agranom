/**
 * Time-budgeted, checkpointed corpus → DB migration for serverless/cron.
 * Safe to call repeatedly; resumes from ImportJob.checkpoint.
 */
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { getPrisma, isDatabaseConfigured, getRecordCounts } from "./client";
import { buildCorpusChunks, corpusStats } from "../corpus/build";
import { DISEASES } from "../corpus/diseases";
import { DISEASES_EXTRA } from "../corpus/diseases-extra";
import { DISEASES_PHASE4 } from "../corpus/diseases-phase4";
import { PESTS } from "../corpus/pests";
import { PESTS_EXTRA } from "../corpus/pests-extra";
import { PESTS_PHASE4 } from "../corpus/pests-phase4";

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

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

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

  const maxMs = options?.maxMs ?? Number(process.env.KB_BOOTSTRAP_MAX_MS || 50000);
  const batchSize = options?.batchSize ?? 40;
  const started = Date.now();
  const corpus = corpusStats();
  const expectedChunks = corpus.uniqueChunks ?? corpus.totalChunks;

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

  const countsEarly = await getRecordCounts();
  const chunkGapEarly = Math.max(0, expectedChunks - (countsEarly?.chunks ?? 0));
  const diseaseGapEarly = Math.max(0, corpus.diseases - (countsEarly?.diseases ?? 0));
  const pestGapEarly = Math.max(0, corpus.pests - (countsEarly?.pests ?? 0));

  // Stale "done" checkpoint when DB still has gaps — always resume catch-up.
  if (cp.stage === "done" && (chunkGapEarly > 0 || diseaseGapEarly > 0 || pestGapEarly > 0)) {
    cp = {
      stage: chunkGapEarly > 0 ? "chunks" : "entities",
      chunkIndex: 0,
      entitiesDone: diseaseGapEarly === 0 && pestGapEarly === 0,
    };
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "running", checkpoint: JSON.stringify(cp) },
    });
  }

  // Prefer chunk catch-up when chunk gap dominates (avoid burning budget on entity scans).
  const chunkGap = chunkGapEarly;
  if (chunkGap > 0) {
    cp = {
      stage: "chunks",
      chunkIndex: Math.max(cp.chunkIndex, 0),
      entitiesDone: true,
    };
  }

  // Phase 1: fill missing disease/pest entity rows (deduped corpus; EPPO-safe upsert)
  if ((!cp.entitiesDone || cp.stage === "entities") && chunkGap === 0) {
    const ALL_DISEASES = dedupeById([
      ...DISEASES,
      ...DISEASES_EXTRA,
      ...DISEASES_PHASE4,
    ]);
    const ALL_PESTS = dedupeById([...PESTS, ...PESTS_EXTRA, ...PESTS_PHASE4]);
    const existingDiseaseIds = new Set(
      (
        await prisma.disease.findMany({
          where: { deletedAt: null },
          select: { id: true },
        })
      ).map((r) => r.id)
    );
    const existingPestIds = new Set(
      (
        await prisma.pest.findMany({
          where: { deletedAt: null },
          select: { id: true },
        })
      ).map((r) => r.id)
    );
    const usedEppoDisease = new Set(
      (
        await prisma.disease.findMany({
          where: { deletedAt: null, eppoCode: { not: null } },
          select: { eppoCode: true },
        })
      )
        .map((r) => r.eppoCode)
        .filter(Boolean) as string[]
    );
    const usedEppoPest = new Set(
      (
        await prisma.pest.findMany({
          where: { deletedAt: null, eppoCode: { not: null } },
          select: { eppoCode: true },
        })
      )
        .map((r) => r.eppoCode)
        .filter(Boolean) as string[]
    );

    for (const d of ALL_DISEASES) {
      if (timeLeft() < 12_000) break;
      if (existingDiseaseIds.has(d.id)) continue;
      const eppo =
        d.eppoCode && !usedEppoDisease.has(d.eppoCode) ? d.eppoCode : null;
      try {
        const checksum = sha(JSON.stringify(d));
        await prisma.disease.upsert({
          where: { id: d.id },
          create: {
            id: d.id,
            scientificName: d.scientificName,
            eppoCode: eppo,
            pathogenType: d.pathogenType,
            pathogenName: d.scientificName,
            severity: d.severity,
            status: "VERIFIED",
            qualityScore: 88,
            checksum,
            sourceUrl: d.sourceUrl,
            organization: d.organization,
          },
          update: {
            scientificName: d.scientificName,
            checksum,
            sourceUrl: d.sourceUrl,
            organization: d.organization,
          },
        });
        if (eppo) usedEppoDisease.add(eppo);
        existingDiseaseIds.add(d.id);
        report.processedThisRun++;
      } catch (e) {
        report.failed++;
        report.errors.push(`disease ${d.id}: ${e instanceof Error ? e.message : e}`);
      }
    }
    for (const p of ALL_PESTS) {
      if (timeLeft() < 10_000) break;
      if (existingPestIds.has(p.id)) continue;
      const eppo =
        p.eppoCode && !usedEppoPest.has(p.eppoCode) ? p.eppoCode : null;
      try {
        const checksum = sha(JSON.stringify(p));
        await prisma.pest.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            scientificName: p.scientificName,
            eppoCode: eppo,
            pestType: p.pestType,
            status: "VERIFIED",
            qualityScore: 86,
            checksum,
            sourceUrl: p.sourceUrl,
            organization: p.organization,
          },
          update: {
            scientificName: p.scientificName,
            checksum,
            sourceUrl: p.sourceUrl,
            organization: p.organization,
          },
        });
        if (eppo) usedEppoPest.add(eppo);
        existingPestIds.add(p.id);
        report.processedThisRun++;
      } catch (e) {
        report.failed++;
        report.errors.push(`pest ${p.id}: ${e instanceof Error ? e.message : e}`);
      }
    }

    const counts = await getRecordCounts();
    const entitiesDone =
      !!counts &&
      counts.diseases >= corpus.diseases &&
      counts.pests >= corpus.pests;
    cp = {
      stage: entitiesDone ? "chunks" : "entities",
      chunkIndex: Math.max(cp.chunkIndex, 0),
      entitiesDone,
    };
    await prisma.importJob.update({
      where: { id: job.id },
      data: { checkpoint: JSON.stringify(cp), progressJson: report as never },
    });
    if (!entitiesDone || timeLeft() < 12_000) {
      report.elapsedMs = Date.now() - started;
      report.recordCounts = counts;
      report.chunksInDb = counts?.chunks ?? 0;
      report.checkpoint = cp;
      report.stage = cp.stage;
      return report;
    }
  }

  // Phase 2: upsert missing/outdated chunks (scan corpus; no false done from index)
  const chunks = buildCorpusChunks();
  const existingChunkMeta = await prisma.knowledgeChunkRow.findMany({
    select: { id: true, checksum: true },
  });
  const existingChunkMap = new Map(
    existingChunkMeta.map((r) => [r.id, r.checksum])
  );

  let batchProcessed = 0;
  for (
    let idx = 0;
    idx < chunks.length && timeLeft() > 8_000 && batchProcessed < batchSize;
    idx++
  ) {
    const c = chunks[idx];
    if (existingChunkMap.get(c.id) === c.checksum) continue;
    try {
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
          embeddingJson: Prisma.DbNull,
        },
      });
      existingChunkMap.set(c.id, c.checksum);
      report.processedThisRun++;
      batchProcessed++;
    } catch (e) {
      report.failed++;
      report.errors.push(
        `${c.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  cp = {
    stage: "chunks",
    chunkIndex: batchProcessed,
    entitiesDone: diseaseGapEarly === 0 && pestGapEarly === 0,
  };
  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      checkpoint: JSON.stringify(cp),
      progressJson: {
        ...report,
        batchProcessed,
      } as never,
    },
  });
  if (batchProcessed > 0) {
    console.info(
      `[kb-bootstrap-batch] upserted ${batchProcessed} chunks (gap was ${chunkGapEarly})`
    );
  }

  const countsAfter = await getRecordCounts();
  report.recordCounts = countsAfter;
  report.chunksInDb = countsAfter?.chunks ?? 0;
  report.chunkIndex = cp.chunkIndex;
  report.checkpoint = cp;
  report.elapsedMs = Date.now() - started;

  const diseaseGapAfter = Math.max(0, corpus.diseases - (countsAfter?.diseases ?? 0));
  const pestGapAfter = Math.max(0, corpus.pests - (countsAfter?.pests ?? 0));
  const chunkGapAfter = Math.max(0, expectedChunks - (countsAfter?.chunks ?? 0));

  const done =
    chunkGapAfter === 0 &&
    diseaseGapAfter === 0 &&
    pestGapAfter === 0;

  report.done = done;
  report.stage = done ? "done" : chunkGapAfter > 0 ? "chunks" : "entities";

  if (done) {
    cp = { stage: "done", chunkIndex: chunks.length, entitiesDone: true };
    report.checkpoint = cp;
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        checkpoint: JSON.stringify(cp),
        progressJson: report as never,
      },
    });
  } else {
    cp = {
      stage: report.stage as BootstrapCheckpoint["stage"],
      chunkIndex: 0,
      entitiesDone: diseaseGapAfter === 0 && pestGapAfter === 0,
    };
    report.checkpoint = cp;
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
      chunks: Math.max(
        0,
        (corpus.uniqueChunks ?? corpus.totalChunks) - (recordCounts?.chunks ?? 0)
      ),
      diseases: Math.max(0, corpus.diseases - (recordCounts?.diseases ?? 0)),
      pests: Math.max(0, corpus.pests - (recordCounts?.pests ?? 0)),
    },
  };
}
