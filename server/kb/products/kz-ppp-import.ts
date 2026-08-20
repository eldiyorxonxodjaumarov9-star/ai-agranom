/**
 * KZ PPP registry import — thin wrapper over official-ppp-import.
 * Kept for backward-compatible CLI/scripts.
 */
import {
  importOfficialPppRows,
  parseOfficialPppCsv,
  parseOfficialPppJson,
  type OfficialPppImportReport,
  type OfficialPppImportRow,
} from "./official-ppp-import";

export type KzPppImportRow = OfficialPppImportRow;
export type KzPppImportReport = OfficialPppImportReport;

export function parseKzPppCsv(csv: string): KzPppImportRow[] {
  return parseOfficialPppCsv(csv, "KZ");
}

export function parseKzPppJson(raw: string): KzPppImportRow[] {
  return parseOfficialPppJson(raw, "KZ");
}

export async function importKzPppRows(
  rows: KzPppImportRow[],
  meta: {
    filename?: string;
    kind?: "admin_upload" | "catalog";
    dryRun?: boolean;
  }
): Promise<KzPppImportReport> {
  return importOfficialPppRows(rows, {
    country: "KZ",
    filename: meta.filename,
    kind: meta.kind,
    dryRun: meta.dryRun,
    adminApproved: false,
    trustedOfficialSource: false,
  });
}
