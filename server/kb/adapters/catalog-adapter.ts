import { readFileSync } from "fs";
import { join } from "path";
import type { EntityType, KnowledgeChunk } from "../types";
import { getSourceById } from "../source-registry";
import { BaseSourceAdapter } from "./base";
import { fetchWithPolicy } from "./http";
import type { AdapterIndexItem, AdapterRawItem } from "./types";

export interface CatalogEntry {
  externalId: string;
  url: string;
  title: string;
  entityType: EntityType;
  language?: KnowledgeChunk["language"];
  scientificName?: string;
  eppoCode?: string;
  synonyms?: string[];
  commonNames?: Partial<Record<"uz" | "ru" | "kk" | "ky" | "en", string>>;
  cropIds?: string[];
  keywords?: string[];
  body: string;
  license?: string;
  publishedAt?: string;
}

function loadCatalog(fileName: string): CatalogEntry[] {
  const path = join(process.cwd(), "server", "kb", "catalogs", fileName);
  return JSON.parse(readFileSync(path, "utf8")) as CatalogEntry[];
}

/**
 * Official allowlisted catalog adapter.
 * Default: ingest curated official reference excerpts (no Google scraping).
 * Optional live fetch (KB_LIVE_FETCH=1): conditional GET for ETag / Last-Modified only.
 */
export abstract class CatalogSourceAdapter extends BaseSourceAdapter {
  protected abstract catalogFile: string;

  protected get catalog(): CatalogEntry[] {
    return loadCatalog(this.catalogFile);
  }

  async fetchIndex(): Promise<AdapterIndexItem[]> {
    const registry = getSourceById(this.id);
    if (!registry?.enabled || !registry.allowedForIngestion) return [];
    return this.catalog.map((c) => ({
      externalId: c.externalId,
      url: c.url,
      title: c.title,
      entityType: c.entityType,
      updatedAt: c.publishedAt,
    }));
  }

  async fetchItem(item: AdapterIndexItem): Promise<AdapterRawItem | null> {
    const entry = this.catalog.find((c) => c.externalId === item.externalId);
    if (!entry) return null;

    const live = process.env.KB_LIVE_FETCH === "1" || process.env.KB_LIVE_FETCH === "true";
    const registry = getSourceById(this.id);

    if (live) {
      try {
        const res = await fetchWithPolicy(entry.url, {
          crawlDelayMs: registry?.crawlDelayMs ?? 3000,
          timeoutMs: 12000,
          retries: 2,
          method: "GET",
        });
        if (res.unchanged) {
          return {
            externalId: entry.externalId,
            url: entry.url,
            title: entry.title,
            body: entry.body,
            entityType: entry.entityType,
            unchanged: true,
            etag: res.etag,
            lastModified: res.lastModified,
          };
        }
        // Keep curated body as authoritative content; live fetch only validates freshness.
        return {
          externalId: entry.externalId,
          url: entry.url,
          title: entry.title,
          body: entry.body,
          entityType: entry.entityType,
          language: entry.language,
          scientificName: entry.scientificName,
          eppoCode: entry.eppoCode,
          synonyms: entry.synonyms,
          commonNames: entry.commonNames,
          cropIds: entry.cropIds,
          keywords: entry.keywords,
          publishedAt: entry.publishedAt,
          license: entry.license,
          etag: res.etag,
          lastModified: res.lastModified,
          unchanged: false,
        };
      } catch {
        // Fall back to catalog body offline
      }
    }

    return {
      externalId: entry.externalId,
      url: entry.url,
      title: entry.title,
      body: entry.body,
      entityType: entry.entityType,
      language: entry.language,
      scientificName: entry.scientificName,
      eppoCode: entry.eppoCode,
      synonyms: entry.synonyms,
      commonNames: entry.commonNames,
      cropIds: entry.cropIds,
      keywords: entry.keywords,
      publishedAt: entry.publishedAt,
      license: entry.license,
    };
  }
}
