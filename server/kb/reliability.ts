/**
 * Reliability scoring for official sources only.
 * Unknown / non-registry sources are rejected (score 0).
 */
import type { SourceType } from "./types";

const REGISTRY_BASE: Record<string, number> = {
  "kz-ppp-registry": 0.98,
  eppo: 0.96,
  fao: 0.95,
  "usda-nifa": 0.88,
  "agro-olam-catalog": 0.9,
};

const TYPE_FLOOR: Record<SourceType, number> = {
  official_database: 0.9,
  university_extension: 0.82,
  peer_reviewed: 0.85,
  product_label: 0.8,
  open_dataset: 0.75,
  internal_catalog: 0.85,
  pdf_document: 0.7,
};

export function reliabilityForRegistry(
  registryId: string,
  sourceType: SourceType
): number {
  if (REGISTRY_BASE[registryId] != null) return REGISTRY_BASE[registryId];
  return TYPE_FLOOR[sourceType] ?? 0;
}

export function isReliabilityAcceptable(score: number): boolean {
  return score >= 0.75;
}
