/**
 * KZ PPP registry import — official CSV/XLSX/JSON upload only.
 * No Google scraping. Bulk public feed: not available → admin upload workflow.
 */
import { createHash } from "crypto";
import { getPrisma, isDatabaseConfigured } from "../db/client";
import { verifyProductRecord } from "../products/verify";

export type KzPppImportRow = {
  productName: string;
  registrationNumber: string;
  manufacturer?: string;
  activeIngredient?: string;
  concentration?: string;
  formulation?: string;
  approvedCrops?: string[];
  approvedTargets?: string[];
  registrationStatus?: string;
  expiresAt?: string;
  labelUrl?: string;
  officialPdfUrl?: string;
  region?: string;
};

export type KzPppImportReport = {
  totalProducts: number;
  parsed: number;
  validated: number;
  verified: number;
  needsReview: number;
  incomplete: number;
  conflicts: number;
  expired: number;
  revoked: number;
  failed: number;
  errors: string[];
  sourceProvenance: {
    kind: "admin_upload" | "catalog";
    filename?: string;
    checksum: string;
    importedAt: string;
  };
};

function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Parse official CSV export (header row required). */
export function parseKzPppCsv(csv: string): KzPppImportRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (names: string[]) =>
    headers.findIndex((h) => names.some((n) => h.includes(n)));

  const iName = idx(["product", "name", "nom", "препарат"]);
  const iReg = idx(["registration", "reg", "номер", "reestr"]);
  const iMfr = idx(["manufacturer", "производ", "manufacturer"]);
  const iAi = idx(["active", "ingredient", "действующ"]);
  const iConc = idx(["concentration", "концентра"]);
  const iForm = idx(["formulation", "формул"]);
  const iCrops = idx(["crop", "культур"]);
  const iTargets = idx(["target", "pest", "вред", "болез"]);
  const iStatus = idx(["status", "статус"]);
  const iExp = idx(["expir", "срок"]);
  const iLabel = idx(["label", "url", "pdf", "этикет"]);

  const rows: KzPppImportRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const productName = (iName >= 0 ? cols[iName] : cols[0]) || "";
    const registrationNumber = (iReg >= 0 ? cols[iReg] : cols[1]) || "";
    if (!productName && !registrationNumber) continue;
    const splitList = (v?: string) =>
      (v || "")
        .split(/[;|/]/)
        .map((x) => x.trim())
        .filter(Boolean);

    rows.push({
      productName,
      registrationNumber,
      manufacturer: iMfr >= 0 ? cols[iMfr] : undefined,
      activeIngredient: iAi >= 0 ? cols[iAi] : undefined,
      concentration: iConc >= 0 ? cols[iConc] : undefined,
      formulation: iForm >= 0 ? cols[iForm] : undefined,
      approvedCrops: iCrops >= 0 ? splitList(cols[iCrops]) : [],
      approvedTargets: iTargets >= 0 ? splitList(cols[iTargets]) : [],
      registrationStatus: iStatus >= 0 ? cols[iStatus] : undefined,
      expiresAt: iExp >= 0 ? cols[iExp] : undefined,
      labelUrl: iLabel >= 0 ? cols[iLabel] : undefined,
      officialPdfUrl: iLabel >= 0 ? cols[iLabel] : undefined,
      region: "KZ",
    });
  }
  return rows;
}

export function parseKzPppJson(raw: string): KzPppImportRow[] {
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) return [];
  return data.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      productName: String(o.productName || o.name || ""),
      registrationNumber: String(o.registrationNumber || o.regNo || ""),
      manufacturer: o.manufacturer ? String(o.manufacturer) : undefined,
      activeIngredient: o.activeIngredient
        ? String(o.activeIngredient)
        : undefined,
      concentration: o.concentration ? String(o.concentration) : undefined,
      formulation: o.formulation ? String(o.formulation) : undefined,
      approvedCrops: Array.isArray(o.approvedCrops)
        ? o.approvedCrops.map(String)
        : [],
      approvedTargets: Array.isArray(o.approvedTargets)
        ? o.approvedTargets.map(String)
        : [],
      registrationStatus: o.registrationStatus
        ? String(o.registrationStatus)
        : undefined,
      expiresAt: o.expiresAt ? String(o.expiresAt) : undefined,
      labelUrl: o.labelUrl ? String(o.labelUrl) : undefined,
      officialPdfUrl: o.officialPdfUrl ? String(o.officialPdfUrl) : undefined,
      region: "KZ",
    };
  });
}

