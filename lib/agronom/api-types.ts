export const SERVICE_NAME = "agro-olam-ai-agronom";
export const API_VERSION = "1.1.0";

export type SupportedLanguage = "uz" | "ru" | "en" | "kk" | "ky" | "auto";

export interface ChatApiRequest {
  message: string;
  language?: SupportedLanguage | string;
  sessionId?: string;
  images?: string[];
  cropMemory?: string;
  weather?: string;
  /** Optional Phase 1+ fields (backward compatible) */
  region?: string;
  crop?: string;
  imageIds?: string[];
  greenhouse?: boolean;
}

export interface ChatApiSourceCitation {
  organization: string;
  title: string;
  url: string;
}

export interface ChatApiSuccessResponse {
  success: true;
  answer: string;
  language: string;
  service: typeof SERVICE_NAME;
  /** Optional enrichment — older clients ignore these */
  sources?: ChatApiSourceCitation[];
  confidence?: number;
  products?: string[];
  requiresExpertReview?: boolean;
}

export interface ChatApiErrorResponse {
  success: false;
  error: string;
}

export type ChatApiResponse = ChatApiSuccessResponse | ChatApiErrorResponse;

export interface HealthApiResponse {
  status: "ok";
  service: typeof SERVICE_NAME;
  version: string;
  /** Optional Phase 3 KB diagnostics — older clients ignore */
  database?: "connected" | "disconnected" | "not_configured";
  pgvector?: "ready" | "missing" | "unknown" | "not_configured";
  knowledgeBaseMode?: "database" | "corpus_fallback";
  corpusFallback?: boolean;
  recordCounts?: {
    crops: number;
    diseases: number;
    pests: number;
    chunks: number;
    verifiedProducts: number;
  };
  databaseUrlRequired?: boolean;
  /** Phase 4 embedding diagnostics — older clients ignore */
  embeddings?: {
    totalChunks: number;
    embedded: number;
    pending: number;
    failed: number;
    coveragePercent: number;
    vectorIndexReady: boolean;
    lastReindexAt: string | null;
  };
}
