import { AsyncLocalStorage } from "async_hooks";
import type { RagDocument, RagProvider } from "@/server/rag/types";
import { retrieveKnowledge } from "./retrieve";
import type { RagRetrievalResult } from "./types";

const ragAls = new AsyncLocalStorage<RagRetrievalResult>();

/** Fallback for non-ALS callers (tests). Prefer getRequestRagResult(). */
let lastResult: RagRetrievalResult | null = null;

export function getLastRagResult(): RagRetrievalResult | null {
  return ragAls.getStore() ?? lastResult;
}

export function getRequestRagResult(): RagRetrievalResult | null {
  return ragAls.getStore() ?? lastResult;
}

export function runWithRagContext<T>(
  result: RagRetrievalResult,
  fn: () => T
): T {
  lastResult = result;
  return ragAls.run(result, fn);
}

export async function runWithRagContextAsync<T>(
  result: RagRetrievalResult,
  fn: () => Promise<T>
): Promise<T> {
  lastResult = result;
  return ragAls.run(result, fn);
}

export class KnowledgeRagProvider implements RagProvider {
  async search(query: string, limit = 8): Promise<RagDocument[]> {
    const result = await retrieveKnowledge(query, { limit });
    lastResult = result;
    const store = ragAls.getStore();
    if (store) {
      Object.assign(store, result);
    }

    if (result.chunks.length === 0) {
      return [
        {
          id: "kb-empty",
          title: "Insufficient verified knowledge",
          content: result.contextText,
          category: "general",
          keywords: [],
        },
      ];
    }

    return result.chunks.map((c) => ({
      id: c.id,
      title: c.title,
      content: [
        c.content,
        `Source: ${c.organization} — ${c.sourceTitle}`,
        `URL: ${c.sourceUrl}`,
        `Reliability: ${c.reliabilityScore}`,
        `Quality: ${c.qualityScore ?? "n/a"}`,
      ].join("\n"),
      category: c.entityType,
      keywords: c.keywords,
    }));
  }
}

export async function retrieveContextWithMeta(query: string): Promise<{
  contextText: string;
  result: RagRetrievalResult;
}> {
  const result = await retrieveKnowledge(query, { limit: 8 });
  lastResult = result;
  return { contextText: result.contextText, result };
}
