/**
 * Official PPP registry import (UZ / KZ) — CSV, JSON, XLSX, text-extracted PDF.
 * Never auto-VERIFIED: uploads land as NEEDS_REVIEW until admin attestation.
 */
import { createHash } from "crypto";
import { getPrisma, isDatabaseConfigured } from "../db/client";
import {
  isFixtureOrSampleFilename,
  verifyProductRecord,
} from "./verify";

export type OfficialPppCountry = "UZ" | "KZ";

export type OfficialPppImportRow = {
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
  region?: OfficialPppCountry;
  sourceDocumentId?: string;
};

export type OfficialPppImportReport = {
  country: OfficialPppCountry;
  dryRun: boolean;
  totalProducts: number;
  parsed: number;
  validated: number;
  imported: number;
  updated: number;
  skipped: number;
  verified: number;
  needsReview: number;
  incomplete: number;
  conflicts: number;
  expired: number;
  revoked: number;
  failed: number;
  errors: string[];
  sampleProductIds: string[];
  sampleProducts: Array<{
    id: string;
    name: string;
    manufacturer: string | null;
    formulation: string | null;
    status: string;
    registrationStatus: string;
    labelVerified: boolean;
    activeIngredient: string | null;
    registrationNumber: string | null;
    approvedCrops: string[];
    approvedTargets: string[];
    expiresAt: string | null;
  }>;
  sourceProvenance: {
    kind: "admin_upload" | "catalog" | "fixture_smoke";
    filename?: string;
    checksum: string;
    importedAt: string;
    sourceDocumentId: string;
  };
  remoteBlocker?: string;
  writeBlockedReason?: string;
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

function splitList(v?: string): string[] {
  return (v || "")
    .split(/[;|/]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function mapHeaders(headers: string[]) {
  const idx = (names: string[]) =>
    headers.findIndex((h) => names.some((n) => h.includes(n)));
  return {
    iName: idx([
      "product",
      "name",
      "nom",
      "препарат",
      "preparat",
      "mahsulot",
      "nomi",
    ]),
    iReg: idx([
      "registration",
      "reg",
      "номер",
      "reestr",
      "ro'yxat",
      "royxat",
      "guvohnoma",
    ]),
    iMfr: idx(["manufacturer", "производ", "ishlab", "chiqaruvchi", "firma"]),
    iAi: idx([
      "active",
      "ingredient",
      "действующ",
      "ta'sir",
      "tasir",
      "modda",
    ]),
    iConc: idx(["concentration", "концентра", "konsentr"]),
    iForm: idx(["formulation", "формул", "formul"]),
    iCrops: idx(["crop", "культур", "ekin", "o‘simlik", "osimlik"]),
    iTargets: idx([
      "target",
      "pest",
      "вред",
      "болез",
      "zararkunanda",
      "kasallik",
    ]),
    iStatus: idx(["status", "статус", "holat"]),
    iExp: idx(["expir", "срок", "amal", "muddat"]),
    iLabel: idx(["label", "url", "pdf", "этикет", "yorliq"]),
    iDoc: idx(["document", "source_document", "doc_id", "hujjat"]),
  };
}

export function parseOfficialPppCsv(
  csv: string,
  country: OfficialPppCountry
): OfficialPppImportRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const h = mapHeaders(headers);
  const rows: OfficialPppImportRow[] = [];

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const productName = (h.iName >= 0 ? cols[h.iName] : cols[0]) || "";
    const registrationNumber = (h.iReg >= 0 ? cols[h.iReg] : cols[1]) || "";
    if (!productName && !registrationNumber) continue;
    rows.push({
      productName,
      registrationNumber,
      manufacturer: h.iMfr >= 0 ? cols[h.iMfr] : undefined,
      activeIngredient: h.iAi >= 0 ? cols[h.iAi] : undefined,
      concentration: h.iConc >= 0 ? cols[h.iConc] : undefined,
      formulation: h.iForm >= 0 ? cols[h.iForm] : undefined,
      approvedCrops: h.iCrops >= 0 ? splitList(cols[h.iCrops]) : [],
      approvedTargets: h.iTargets >= 0 ? splitList(cols[h.iTargets]) : [],
      registrationStatus: h.iStatus >= 0 ? cols[h.iStatus] : undefined,
      expiresAt: h.iExp >= 0 ? cols[h.iExp] : undefined,
      labelUrl: h.iLabel >= 0 ? cols[h.iLabel] : undefined,
      officialPdfUrl: h.iLabel >= 0 ? cols[h.iLabel] : undefined,
      sourceDocumentId: h.iDoc >= 0 ? cols[h.iDoc] : undefined,
      region: country,
    });
  }
  return rows;
}

export function parseOfficialPppJson(
  raw: string,
  country: OfficialPppCountry
): OfficialPppImportRow[] {
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
      sourceDocumentId: o.sourceDocumentId
        ? String(o.sourceDocumentId)
        : undefined,
      region: country,
    };
  });
}

