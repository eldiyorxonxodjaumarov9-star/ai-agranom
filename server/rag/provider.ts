/**
 * RAG provider interfeysi — keyinchalik DB, vector store yoki CMS ulanadi.
 */
export interface RagDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords?: string[];
}

export interface RagProvider {
  search(query: string, limit?: number): Promise<RagDocument[]>;
}

const STATIC_DOCUMENTS: RagDocument[] = [
  {
    id: "1",
    title: "Organik o'g'itlar",
    content: "Agro Olam organik va mineral o'g'itlar: NPK, kaliy, fosfor, azotli o'g'itlar.",
    category: "product",
    keywords: ["o'g'it", "NPK", "organik"],
  },
  {
    id: "2",
    title: "Urug' va ko'chatlar",
    content: "Sifatli urug' va ko'chatlar: pomidor, bodring, qalampir, kartoshka.",
    category: "product",
    keywords: ["urug'", "ko'chat"],
  },
  {
    id: "3",
    title: "Maslahat xizmati",
    content: "Agro Olam mutaxassislari shaxsiy agronom maslahati beradi.",
    category: "service",
    keywords: ["maslahat", "mutaxassis"],
  },
];

export class StaticRagProvider implements RagProvider {
  async search(query: string, limit = 5): Promise<RagDocument[]> {
    const q = query.toLowerCase();
    const scored = STATIC_DOCUMENTS.map((doc) => {
      let score = 0;
      if (doc.title.toLowerCase().includes(q)) score += 3;
      if (doc.content.toLowerCase().includes(q)) score += 2;
      doc.keywords?.forEach((k) => {
        if (k.toLowerCase().includes(q) || q.includes(k.toLowerCase())) score += 2;
      });
      return { doc, score };
    })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return STATIC_DOCUMENTS.slice(0, limit);
    return scored.slice(0, limit).map((s) => s.doc);
  }
}

let ragProvider: RagProvider = new StaticRagProvider();

export function setRagProvider(provider: RagProvider): void {
  ragProvider = provider;
}

export async function retrieveContext(query: string): Promise<string> {
  const docs = await ragProvider.search(query);
  return docs.map((d) => `[${d.category}] ${d.title}:\n${d.content}`).join("\n\n");
}
