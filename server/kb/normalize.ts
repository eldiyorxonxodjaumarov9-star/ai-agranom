import type { EntityType } from "./types";

export function normalizeScientificName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(var|subsp|f|sp)\.\b/gi, (m) => m.toLowerCase())
    .replace(/^(\w)/, (c) => c.toUpperCase());
}

export function normalizeAliasAsciiSafe(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9а-яёәғқңөұүһіў\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCanonicalKey(input: {
  entityType: EntityType;
  scientificName?: string;
  eppoCode?: string;
  title: string;
  externalId: string;
}): string {
  if (input.eppoCode?.trim()) {
    return `${input.entityType}-eppo-${input.eppoCode.trim().toUpperCase()}`;
  }
  if (input.scientificName?.trim()) {
    const sci = normalizeScientificName(input.scientificName)
      .toLowerCase()
      .replace(/\s+/g, "-");
    return `${input.entityType}-sci-${sci}`;
  }
  const slug = normalizeAliasAsciiSafe(input.title).replace(/\s+/g, "-").slice(0, 48);
  return `${input.entityType}-ext-${input.externalId}-${slug}`;
}

export function namesOverlap(
  a: { scientificName?: string; synonyms: string[]; aliases?: string[] },
  b: { scientificName?: string; synonyms: string[]; aliases?: string[] }
): boolean {
  const setA = new Set(
    [
      a.scientificName,
      ...a.synonyms,
      ...(a.aliases || []),
    ]
      .filter(Boolean)
      .map((n) => normalizeAliasAsciiSafe(n!))
  );
  const setB = [
    b.scientificName,
    ...b.synonyms,
    ...(b.aliases || []),
  ]
    .filter(Boolean)
    .map((n) => normalizeAliasAsciiSafe(n!));

  return setB.some((n) => setA.has(n));
}
