import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_SERVER = {
  url: "http://localhost:3000",
  description: "Local development",
};

const PRODUCTION_SERVER = {
  url: "https://ai-agranom.vercel.app",
  description: "Vercel Production",
};

function getOrderedServers() {
  const isProduction = process.env.VERCEL_ENV === "production";

  return isProduction
    ? [PRODUCTION_SERVER, LOCAL_SERVER]
    : [LOCAL_SERVER, PRODUCTION_SERVER];
}

export async function GET() {
  const specPath = join(process.cwd(), "docs", "openapi.json");
  const raw = readFileSync(specPath, "utf-8");
  const spec = JSON.parse(raw) as Record<string, unknown>;

  spec.servers = getOrderedServers();

  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