export function parseOfficialPppSheetMatrix(
  matrix: string[][],
  country: OfficialPppCountry
): OfficialPppImportRow[] {
  if (matrix.length < 2) return [];
  const csv = matrix
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
  return parseOfficialPppCsv(csv, country);
}

export async function parseOfficialPppXlsxBuffer(
  _buf: Buffer,
  _country: OfficialPppCountry
): Promise<OfficialPppImportRow[]> {
  // xlsx@0.18.x has known ReDoS (GHSA-5pgg-2g8v-p4x9) — disabled until a maintained parser ships.
  throw new Error(
    "XLSX_DISABLED: Convert the official registry sheet to CSV/JSON and re-upload."
  );
}

export const IMPORT_LIMITS = {
  maxBytes: 2_000_000,
  maxRows: 5_000,
  maxCellChars: 2_000,
  maxCsvChars: 2_000_000,
} as const;

export function assertImportPayloadLimits(input: {
  content?: string;
  contentBase64?: string;
  rowCount?: number;
}): void {
  if (input.content && input.content.length > IMPORT_LIMITS.maxCsvChars) {
    throw new Error("IMPORT_TOO_LARGE");
  }
  if (
    input.contentBase64 &&
    Buffer.byteLength(input.contentBase64, "utf8") > IMPORT_LIMITS.maxBytes * 1.4
  ) {
    throw new Error("IMPORT_TOO_LARGE");
  }
  if ((input.rowCount || 0) > IMPORT_LIMITS.maxRows) {
    throw new Error("IMPORT_TOO_MANY_ROWS");
  }
}

export function extractTextFromPdfBytes(buf: Buffer): string {
  const raw = buf.toString("latin1");
  if (!raw.startsWith("%PDF")) return "";
  const parts: string[] = [];
  const re = /\((?:\\.|[^\\)]){2,200}\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const inner = m[0]
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\t/g, "\t")
      .replace(/\\([()\\])/g, "$1");
    if (/[\u0400-\u04FFa-zA-Z0-9]{2,}/.test(inner)) parts.push(inner);
  }
  return parts.join("\n");
}

export function parseOfficialPppPdfBuffer(
  buf: Buffer,
  country: OfficialPppCountry
): { rows: OfficialPppImportRow[]; hint?: string } {
  const text = extractTextFromPdfBytes(buf);
  if (!text.trim()) {
    return {
      rows: [],
      hint: "PDF_BINARY_NO_TEXT: Convert the official registry PDF to CSV/XLSX/JSON and re-upload.",
    };
  }
  if (/product|registration|preparat|mahsulot|препарат/i.test(text)) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const csvish = lines.filter((l) => l.includes(","));
    if (csvish.length >= 2) {
      return { rows: parseOfficialPppCsv(csvish.join("\n"), country) };
    }
  }
  return {
    rows: [],
    hint: "PDF_UNSTRUCTURED: No CSV-like table detected. Export official registry as CSV/XLSX/JSON.",
  };
}

function tally(report: OfficialPppImportReport, status: string): void {
  if (status === "VERIFIED") report.verified++;
  else if (status === "EXPIRED") report.expired++;
  else if (status === "REVOKED") report.revoked++;
  else if (status === "CONFLICT") report.conflicts++;
  else if (status === "INCOMPLETE") report.incomplete++;
  else report.needsReview++;
}

function sourceIdFor(country: OfficialPppCountry): string {
  return country === "UZ" ? "src-uz-ppp" : "src-kz-ppp";
}

export function productIdFor(
  country: OfficialPppCountry,
  row: OfficialPppImportRow
): string {
  const key = row.registrationNumber || row.productName;
  return `${country.toLowerCase()}-ppp-${sha(key).slice(0, 12)}`;
}

function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

