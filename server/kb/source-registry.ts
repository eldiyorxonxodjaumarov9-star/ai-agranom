import type { SourceRegistryEntry } from "./types";

/**
 * Official / license-checked sources only.
 * Google Search may be used by humans to discover URLs;
 * mass scraping of arbitrary sites is forbidden.
 */
export const SOURCE_REGISTRY: SourceRegistryEntry[] = [
  {
    id: "fao",
    name: "FAO — Food and Agriculture Organization",
    baseUrl: "https://www.fao.org",
    sourceType: "official_database",
    license: "verify_per_document",
    allowedForIngestion: true,
    crawlDelayMs: 3000,
    lastCheckedAt: "2026-07-16",
    enabled: true,
    notes: "Prefer open FAO publications and IPM guides.",
  },
  {
    id: "eppo",
    name: "EPPO Global Database",
    baseUrl: "https://gd.eppo.int",
    sourceType: "official_database",
    license: "verify",
    allowedForIngestion: true,
    crawlDelayMs: 3000,
    lastCheckedAt: "2026-07-16",
    enabled: true,
    notes: "Use for pest/disease taxonomy and codes. Respect ToS.",
  },
  {
    id: "usda-nifa",
    name: "USDA / Land-grant extension (open materials)",
    baseUrl: "https://www.usda.gov",
    sourceType: "university_extension",
    license: "verify_per_document",
    allowedForIngestion: true,
    crawlDelayMs: 3000,
    lastCheckedAt: "2026-07-16",
    enabled: true,
  },
  {
    id: "kz-ppp-registry",
    name: "Kazakhstan plant protection product registry",
    baseUrl: "https://www.gov.kz",
    sourceType: "official_database",
    license: "official_public_registry",
    allowedForIngestion: true,
    crawlDelayMs: 5000,
    lastCheckedAt: "2026-07-16",
    enabled: true,
    notes: "Only registered PPP entries. Phase 4 deep sync.",
  },
  {
    id: "agro-olam-catalog",
    name: "Agro Olam Marketplace Catalog",
    baseUrl: "https://ai-agranom.vercel.app",
    sourceType: "internal_catalog",
    license: "internal",
    allowedForIngestion: true,
    crawlDelayMs: 0,
    lastCheckedAt: "2026-07-16",
    enabled: true,
  },
];

export function getAllowedSources(): SourceRegistryEntry[] {
  return SOURCE_REGISTRY.filter((s) => s.enabled && s.allowedForIngestion);
}

export function getSourceById(id: string): SourceRegistryEntry | undefined {
  return SOURCE_REGISTRY.find((s) => s.id === id);
}
