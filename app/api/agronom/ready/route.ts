import { NextRequest } from "next/server";
import { jsonWithCors, getCorsHeaders } from "@/lib/agronom/cors";
import {
  checkDatabaseHealth,
  hasAnnVectorIndex,
} from "@/server/kb/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
}

/** Readiness: DB + pgvector ANN index must be available. */
export async function GET(request: NextRequest) {
  const health = await checkDatabaseHealth();
  if (health.database !== "connected") {
    return jsonWithCors(
      request,
      { ready: false, reason: health.database, health },
      503
    );
  }
  if (health.pgvector !== "ready") {
    return jsonWithCors(
      request,
      { ready: false, reason: "pgvector_missing", health },
      503
    );
  }
  const ann = await hasAnnVectorIndex();
  if (!ann) {
    return jsonWithCors(
      request,
      { ready: false, reason: "ann_index_missing", health },
      503
    );
  }
  return jsonWithCors(request, { ready: true, health }, 200);
}