/** Fixture/smoke must not write production DB unless explicitly forced. */
export function shouldBlockFixtureDbWrite(meta: {
  kind?: string;
  filename?: string;
  dryRun?: boolean;
}): { block: boolean; reason?: string } {
  if (meta.dryRun) return { block: true, reason: "dry_run" };
  const fixture =
    meta.kind === "fixture_smoke" || isFixtureOrSampleFilename(meta.filename);
  if (!fixture) return { block: false };
  if (process.env.KB_FIXTURE_ALLOW_DB === "1" && !isProductionRuntime()) {
    return { block: false };
  }
  if (isProductionRuntime()) {
    return {
      block: true,
      reason: "FIXTURE_BLOCKED_ON_PRODUCTION_DB",
    };
  }
  // Non-production fixture smoke defaults to no write (tests stay offline)
  if (meta.kind === "fixture_smoke" && process.env.KB_FIXTURE_ALLOW_DB !== "1") {
    return { block: true, reason: "FIXTURE_SMOKE_NO_DB_BY_DEFAULT" };
  }
  return { block: false };
}

function pushSample(
  report: OfficialPppImportReport,
  row: OfficialPppImportRow,
  country: OfficialPppCountry,
  status: string,
  registrationStatus: string,
  labelVerified: boolean
): void {
  if (report.sampleProductIds.length >= 3) return;
  const id = productIdFor(country, row);
  report.sampleProductIds.push(id);
  report.sampleProducts.push({
    id,
    name: row.productName,
    manufacturer: row.manufacturer || null,
    formulation: row.formulation || null,
    status,
    registrationStatus,
    labelVerified,
    activeIngredient: row.activeIngredient || null,
    registrationNumber: row.registrationNumber || null,
    approvedCrops: row.approvedCrops || [],
    approvedTargets: row.approvedTargets || [],
    expiresAt: row.expiresAt || null,
  });
}

