/** Stored embedding payload — supports legacy plain float[] and checksum-wrapped rows. */
export type StoredEmbeddingJson =
  | number[]
  | { checksum: string; v: number[] }
  | null;

export function extractEmbeddingVector(
  embeddingJson: unknown
): number[] | undefined {
  if (Array.isArray(embeddingJson) && embeddingJson.length > 0) {
    return embeddingJson as number[];
  }
  if (
    embeddingJson &&
    typeof embeddingJson === "object" &&
    !Array.isArray(embeddingJson)
  ) {
    const o = embeddingJson as { checksum?: string; v?: unknown };
    if (Array.isArray(o.v) && o.v.length > 0) return o.v as number[];
  }
  return undefined;
}

export function embeddingMatchesChecksum(
  embeddingJson: unknown,
  checksum: string
): boolean {
  const vec = extractEmbeddingVector(embeddingJson);
  if (!vec) return false;
  if (Array.isArray(embeddingJson)) {
    // Legacy rows without checksum marker — treat as fresh until content changes force re-embed
    return true;
  }
  if (embeddingJson && typeof embeddingJson === "object") {
    const o = embeddingJson as { checksum?: string };
    return o.checksum === checksum;
  }
  return false;
}

export function wrapEmbedding(checksum: string, vector: number[]) {
  return { checksum, v: vector };
}
