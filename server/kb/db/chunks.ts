import type { KnowledgeChunk } from "../types";
import { getPrisma, isDatabaseConfigured } from "./client";
import { cosineSimilarity, embedTexts } from "../embeddings";

function mapRow(row: {
  id: string;
  entityType: string;
  entityId: string;
  language: string;
  title: string;
  content: string;
  keywords: string[];
  cropIds: string[];
  plantParts: string[];
  regions: string[];
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  organization: string;
  reliabilityScore: number;
  qualityScore: number;
  status: string;
  version: number;
  updatedAt: Date;
  checksum: string;
  embeddingJson: unknown;
}): KnowledgeChunk {
  return {
    id: row.id,
    entityType: row.entityType as KnowledgeChunk["entityType"],
    entityId: row.entityId,
    language: row.language as KnowledgeChunk["language"],
    title: row.title,
    content: row.content,
    keywords: row.keywords,
    cropIds: row.cropIds,
    plantParts: row.plantParts,
    regions: row.regions,
    sourceId: row.sourceId,
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    organization: row.organization,
    reliabilityScore: row.reliabilityScore,
    qualityScore: row.qualityScore,
    status: row.status as KnowledgeChunk["status"],
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    checksum: row.checksum,
    embedding: Array.isArray(row.embeddingJson)
      ? (row.embeddingJson as number[])
      : undefined,
  };
}

const RAG_WHERE = {
  deletedAt: null as null,
  status: "VERIFIED" as const,
  qualityScore: { gte: 70 },
};

/**
 * Exact scientific name / EPPO-code oriented lookup.
 */
export async function searchExactScientificOrEppo(
  query: string,
  options?: { limit?: number; language?: string }
): Promise<KnowledgeChunk[]> {
  if (!isDatabaseConfigured()) return [];
  const prisma = getPrisma();
  if (!prisma) return [];

  const q = query.trim();
  if (!q) return [];

  const eppo = q.match(/\b[A-Z]{4,6}\b/g) || [];
  const binomial = q.match(/\b[A-Z][a-z]+ [a-z]+\b/g) || [];
  const needles = Array.from(new Set([...eppo, ...binomial, q])).slice(0, 8);

  try {
    const rows = await prisma.knowledgeChunkRow.findMany({
      where: {
        ...RAG_WHERE,
        ...(options?.language ? { language: options.language } : {}),
        OR: needles.flatMap((n) => [
          { title: { contains: n, mode: "insensitive" as const } },
          { keywords: { has: n } },
          { keywords: { has: n.toLowerCase() } },
          { content: { contains: n, mode: "insensitive" as const } },
        ]),
      },
      take: options?.limit ?? 24,
      orderBy: { qualityScore: "desc" },
    });
    return rows.map(mapRow);
  } catch {
    return [];
  }
}

/**
 * Vector-first candidate retrieval using stored embeddingJson + query embedding.
 * Does not call OpenAI for chunk embeddings — only for the query vector.
 */