export async function importOfficialPppRows(
  rows: OfficialPppImportRow[],
  meta: {
    country: OfficialPppCountry;
    filename?: string;
    kind?: OfficialPppImportReport["sourceProvenance"]["kind"];
    remoteBlocker?: string;
    dryRun?: boolean;
    /** Never set from plain upload — only explicit admin verify API */
    adminApproved?: boolean;
    verifiedBy?: string;
    trustedOfficialSource?: boolean;
    sourceDocumentId?: string;
  }
): Promise<OfficialPppImportReport> {
  const country = meta.country;
  const dryRun = meta.dryRun === true;
  const payload = JSON.stringify(rows);
  const sourceDocumentId =
    meta.sourceDocumentId ||
    `upload:${meta.filename || "unknown"}:${sha(payload).slice(0, 12)}`;

  const report: OfficialPppImportReport = {
    country,
    dryRun,
    totalProducts: rows.length,
    parsed: rows.length,
    validated: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    verified: 0,
    needsReview: 0,
    incomplete: 0,
    conflicts: 0,
    expired: 0,
    revoked: 0,
    failed: 0,
    errors: [],
    sampleProductIds: [],
    sampleProducts: [],
    sourceProvenance: {
      kind: meta.kind || "admin_upload",
      filename: meta.filename,
      checksum: sha(payload).slice(0, 16),
      importedAt: new Date().toISOString(),
      sourceDocumentId,
    },
    remoteBlocker: meta.remoteBlocker,
  };

  const writeGuard = shouldBlockFixtureDbWrite({
    kind: meta.kind,
    filename: meta.filename,
    dryRun,
  });
  if (writeGuard.block) {
    report.writeBlockedReason = writeGuard.reason;
  }

  const evaluateRow = (row: OfficialPppImportRow) => {
    const checksum = sha(
      `${row.registrationNumber}|${row.productName}|${row.expiresAt || ""}|${row.labelUrl || ""}|${row.activeIngredient || ""}`
    ).slice(0, 16);
    const revoked = /revok|bekor|запрещ|banned/i.test(
      row.registrationStatus || ""
    );
    // Plain file upload never passes adminApproved — VERIFIED impossible here
    return verifyProductRecord({
      registryRecordExists: true,
      registrationNumber: row.registrationNumber,
      registrationCountry: country,
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
      sourceDocumentId: row.sourceDocumentId || sourceDocumentId,
      trustedOfficialSource: meta.trustedOfficialSource === true,
      adminApproved: meta.adminApproved === true,
      verifiedBy: meta.verifiedBy,
      verifiedAt: meta.adminApproved ? new Date() : undefined,
      revoked,
      registrationStatus: row.registrationStatus,
      filename: meta.filename,
      importKind: meta.kind || "admin_upload",
    });
  };

  // Validate-only paths (offline, dryRun, fixture blocked)
  const validateOnly =
    !isDatabaseConfigured() || writeGuard.block || dryRun;

  if (validateOnly) {
    for (const row of rows) {
      const outcome = evaluateRow(row);
      report.validated++;
      tally(report, outcome.status);
      pushSample(
        report,
        row,
        country,
        outcome.status === "INCOMPLETE" ? "NEEDS_REVIEW" : outcome.status,
        outcome.registrationStatus,
        outcome.labelVerified
      );
    }
    return report;
  }

  const prisma = getPrisma();
  if (!prisma) return report;

  const sid = sourceIdFor(country);
  await prisma.source.upsert({
    where: { id: sid },
    create: {
      id: sid,
      title:
        country === "UZ"
          ? "Uzbekistan PPP Registry (admin import)"
          : "Kazakhstan PPP Registry (admin import)",
      organization:
        country === "UZ"
          ? "UZ quarantine / agrokomakchi official export"
          : "KZ official registry",
      url:
        country === "UZ"
          ? "https://agrokomakchi.uz/minerals/"
          : "https://www.gov.kz",
      accessedAt: new Date(),
      license: "official_public_registry",
      reliabilityScore: 0.9,
    },
    update: { accessedAt: new Date() },
  });

  const payloadSha = sha(payload);
  let persistedDocId = sourceDocumentId;
  try {
    const host =
      country === "UZ" ? "agrokomakchi.uz" : "gov.kz";
    const doc = await prisma.officialSourceDocument.upsert({
      where: {
        sha256_country: { sha256: payloadSha, country },
      },
      create: {
        country,
        officialSourceId: sid,
        officialHost: host,
        sha256: payloadSha,
        importedAt: new Date(),
        reviewStatus: "PENDING_REVIEW",
        filename: meta.filename || null,
        contentType: "text/csv",
        byteSize: Buffer.byteLength(payload, "utf8"),
      },
      update: {
        importedAt: new Date(),
        filename: meta.filename || null,
        // Never auto-APPROVE on re-import
        reviewStatus: "PENDING_REVIEW",
      },
    });
    persistedDocId = doc.id;
    report.sourceProvenance.sourceDocumentId = persistedDocId;
  } catch {
    // Table may be missing pre-migration — products stay unverifiable
    report.errors.push(
      "OfficialSourceDocument unavailable — imports stay NEEDS_REVIEW"
    );
  }

  for (const row of rows) {
    try {
      if (!row.productName?.trim() || !row.registrationNumber?.trim()) {
        report.skipped++;
        continue;
      }

      const checksum = sha(
        `${row.registrationNumber}|${row.productName}|${row.expiresAt || ""}|${row.labelUrl || ""}|${row.activeIngredient || ""}`
      ).slice(0, 16);
      const outcome = evaluateRow(row);
      report.validated++;
      tally(report, outcome.status);

      const productId = productIdFor(country, row);
      const existing = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, checksum: true },
      });

      // Import never promotes to VERIFIED — cap at NEEDS_REVIEW / EXPIRED / REVOKED
      let dbStatus: string =
        outcome.status === "INCOMPLETE" ? "NEEDS_REVIEW" : outcome.status;
      if (dbStatus === "VERIFIED") {
        dbStatus = "NEEDS_REVIEW";
        report.verified = Math.max(0, report.verified - 1);
        report.needsReview++;
        report.errors.push(
          `${row.productName}: VERIFIED blocked on upload path — use admin verify API`
        );
      }

      if (existing?.checksum === checksum && existing) {
        report.skipped++;
        pushSample(
          report,
          row,
          country,
          dbStatus,
          "UNKNOWN",
          false
        );
        continue;
      }

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

      const regStatus =
        dbStatus === "EXPIRED"
          ? "EXPIRED"
          : dbStatus === "REVOKED"
            ? "REVOKED"
            : "UNKNOWN";

      await prisma.product.upsert({
        where: { id: productId },
        create: {
          id: productId,
          name: row.productName,
          activeIngredientId: aiId,
          formulation: row.formulation
            ? row.concentration
              ? `${row.formulation} (${row.concentration})`
              : row.formulation
            : row.concentration || null,
          manufacturer: row.manufacturer,
          labelUrl: row.labelUrl || row.officialPdfUrl,
          labelVerified: false,
          status: dbStatus as never,
          registrationStatus: regStatus as never,
          qualityScore: 40,
          checksum,
          sourceDocumentId: persistedDocId,
          adminApproved: false,
          verifiedBy: null,
          verifiedAt: null,
        },
        update: {
          name: row.productName,
          activeIngredientId: aiId,
          formulation: row.formulation
            ? row.concentration
              ? `${row.formulation} (${row.concentration})`
              : row.formulation
            : row.concentration || null,
          manufacturer: row.manufacturer,
          labelUrl: row.labelUrl || row.officialPdfUrl,
          // Never keep stale VERIFIED from fixture re-import
          labelVerified: false,
          status: dbStatus as never,
          registrationStatus: regStatus as never,
          checksum,
          sourceDocumentId: persistedDocId,
          adminApproved: false,
          verifiedBy: null,
          verifiedAt: null,
        },
      });

      await prisma.productRegistration.upsert({
        where: {
          registrationCountry_registrationNumber: {
            registrationCountry: country,
            registrationNumber: row.registrationNumber,
          },
        },
        create: {
          productId,
          registrationCountry: country,
          registrationNumber: row.registrationNumber,
          approvedCrops: row.approvedCrops || [],
          approvedTargets: row.approvedTargets || [],
          expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
          status: dbStatus as never,
          registrationStatus: regStatus as never,
          checksum,
        },
        update: {
          productId,
          approvedCrops: row.approvedCrops || [],
          approvedTargets: row.approvedTargets || [],
          expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
          status: dbStatus as never,
          registrationStatus: regStatus as never,
          checksum,
        },
      });

      try {
        await prisma.adminAuditLog.create({
          data: {
            actorHash: "import",
            action: existing ? "product_import_update" : "product_import_create",
            entityType: "product",
            entityId: productId,
            detail: {
              status: dbStatus,
              registrationStatus: regStatus,
              filename: meta.filename,
              sourceDocumentId,
              labelVerified: false,
            },
          },
        });
      } catch {
        // audit table may be missing pre-migration
      }

      if (existing) report.updated++;
      else report.imported++;

      pushSample(
        report,
        row,
        country,
        dbStatus,
        regStatus,
        false
      );
    } catch (err) {
      report.failed++;
      report.errors.push(
        `${row.productName}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return report;
}

/**
 * Soft-demote products that lack official provenance (no hard delete).
 */
export async function demoteUntrustedProducts(input: {
  names?: string[];
  registrationNumbers?: string[];
  actorHash: string;
  reason: string;
}): Promise<{
  demoted: Array<{
    id: string;
    name: string;
    status: string;
    registrationStatus: string;
    labelVerified: boolean;
  }>;
  errors: string[];
}> {
  const demoted: Array<{
    id: string;
    name: string;
    status: string;
    registrationStatus: string;
    labelVerified: boolean;
  }> = [];
  const errors: string[] = [];
  const prisma = getPrisma();
  if (!prisma || !isDatabaseConfigured()) {
    return { demoted, errors: ["database_not_configured"] };
  }

  const or: Array<Record<string, unknown>> = [];
  if (input.names?.length) {
    for (const name of input.names) {
      or.push({ name: { contains: name, mode: "insensitive" } });
    }
  }
  if (input.registrationNumbers?.length) {
    or.push({
      registrations: {
        some: { registrationNumber: { in: input.registrationNumbers } },
      },
    });
  }
  if (!or.length) return { demoted, errors: ["no_selectors"] };

  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null, OR: or as never },
      select: { id: true, name: true },
    });
    for (const p of products) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          status: "NEEDS_REVIEW",
          registrationStatus: "UNKNOWN",
          labelVerified: false,
          adminApproved: false,
          verifiedBy: null,
          verifiedAt: null,
          qualityScore: 30,
        },
      });
      await prisma.productRegistration.updateMany({
        where: { productId: p.id },
        data: {
          status: "NEEDS_REVIEW",
          registrationStatus: "UNKNOWN",
        },
      });
      await prisma.adminAuditLog.create({
        data: {
          actorHash: input.actorHash,
          action: "product_demote_untrusted",
          entityType: "product",
          entityId: p.id,
          detail: {
            name: p.name,
            reason: input.reason,
            status: "NEEDS_REVIEW",
            registrationStatus: "UNKNOWN",
            labelVerified: false,
          },
        },
      });
      demoted.push({
        id: p.id,
        name: p.name,
        status: "NEEDS_REVIEW",
        registrationStatus: "UNKNOWN",
        labelVerified: false,
      });
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  return { demoted, errors };
}
