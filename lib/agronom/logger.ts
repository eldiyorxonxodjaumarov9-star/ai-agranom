export interface ApiLogEntry {
  timestamp: string;
  endpoint: string;
  method: string;
  status: number;
  responseTimeMs: number;
  ip: string;
  keyFingerprint?: string;
  isRejection: boolean;
}

export function logApiRequest(entry: ApiLogEntry): void {
  // Secrets hech qachon log qilinmaydi
  const safe = {
    timestamp: entry.timestamp,
    endpoint: entry.endpoint,
    method: entry.method,
    status: entry.status,
    responseTimeMs: entry.responseTimeMs,
    ip: entry.ip,
    keyFingerprint: entry.keyFingerprint ?? "none",
    isRejection: entry.isRejection,
  };

  console.log("[agro-api]", JSON.stringify(safe));
}
