import { createHash, randomUUID } from "crypto";
import type { NextRequest } from "next/server";

export type RequestLog = {
  timestamp: string;
  requestId: string;
  endpoint: string;
  method: string;
  status: number;
  responseTimeMs: number;
  ip?: string;
  keyFingerprint?: string;
  isRejection?: boolean;
  error?: string;
};

export function createRequestId(request?: NextRequest): string {
  const incoming =
    request?.headers.get("x-request-id") ||
    request?.headers.get("x-correlation-id");
  if (incoming && /^[a-zA-Z0-9_.:-]{8,128}$/.test(incoming)) return incoming;
  return randomUUID();
}

export function logApiRequest(entry: RequestLog): void {
  console.log(
    JSON.stringify({
      level: "info",
      service: "agro-olam-ai-agronom",
      ...entry,
    })
  );
}

export function logApiError(
  entry: Omit<RequestLog, "isRejection"> & { error: string }
): void {
  console.error(
    JSON.stringify({
      level: "error",
      service: "agro-olam-ai-agronom",
      ...entry,
    })
  );
}

export function fingerprintSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