export async function importKzPppRows(
  rows: KzPppImportRow[],
  meta: { filename?: string; kind?: "admin_upload" | "catalog" }
): Promise<KzPppImportReport> {
  const payload = JSON.stringify(rows);
  const report: KzPppImportReport = {
    totalProducts: rows.length,
    parsed: rows.length,
    validated: 0,
    verified: 0,
    needsReview: 0,
    incomplete: 0,
    conflicts: 0,
    expired: 0,
    revoked: 0,
    failed: 0,
    errors: [],
    sourceProvenance: {
      kind: meta.kind || "admin_upload",
      filename: meta.filename,
      checksum: sha(payload).slice(0, 16),
      importedAt: new Date().toISOString(),
    },
  };

  if (!isDatabaseConfigured()) {
    // Offline validation only
    for (const row of rows) {
      const outcome = verifyProductRecord({
        registryRecordExists: true,
        registrationNumber: row.registrationNumber,
        manufacturer: row.manufacturer,
        activeIngredient: row.activeIngredient,
        concentration: row.concentration,
        formulation: row.formulation,
        approvedCrops: row.approvedCrops,
        approvedTargets: row.approvedTargets,
        labelUrl: row.labelUrl,
        officialPdfUrl: row.officialPdfUrl,
        expiresAt: row.expiresAt,
        sourceChecksum: sha(
          `${row.registrationNumber}|${row.productName}|${row.expiresAt || ""}`
        ).slice(0, 16),
        revoked: /revok/i.test(row.registrationStatus || ""),
      });
      report.validated++;
      tally(report, outcome.status);
    }
    return report;
  }

  const prisma = getPrisma();
  if (!prisma) return report;

  // Ensure source
  await prisma.source.upsert({
    where: { id: "src-kz-ppp" },
    create: {
      id: "src-kz-ppp",
      title: "Kazakhstan PPP Registry (admin import)",
      organization: "KZ official registry",
      url: "https://www.gov.kz",
      accessedAt: new Date(),
      license: "official_public_registry",
      reliabilityScore: 0.9,
    },
    update: {
      title: "Kazakhstan PPP Registry (admin import)",
      accessedAt: new Date(),
    },
  });

  for (const row of rows) {
    try {
      const checksum = sha(
        `${row.registrationNumber}|${row.productName}|${row.expiresAt || ""}|${row.labelUrl || ""}`
      ).slice(0, 16);
      const outcome = verifyProductRecord({
        registryRecordExists: true,
        registrationNumber: row.registrationNumber,
        manufacturer: row.manufacturer,
        activeIngredient: row.activeIngredient,
        concentration: row.concentration,
        formulation: row.formulation,
        approvedCrops: row.approvedCrops,
        approvedTargets: row.approvedTargets,
        labelUrl: row.labelUrl,
        officialPdfUrl: row.officialPdfUrl,
        expiresAt: row.expiresAt,
        sourceChecksum: checksum,
        revoked: /revok/i.test(row.registrationStatus || ""),
        registrationStatus: row.registrationStatus,
      });

      report.validated++;
      tally(report, outcome.status);

      // Never auto-promote incomplete uploads beyond verify outcome
      const productId = `kz-ppp-${sha(row.registrationNumber || row.productName).slice(0, 12)}`;

      let aiId: string | undefined;
      if (row.activeIngredient?.trim()) {
        aiId = `ai-${sha(row.activeIngredient.toLowerCase()).slice(0, 12)}`;
        await prisma.activeIngredient.upsert({
          where: { id: aiId },
          create: {
            id: aiId,
            name: row.activeIngredient,
            type: "unknown",
            status: "NEEDS_REVIEW",
            checksum: sha(row.activeIngredient).slice(0, 16),
          },
          update: { name: row.activeIngredient },
        });
      }

      // Map INCOMPLETE → NEEDS_REVIEW for Prisma KbStatus enum
      const dbStatus =
        outcome.status === "INCOMPLETE" ? "NEEDS_REVIEW" : outcome.status;

      await prisma.product.upsert({
        where: { id: productId },
        create: {
          id: productId,
          name: row.productName,
          activeIngredientId: aiId,
          formulation: row.formulation,
          manufacturer: row.manufacturer,
          labelUrl: row.labelUrl || row.officialPdfUrl,
          labelVerified: outcome.labelVerified,
          status: dbStatus as never,
          registrationStatus: outcome.registrationStatus as never,
          qualityScore: outcome.status === "VERIFIED" ? 85 : 45,
          checksum,
          lastVerifiedAt: new Date(),
        },
        update: {
          name: row.productName,
          activeIngredientId: aiId,
          formulation: row.formulation,
          manufacturer: row.manufacturer,
          labelUrl: row.labelUrl || row.officialPdfUrl,
          labelVerified: outcome.labelVerified,
          status: dbStatus as never,
          registrationStatus: outcome.registrationStatus as never,
          checksum,
          lastVerifiedAt: new Date(),
        },
      });

      if (row.registrationNumber) {
        await prisma.productRegistration.upsert({
          where: {
            registrationCountry_registrationNumber: {
              registrationCountry: "KZ",
              registrationNumber: row.registrationNumber,
            },
          },
          create: {
            productId,
            registrationCountry: "KZ",
            registrationNumber: row.registrationNumber,
            approvedCrops: row.approvedCrops || [],
            approvedTargets: row.approvedTargets || [],
            expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
            status: dbStatus as never,
            registrationStatus: outcome.registrationStatus as never,
            checksum,
            lastVerifiedAt: new Date(),
          },
          update: {
            productId,
            approvedCrops: row.approvedCrops || [],
            approvedTargets: row.approvedTargets || [],
            expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
            status: dbStatus as never,
            registrationStatus: outcome.registrationStatus as never,
            checksum,
            lastVerifiedAt: new Date(),
          },
        });
      }
    } catch (err) {
      report.failed++;
      report.errors.push(
        `${row.productName}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return report;
}

function tally(
  report: KzPppImportReport,
  status: string
): void {
  if (status === "VERIFIED") report.verified++;
  else if (status === "EXPIRED") report.expired++;
  else if (status === "REVOKED") report.revoked++;
  else if (status === "CONFLICT") report.conflicts++;
  else if (status === "INCOMPLETE") report.incomplete++;
  else report.needsReview++;
}
