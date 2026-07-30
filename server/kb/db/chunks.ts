import type { KnowledgeChunk } from "../types";
import { getPrisma, isDatabaseConfigured } from "./client";
import { embedTexts } from "../embeddings";
import { extractEmbeddingVector } from "./embedding-json";

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
    embedding: extractEmbeddingVector(row.embeddingJson),
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
 * pgvector ANN search — never loads 2500 JSON embeddings into Node.
 * Optional queryVec reuses a single embed per request.
 */
export async function searchChunksByVector(
  query: string,
  options?: {
    limit?: number;
    language?: string;
    cropHint?: string;
    queryVec?: number[];
  }
): Promise<KnowledgeChunk[] | null> {
  if (!isDatabaseConfigured()) return null;
  const prisma = getPrisma();
  if (!prisma) return null;

  try {
    let queryVec = options?.queryVec;
    if (!queryVec?.length) {
      const [v] = await embedTexts([query]);
      queryVec = v;
    }
    if (!queryVec?.length) return [];

    const limit = Math.min(80, Math.max(1, options?.limit ?? 40));
    const vectorLiteral = `[${queryVec.join(",")}]`;
    const lang = options?.language || null;

    const idRows = await prisma.$queryRawUnsafe<Array<{ id: string; dist: number }>>(
      `
      SELECT id, (embedding <=> $1::vector) AS dist
      FROM "KnowledgeChunkRow"
      WHERE "deletedAt" IS NULL
        AND status = 'VERIFIED'::"KbStatus"
        AND "qualityScore" >= 70
        AND embedding IS NOT NULL
        AND ($2::text IS NULL OR language = $2)
      ORDER BY embedding <=> $1::vector
      LIMIT $3
      `,
      vectorLiteral,
      lang,
      limit * 2
    );

    if (!idRows.length) return [];

    const ids = idRows.map((r) => r.id);
    const rows = await prisma.knowledgeChunkRow.findMany({
      where: { id: { in: ids }, ...RAG_WHERE },
    });
    const byId = new Map(rows.map((r) => [r.id, mapRow(r)]));
    let ordered = ids
      .map((id) => byId.get(id))
      .filter((c): c is KnowledgeChunk => Boolean(c));

    if (options?.cropHint) {
      const hint = options.cropHint.toLowerCase();
      ordered = ordered.filter(
        (c) =>
          c.cropIds?.some((id) => id.toLowerCase().includes(hint)) ||
          c.title.toLowerCase().includes(hint)
      );
    }

    // Attach cosine similarity ≈ 1 - distance for ranking
    const distMap = new Map(idRows.map((r) => [r.id, r.dist]));
    for (const c of ordered) {
      const dist = distMap.get(c.id);
      if (typeof dist === "number" && Number.isFinite(dist)) {
        (c as KnowledgeChunk & { _sim?: number })._sim = Math.max(0, 1 - dist);
      }
    }

    return ordered
      .filter((c) => ((c as KnowledgeChunk & { _sim?: number })._sim ?? 0) > 0.22)
      .slice(0, limit);
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
