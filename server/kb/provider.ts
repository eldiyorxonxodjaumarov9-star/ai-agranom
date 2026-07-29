import type { RagDocument, RagProvider } from "@/server/rag/types";
import { retrieveKnowledge } from "./retrieve";
import type { RagRetrievalResult } from "./types";

let lastResult: RagRetrievalResult | null = null;

export function getLastRagResult(): RagRetrievalResult | null {
  return lastResult;
}

export class KnowledgeRagProvider implements RagProvider {
  async search(query: string, limit = 8): Promise<RagDocument[]> {
    const result = await retrieveKnowledge(query, { limit });
    lastResult = result;

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
