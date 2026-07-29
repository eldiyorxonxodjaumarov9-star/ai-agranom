import type { KnowledgeChunk } from "../types";
import { getPrisma, isDatabaseConfigured } from "./client";

/**
 * Load VERIFIED, high-quality chunks from Postgres for RAG.
 * Returns null if DB unavailable (caller must fall back to corpus).
 */
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
    const where: Record<string, unknown> = {
      deletedAt: null,
      status: "VERIFIED",
      qualityScore: { gte: 70 },
    };
    if (options?.language) {
      where.language = options.language;
    }

    // Prefer recent high-quality rows; full hybrid search uses retrieveDbHybrid
    const rows = await prisma.knowledgeChunkRow.findMany({
      where,
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

/** Keyword / scientific-name / EPPO-oriented DB search (no vector required). */
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

    const rows = await prisma.knowledgeChunkRow.findMany({
      where: {
        deletedAt: null,
        status: "VERIFIED",
        qualityScore: { gte: 70 },
        ...(options?.language ? { language: options.language } : {}),
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
          { keywords: { hasSome: q.toLowerCase().split(/\s+/).filter((t) => t.length > 2) } },
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

export async function getRecommendableProductsFromDb(filters?: {
  cropId?: string;
  targetHint?: string;
}): Promise<
  Array<{ id: string; name: string; labelUrl: string | null; status: string }>
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
      take: 50,
      include: { registrations: true },
    });

    return products
      .filter((p) => {
        if (!filters?.cropId) return true;
        return p.registrations.some((r) =>
          r.approvedCrops.some((c) =>
            c.toLowerCase().includes(filters.cropId!.toLowerCase())
          )
        );
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        labelUrl: p.labelUrl,
        status: p.status,
      }));
  } catch {
    return [];
  }
}
