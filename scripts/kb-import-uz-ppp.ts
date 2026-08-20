#!/usr/bin/env npx tsx
/**
 * Import UZ PPP rows from official CSV/JSON/XLSX (admin / CLI smoke).
 * Loads env before Prisma client module.
 *
 *   npm run kb:import-uz-ppp -- --file ./scripts/fixtures/uz-ppp-registry-sample.csv
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env.vercel.local" });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function main() {
  const { readFileSync } = await import("fs");
  const { resolve } = await import("path");
  const {
    importOfficialPppRows,
    parseOfficialPppCsv,
    parseOfficialPppJson,
    parseOfficialPppXlsxBuffer,
  } = await import("../server/kb/products/official-ppp-import");
  const { UZ_REGISTRY_BLOCKER } = await import(
    "../server/kb/adapters/uz-registry"
  );
  const { getPrisma, isDatabaseConfigured } = await import(
    "../server/kb/db/client"
  );

  const file = arg("--file");
  if (!file) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "Provide --file path to official CSV/JSON/XLSX export",
        remoteBlocker: UZ_REGISTRY_BLOCKER,
      })
    );
    process.exit(1);
  }
  const abs = resolve(file);
  const lower = abs.toLowerCase();
  let rows;
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    rows = await parseOfficialPppXlsxBuffer(readFileSync(abs), "UZ");
  } else if (lower.endsWith(".json")) {
    rows = parseOfficialPppJson(readFileSync(abs, "utf8"), "UZ");
  } else {
    rows = parseOfficialPppCsv(readFileSync(abs, "utf8"), "UZ");
  }

  const report = await importOfficialPppRows(rows, {
    country: "UZ",
    filename: abs,
    kind: "fixture_smoke",
    remoteBlocker: UZ_REGISTRY_BLOCKER,
  });

  const prisma = getPrisma();
  let samples = report.sampleProducts;
  if (
    samples.length === 0 &&
    prisma &&
    isDatabaseConfigured() &&
    report.sampleProductIds.length
  ) {
    samples = [];
    for (const id of report.sampleProductIds.slice(0, 3)) {
      const p = await prisma.product.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          manufacturer: true,
          formulation: true,
          status: true,
          registrationStatus: true,
          labelVerified: true,
          registrations: {
            select: {
              registrationNumber: true,
              approvedCrops: true,
              approvedTargets: true,
              expiresAt: true,
            },
          },
          activeIngredient: { select: { name: true } },
        },
      });
      if (p) {
        samples.push({
          id: p.id,
          name: p.name,
          manufacturer: p.manufacturer,
          formulation: p.formulation,
          status: p.status,
          registrationStatus: p.registrationStatus,
          labelVerified: p.labelVerified,
          activeIngredient: p.activeIngredient?.name || null,
          registrationNumber: p.registrations[0]?.registrationNumber || null,
          approvedCrops: p.registrations[0]?.approvedCrops || [],
          approvedTargets: p.registrations[0]?.approvedTargets || [],
          expiresAt: p.registrations[0]?.expiresAt?.toISOString() || null,
        });
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        databaseConfigured: isDatabaseConfigured(),
        remoteBlocker: UZ_REGISTRY_BLOCKER,
        counts: {
          parsed: report.parsed,
          imported: report.imported,
          updated: report.updated,
          skipped: report.skipped,
          failed: report.failed,
          verified: report.verified,
          needsReview: report.needsReview,
          expired: report.expired,
        },
        samples,
        errors: report.errors.slice(0, 5),
      },
      null,
      2
    )
  );
  await prisma?.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
