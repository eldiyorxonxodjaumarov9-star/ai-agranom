import { createHash } from "crypto";
import type {
  AdapterIndexItem,
  AdapterRawItem,
  AdapterRunResult,
  NormalizedAdapterItem,
  SourceAdapter,
} from "./types";
import { getSourceById } from "../source-registry";
import { reliabilityForRegistry } from "../reliability";
import { contentChecksum, loadSources, saveSources, upsertChunks } from "../store";
import type { KnowledgeChunk } from "../types";
import { recordFailedImport } from "../sync/persist";
import { buildCanonicalKey, normalizeScientificName } from "../normalize";

export abstract class BaseSourceAdapter implements SourceAdapter {
  abstract readonly id: string;

  abstract fetchIndex(): Promise<AdapterIndexItem[]>;
  abstract fetchItem(item: AdapterIndexItem): Promise<AdapterRawItem | null>;

  parseItem(raw: AdapterRawItem): AdapterRawItem {
    return {
      ...raw,
      body: raw.body.replace(/\s+/g, " ").trim(),
      title: raw.title.trim(),
      scientificName: raw.scientificName
        ? normalizeScientificName(raw.scientificName)
        : undefined,
      synonyms: (raw.synonyms || []).map((s) => normalizeScientificName(s)),
    };
  }

  normalizeItem(parsed: AdapterRawItem): NormalizedAdapterItem | null {
    const registry = getSourceById(this.id);
    if (!registry || !registry.allowedForIngestion || !registry.enabled) {
      return null;
    }
    if (!parsed.title || !parsed.body || parsed.body.length < 40) return null;

    const scientific = parsed.scientificName
      ? normalizeScientificName(parsed.scientificName)
      : undefined;
    const entityId = buildCanonicalKey({
      entityType: parsed.entityType,
      scientificName: scientific,
      eppoCode: parsed.eppoCode,
      title: parsed.title,
      externalId: parsed.externalId,
    });

    const accessedAt = new Date().toISOString().slice(0, 10);
    const content = parsed.body;
    const checksum = contentChecksum(content);

    return {
      entityType: parsed.entityType,
      entityId,
      language: parsed.language || "en",
      title: parsed.title,
      content,
      keywords: [
        ...(parsed.keywords || []),
        ...(scientific ? [scientific] : []),
        ...(parsed.eppoCode ? [parsed.eppoCode] : []),
        ...(parsed.synonyms || []),
      ].filter(Boolean),
      cropIds: parsed.cropIds,
      scientificName: scientific,
      eppoCode: parsed.eppoCode,
      synonyms: parsed.synonyms || [],
      commonNames: parsed.commonNames || {},
      sourceRegistryId: this.id,
      sourceUrl: parsed.url,
      sourceTitle: parsed.title,
      organization: registry.name,
      reliabilityScore: reliabilityForRegistry(this.id, registry.sourceType),
      license: parsed.license || registry.license,
      publishedAt: parsed.publishedAt,
      accessedAt,
      checksum,
      status:
        parsed.entityType === "treatment" || parsed.entityType === "product"
          ? "NEEDS_REVIEW"
          : "AI_PARSED",
      etag: parsed.etag,
      lastModified: parsed.lastModified,
    };
  }

  validateItem(item: NormalizedAdapterItem): boolean {
    if (!item.title?.trim() || !item.content?.trim()) return false;
    if (!item.sourceUrl.startsWith("http")) return false;
    if (item.reliabilityScore < 0.5) return false;
    if (item.entityType === "product" || item.entityType === "treatment") {
      // never auto-verify chemical guidance
      return item.status !== "VERIFIED";
    }
    return true;
  }

  async saveItem(
    item: NormalizedAdapterItem
  ): Promise<"added" | "updated" | "skipped"> {
    const chunkId = `chunk-${createHash("sha256")
      .update(`${item.entityType}:${item.entityId}:${item.language}:${item.sourceUrl}`)
      .digest("hex")
      .slice(0, 12)}`;

    const sourceId = `src-${item.sourceRegistryId}-${contentChecksum(item.sourceUrl)}`;
    const sources = loadSources();
    if (!sources.some((s) => s.id === sourceId)) {
      sources.push({
        id: sourceId,
        title: item.sourceTitle,
        organization: item.organization,
        url: item.sourceUrl,
        publishedAt: item.publishedAt,
        accessedAt: item.accessedAt,
        license: item.license,
        reliabilityScore: item.reliabilityScore,
        registryId: item.sourceRegistryId,
        checksum: item.checksum,
      });
      saveSources(sources);
    }

    const chunk: KnowledgeChunk = {
      id: chunkId,
      entityType: item.entityType,
      entityId: item.entityId,
      language: item.language,
      title: item.title,
      content: item.content,
      keywords: item.keywords,
      cropIds: item.cropIds,
      sourceId,
      sourceUrl: item.sourceUrl,
      sourceTitle: item.sourceTitle,
      organization: item.organization,
      reliabilityScore: item.reliabilityScore,
      status: item.status,
      version: 1,
      updatedAt: new Date().toISOString(),
      checksum: item.checksum,
    };

    const result = upsertChunks([chunk]);
    if (result.added) return "added";
    if (result.updated) return "updated";
    return "skipped";
  }

  async run(): Promise<AdapterRunResult> {
    const result: AdapterRunResult = {
      adapterId: this.id,
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      duplicatesMerged: 0,
      conflicts: 0,
      errors: [],
      chunkIds: [],
    };

    let index: AdapterIndexItem[] = [];
    try {
      index = await this.fetchIndex();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.failed++;
      result.errors.push(`fetchIndex: ${msg}`);
      recordFailedImport({
        adapterId: this.id,
        externalId: "_index",
        error: msg,
      });
      return result;
    }

    for (const entry of index) {
      try {
        const raw = await this.fetchItem(entry);
        if (!raw) {
          result.skipped++;
          continue;
        }
        if (raw.unchanged) {
          result.skipped++;
          continue;
        }

        const parsed = this.parseItem(raw);
        const normalized = this.normalizeItem(parsed);
        if (!normalized || !this.validateItem(normalized)) {
          result.failed++;
          result.errors.push(`validate failed: ${entry.externalId}`);
          recordFailedImport({
            adapterId: this.id,
            externalId: entry.externalId,
            url: entry.url,
            error: "validation failed",
          });
          continue;
        }

        const outcome = await this.saveItem(normalized);
        if (outcome === "added") result.imported++;
        else if (outcome === "updated") result.updated++;
        else result.skipped++;

        result.chunkIds.push(
          `chunk-${createHash("sha256")
            .update(
              `${normalized.entityType}:${normalized.entityId}:${normalized.language}:${normalized.sourceUrl}`
            )
            .digest("hex")
            .slice(0, 12)}`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.failed++;
        result.errors.push(`${entry.externalId}: ${msg}`);
        recordFailedImport({
          adapterId: this.id,
          externalId: entry.externalId,
          url: entry.url,
          error: msg,
        });
      }
    }

    return result;
  }
}