export async function searchChunksByVector(
  query: string,
  options?: { limit?: number; language?: string; cropHint?: string }
): Promise<KnowledgeChunk[] | null> {
  if (!isDatabaseConfigured()) return null;
  const prisma = getPrisma();
  if (!prisma) return null;

  try {
    const [queryVec] = await embedTexts([query]);
    if (!queryVec?.length) return [];

    const rows = await prisma.knowledgeChunkRow.findMany({
      where: {
        ...RAG_WHERE,
        embeddingJson: { not: null as never },
        ...(options?.language ? { language: options.language } : {}),
      },
      take: 2500,
      orderBy: { qualityScore: "desc" },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        language: true,
        title: true,
        content: true,
        keywords: true,
        cropIds: true,
        plantParts: true,
        regions: true,
        sourceId: true,
        sourceUrl: true,
        sourceTitle: true,
        organization: true,
        reliabilityScore: true,
        qualityScore: true,
        status: true,
        version: true,
        updatedAt: true,
        checksum: true,
        embeddingJson: true,
      },
    });

    let mapped = rows.map(mapRow);
    if (options?.cropHint) {
      const hint = options.cropHint.toLowerCase();
      mapped = mapped.filter(
        (c) =>
          c.cropIds?.some((id) => id.toLowerCase().includes(hint)) ||
          c.title.toLowerCase().includes(hint)
      );
    }

    const scored = mapped
      .map((c) => ({
        chunk: c,
        sim: c.embedding ? cosineSimilarity(queryVec, c.embedding) : 0,
      }))
      .filter((x) => x.sim > 0.22)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, options?.limit ?? 40);

    return scored.map((s) => s.chunk);
  } catch (err) {
    console.warn(
      "[kb/db] searchChunksByVector failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/** Keyword / trigram-style contains search. */
export async function searchChunksInDb(
  query: string,
  options?: { limit?: number; language?: string; cropHint?: string }
): Promise<KnowledgeChunk[] | null> {
  if (!isDatabaseConfigured()) return null;
  const prisma = getPrisma();
  if (!prisma) return null;

  try {
    const limit = options?.limit ?? 24;
    const q = query.trim();
    if (!q) return [];

    const tokens = q
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2)
      .slice(0, 12);

    const rows = await prisma.knowledgeChunkRow.findMany({
      where: {
        ...RAG_WHERE,
        ...(options?.language ? { language: options.language } : {}),
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
          ...(tokens.length ? [{ keywords: { hasSome: tokens } }] : []),
        ],
      },
      take: limit,
      orderBy: { qualityScore: "desc" },
    });

    let mapped = rows.map(mapRow);
    if (options?.cropHint) {
      const hint = options.cropHint.toLowerCase();
      mapped = mapped.filter((c) =>
        c.cropIds?.some((id) => id.toLowerCase().includes(hint))
      );
    }
    return mapped;
  } catch (err) {
    console.warn(
      "[kb/db] searchChunksInDb failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export async function loadVerifiedChunksFromDb(options?: {
  limit?: number;
  language?: string;
  cropHint?: string;
  query?: string;
}): Promise<KnowledgeChunk[] | null> {
  if (!isDatabaseConfigured()) return null;
  const prisma = getPrisma();
  if (!prisma) return null;

  try {
    const limit = options?.limit ?? 500;
    const rows = await prisma.knowledgeChunkRow.findMany({
      where: {
        ...RAG_WHERE,
        ...(options?.language ? { language: options.language } : {}),
      },
      take: Math.min(limit, 2000),
      orderBy: [{ qualityScore: "desc" }, { updatedAt: "desc" }],
    });

    let mapped = rows.map(mapRow);
    if (options?.cropHint) {
      const hint = options.cropHint.toLowerCase();
      mapped = mapped.filter(
        (c) =>
          c.cropIds?.some((id) => id.toLowerCase().includes(hint)) ||
          c.content.toLowerCase().includes(hint) ||
          c.title.toLowerCase().includes(hint)
      );
    }
    return mapped;
  } catch (err) {
    console.warn(
      "[kb/db] loadVerifiedChunksFromDb failed, will use corpus fallback:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export type ProductRecommendFilters = {
  cropId?: string;
  targetHint?: string;
  region?: string;
};

/**
 * Only recommend when VERIFIED + ACTIVE + labelVerified + crop/target/region match.
 */
export async function getRecommendableProductsFromDb(
  filters?: ProductRecommendFilters
): Promise<
  Array<{
    id: string;
    name: string;
    labelUrl: string | null;
    status: string;
    registrationNumber?: string;
  }>
> {
  const prisma = getPrisma();
  if (!prisma) return [];
  try {
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        status: "VERIFIED",
        registrationStatus: "ACTIVE",
        labelVerified: true,
      },
      take: 80,
      include: { registrations: true },
    });

    return products
      .filter((p) => {
        const regs = p.registrations.filter(
          (r) =>
            !r.deletedAt &&
            r.registrationStatus === "ACTIVE" &&
            r.status === "VERIFIED"
        );
        if (!regs.length) return false;

        if (filters?.cropId) {
          const cropOk = regs.some((r) =>
            r.approvedCrops.some((c) =>
              c.toLowerCase().includes(filters.cropId!.toLowerCase())
            )
          );
          if (!cropOk) return false;
        }

        if (filters?.targetHint) {
          const targetOk = regs.some((r) =>
            r.approvedTargets.some((t) =>
              t.toLowerCase().includes(filters.targetHint!.toLowerCase())
            )
          );
          if (!targetOk) return false;
        }

        if (filters?.region) {
          const regionOk = regs.some((r) =>
            r.registrationCountry
              .toLowerCase()
              .includes(filters.region!.toLowerCase())
          );
          if (!regionOk) return false;
        }

        return true;
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        labelUrl: p.labelUrl,
        status: p.status,
        registrationNumber: p.registrations[0]?.registrationNumber,
      }));
  } catch {
    return [];
  }
}
