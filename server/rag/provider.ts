import type { RagDocument, RagProvider } from "./types";
import {
  KnowledgeRagProvider,
  retrieveContextWithMeta,
  runWithRagContextAsync,
} from "@/server/kb/provider";

export type { RagDocument, RagProvider };

/** Phase 1 default: verified Knowledge Base hybrid retrieval. */
let ragProvider: RagProvider = new KnowledgeRagProvider();

export function setRagProvider(provider: RagProvider): void {
  ragProvider = provider;
}

export async function retrieveContext(query: string): Promise<string> {
  if (ragProvider instanceof KnowledgeRagProvider) {
    const { contextText, result } = await retrieveContextWithMeta(query);
    // Bind result for subsequent awaits in this request (chat enrich).
    await runWithRagContextAsync(result, async () => undefined);
    return contextText;
  }
  const docs = await ragProvider.search(query);
  return docs.map((d) => `[${d.category}] ${d.title}:\n${d.content}`).join("\n\n");
}

/**
 * Retrieve and keep ALS context for the duration of `fn` (fixes C4 race).
 */
export async function withRagContext<T>(
  query: string,
  fn: (contextText: string) => Promise<T>
): Promise<T> {
  const { contextText, result } = await retrieveContextWithMeta(query);
  return runWithRagContextAsync(result, () => fn(contextText));
}

export class StaticRagProvider implements RagProvider {
  constructor(private docs: RagDocument[] = []) {}
  async search(query: string, limit = 5): Promise<RagDocument[]> {
    const q = query.toLowerCase();
    const scored = this.docs
      .map((doc) => {
        let score = 0;
        if (doc.title.toLowerCase().includes(q)) score += 3;
        if (doc.content.toLowerCase().includes(q)) score += 2;
        doc.keywords?.forEach((k) => {
          if (q.includes(k.toLowerCase()) || k.toLowerCase().includes(q)) score += 2;
        });
        return { doc, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.doc);
  }
}
