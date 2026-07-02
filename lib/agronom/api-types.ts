export const SERVICE_NAME = "agro-olam-ai-agronom";
export const API_VERSION = "1.0.0";

export type SupportedLanguage = "uz" | "ru" | "en" | "auto";

export interface ChatApiRequest {
  message: string;
  language?: SupportedLanguage | string;
  sessionId?: string;
}

export interface ChatApiSuccessResponse {
  success: true;
  answer: string;
  language: string;
  service: typeof SERVICE_NAME;
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
}
