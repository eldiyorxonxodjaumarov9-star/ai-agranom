import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { authenticateRequest } from "@/lib/agronom/auth";
import {
  checkDatabaseHealth,
  getRecordCounts,
} from "@/server/kb/db/client";
import { migrateCorpusToDatabase } from "@/server/kb/db/migrate-corpus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

function authorize(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && token && timingSafeEqual(token, cronSecret)) return true;
  const admin = authenticateRequest(authHeader);
  return admin.ok;
}

/**
 * Bootstrap Neon KB after tables exist.
 * Auth: Bearer CRON_SECRET or AGRO_API_KEY
 */
export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const health = await checkDatabaseHealth();
  if (health.database !== "connected") {
    return NextResponse.json(
      { success: false, error: "database_not_connected", health },
      { status: 503 }
    );
  }

  const force = request.nextUrl.searchParams.get("force") === "1";
  const countsBefore = await getRecordCounts();
  if (!force && countsBefore && countsBefore.chunks > 0) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "already_populated",
      health,
      recordCounts: countsBefore,
    });
  }

  // Prefer unpooled for long writes when present
  const unpooled =
    process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
  if (unpooled && /^postgres(ql)?:\/\//i.test(unpooled)) {
    process.env.DATABASE_URL = unpooled;
  }

  console.info("[kb-bootstrap] corpus migrate start", {
    force,
    authFp: createHash("sha256")
      .update(request.headers.get("authorization") || "none")
      .digest("hex")
      .slice(0, 8),
  });

  try {
    const report = await migrateCorpusToDatabase();
    const countsAfter = await getRecordCounts();
    const healthAfter = await checkDatabaseHealth();
    return NextResponse.json({
      success: true,
      health: healthAfter,
      recordCounts: countsAfter,
      report: { ...report, errors: report.errors.slice(0, 20) },
    });
  } catch (err) {
    console.error("[kb-bootstrap] failed", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "migrate_failed",
        health: await checkDatabaseHealth(),
      },
      { status: 500 }
    );
  }
}
