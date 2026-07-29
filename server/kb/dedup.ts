import type { CanonicalEntity, ConflictRecord } from "./adapters/types";
import type { KnowledgeChunk } from "./types";
import {
  buildCanonicalKey,
  namesOverlap,
  normalizeAliasAsciiSafe,
  normalizeScientificName,
} from "./normalize";
import {
  loadCanonicalEntities,
  loadConflicts,
  saveCanonicalEntities,
  saveConflicts,
} from "./sync/persist";

function extractMeta(chunk: KnowledgeChunk): {
  scientificName?: string;
  eppoCode?: string;
  synonyms: string[];
  aliases: string[];
} {
  const eppo =
    chunk.keywords.find((k) => /^[A-Z]{4,6}$/.test(k)) ||
    chunk.keywords.find((k) => /^PHYTIN$/i.test(k));
  const scientific =
    chunk.keywords.find((k) => /\b[A-Z][a-z]+ [a-z]+\b/.test(k)) ||
    (chunk.title.match(/\(([A-Z][a-z]+ [a-z]+)\)/) || [])[1];

  return {
    scientificName: scientific
      ? normalizeScientificName(scientific)
      : undefined,
    eppoCode: eppo?.toUpperCase(),
    synonyms: chunk.keywords.filter((k) => k.includes(" ")),
    aliases: [
      chunk.title,
      ...chunk.keywords,
      ...(chunk.cropIds || []),
    ].map(normalizeAliasAsciiSafe),
  };
}

/**
 * Merge duplicate disease/pest chunks into canonical entities.
 * Conflicting scientific names for same EPPO code → conflict queue.
 */
export function deduplicateChunks(chunks: KnowledgeChunk[]): {
  canonical: CanonicalEntity[];
  duplicatesMerged: number;
  conflicts: ConflictRecord[];
} {
  const byKey = new Map<string, CanonicalEntity>();
  const conflicts: ConflictRecord[] = loadConflicts().filter(
    (c) => c.status === "pending"
  );
  let duplicatesMerged = 0;

  for (const chunk of chunks) {
    if (chunk.entityType !== "disease" && chunk.entityType !== "pest") {
      continue;
    }
    const meta = extractMeta(chunk);
    const key = buildCanonicalKey({
      entityType: chunk.entityType,
      scientificName: meta.scientificName,
      eppoCode: meta.eppoCode,
      title: chunk.title,
      externalId: chunk.entityId,
    });

    const existing = byKey.get(key);
    if (!existing) {
      // Try soft match by overlapping names
      let soft: CanonicalEntity | undefined;
      for (const cand of Array.from(byKey.values())) {
        if (
          cand.entityType === chunk.entityType &&
          namesOverlap(cand, {
            scientificName: meta.scientificName,
            synonyms: meta.synonyms,
            aliases: meta.aliases,
          })
        ) {
          soft = cand;
          break;
        }
      }

      if (soft) {
        if (
          soft.scientificName &&
          meta.scientificName &&
          soft.scientificName.toLowerCase() !== meta.scientificName.toLowerCase()
        ) {
          conflicts.push({
            id: `conflict-${soft.id}-${chunk.id}`,
            entityType: chunk.entityType,
            canonicalEntityId: soft.id,
            conflictingEntityIds: [chunk.entityId],
            reason: "Overlapping aliases with differing scientific names",
            fields: ["scientificName"],
            status: "pending",
            createdAt: new Date().toISOString(),
            sources: [soft.sourceIds[0], chunk.sourceId].filter(Boolean),
          });
        } else {
          soft.chunkIds.push(chunk.id);
          soft.sourceIds = Array.from(
            new Set([...soft.sourceIds, chunk.sourceId])
          );
          soft.synonyms = Array.from(
            new Set([...soft.synonyms, ...meta.synonyms])
          );
          soft.aliases = Array.from(
            new Set([...soft.aliases, ...meta.aliases])
          );
          soft.reliabilityScore = Math.max(
            soft.reliabilityScore,
            chunk.reliabilityScore
          );
          soft.updatedAt = new Date().toISOString();
          duplicatesMerged++;
        }
        continue;
      }

      byKey.set(key, {
        id: key,
        entityType: chunk.entityType,
        scientificName: meta.scientificName,
        eppoCode: meta.eppoCode,
        synonyms: meta.synonyms,
        commonNames: {},
        aliases: meta.aliases,
        sourceIds: [chunk.sourceId],
        chunkIds: [chunk.id],
        reliabilityScore: chunk.reliabilityScore,
        updatedAt: new Date().toISOString(),
      });
      continue;
    }

    // Same canonical key — merge, but flag scientific name conflicts
    if (
      existing.scientificName &&
      meta.scientificName &&
      existing.scientificName.toLowerCase() !== meta.scientificName.toLowerCase()
    ) {
      conflicts.push({
        id: `conflict-${existing.id}-${chunk.id}`,
        entityType: chunk.entityType,
        canonicalEntityId: existing.id,
        conflictingEntityIds: [chunk.entityId],
        reason: "Same EPPO/canonical key with differing scientific names",
        fields: ["scientificName"],
        status: "pending",
        createdAt: new Date().toISOString(),
        sources: [existing.sourceIds[0], chunk.sourceId].filter(Boolean),
      });
    }

    existing.chunkIds.push(chunk.id);
    existing.sourceIds = Array.from(
      new Set([...existing.sourceIds, chunk.sourceId])
    );
    existing.synonyms = Array.from(
      new Set([...existing.synonyms, ...meta.synonyms])
    );
    existing.aliases = Array.from(
      new Set([...existing.aliases, ...meta.aliases])
    );
    existing.reliabilityScore = Math.max(
      existing.reliabilityScore,
      chunk.reliabilityScore
    );
    existing.updatedAt = new Date().toISOString();
    duplicatesMerged++;
  }

  const canonical = Array.from(byKey.values());
  // Idempotent conflict merge by id
  const prev = loadConflicts();
  const byConflictId = new Map(prev.map((c) => [c.id, c]));
  for (const c of conflicts) {
    if (!byConflictId.has(c.id)) byConflictId.set(c.id, c);
  }
  const mergedConflicts = Array.from(byConflictId.values());
  saveCanonicalEntities(canonical);
  saveConflicts(mergedConflicts);
  return {
    canonical,
    duplicatesMerged,
    conflicts: mergedConflicts.filter((c) => c.status === "pending"),
  };
}

export function getPendingConflicts(): ConflictRecord[] {
  return loadConflicts().filter((c) => c.status === "pending");
}

export function getCanonicalEntities(): CanonicalEntity[] {
  return loadCanonicalEntities();
}
