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
