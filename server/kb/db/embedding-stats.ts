import { getPrisma, isDatabaseConfigured, hasAnnVectorIndex } from "./client";

export type EmbeddingStats = {
  totalChunks: number;
  embedded: number;
  pending: number;
  failed: number;
  coveragePercent: number;
  vectorIndexReady: boolean;
  lastReindexAt: string | null;
  model: string;
  jobStatus?: string | null;
  checkpoint?: string | null;
  failedChunkIds?: string[];
};

const EMBED_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const CHECKPOINT_KIND = "embedding_reindex";

export async function getEmbeddingStats(): Promise<EmbeddingStats | null> {
  if (!isDatabaseConfigured()) return null;
  const prisma = getPrisma();
  if (!prisma) return null;

  try {
    const baseWhere = { deletedAt: null as null };

    const [totalChunks, embeddedJson, embeddedVec, failedJobs, lastJob, failedRecent] =
      await Promise.all([
        prisma.knowledgeChunkRow.count({ where: baseWhere }),
        prisma.knowledgeChunkRow.count({
          where: { ...baseWhere, embeddingJson: { not: null as never } },
        }),
        prisma
          .$queryRaw<Array<{ c: bigint }>>`
          SELECT COUNT(*)::bigint AS c FROM "KnowledgeChunkRow"
          WHERE "deletedAt" IS NULL AND embedding IS NOT NULL
        `
          .catch(() => [{ c: BigInt(0) }]),
        prisma.embeddingJob.count({ where: { status: "failed" } }),
        prisma.importJob.findFirst({
          where: { kind: CHECKPOINT_KIND },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.embeddingJob.findMany({
          where: { status: "failed" },
          orderBy: { updatedAt: "desc" },
          take: 50,
          select: { chunkId: true },
        }),
      ]);

    const embeddedNative = Number(embeddedVec[0]?.c || 0);
    const embedded = Math.max(embeddedJson, embeddedNative);
    const pending = Math.max(0, totalChunks - embedded);
    const coveragePercent =
      totalChunks === 0 ? 0 : Math.round((embedded / totalChunks) * 1000) / 10;

    const ann = await hasAnnVectorIndex();
    const vectorIndexReady = ann && embeddedNative > 0;

    return {
      totalChunks,
      embedded,
      pending,
      failed: failedJobs,
      coveragePercent,
      vectorIndexReady,
      lastReindexAt: lastJob?.updatedAt?.toISOString() ?? null,
      model: EMBED_MODEL,
      jobStatus: lastJob?.status ?? null,
      checkpoint: lastJob?.checkpoint ?? null,
      failedChunkIds: failedRecent.map((f) => f.chunkId),
    };
  } catch (err) {
    console.warn(
      "[kb] embedding stats failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export async function clearFailedEmbeddingJobs(): Promise<number> {
  const prisma = getPrisma();
  if (!prisma) return 0;
  const r = await prisma.embeddingJob.deleteMany({ where: { status: "failed" } });
  return r.count;
}
