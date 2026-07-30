import { getPrisma, isDatabaseConfigured } from "./client";

export type EmbeddingStats = {
  totalChunks: number;
  embedded: number;
  pending: number;
  failed: number;
  coveragePercent: number;
  vectorIndexReady: boolean;
  lastReindexAt: string | null;
  model: string;
};

const EMBED_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

export async function getEmbeddingStats(): Promise<EmbeddingStats | null> {
  if (!isDatabaseConfigured()) return null;
  const prisma = getPrisma();
  if (!prisma) return null;

  try {
    const [totalChunks, embedded, failedJobs, lastJob] = await Promise.all([
      prisma.knowledgeChunkRow.count({
        where: { deletedAt: null, status: "VERIFIED" },
      }),
      prisma.knowledgeChunkRow.count({
        where: {
          deletedAt: null,
          status: "VERIFIED",
          embeddingJson: { not: null as never },
        },
      }),
      prisma.embeddingJob.count({ where: { status: "failed" } }),
      prisma.importJob.findFirst({
        where: { kind: "embedding_reindex", status: "completed" },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const pending = Math.max(0, totalChunks - embedded);
    const coveragePercent =
      totalChunks === 0 ? 0 : Math.round((embedded / totalChunks) * 1000) / 10;

    let vectorIndexReady = false;
    try {
      const ext = await prisma.$queryRaw<Array<{ extname: string }>>`
        SELECT extname FROM pg_extension WHERE extname = 'vector'
      `;
      vectorIndexReady = ext.length > 0 && embedded > 0;
    } catch {
      vectorIndexReady = embedded > 0;
    }

    return {
      totalChunks,
      embedded,
      pending,
      failed: failedJobs,
      coveragePercent,
      vectorIndexReady,
      lastReindexAt: lastJob?.updatedAt?.toISOString() ?? null,
      model: EMBED_MODEL,
    };
  } catch (err) {
    console.warn(
      "[kb] embedding stats failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
