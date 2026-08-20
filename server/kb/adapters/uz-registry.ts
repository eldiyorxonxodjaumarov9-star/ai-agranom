/**
 * Uzbekistan official PPP registry adapter.
 *
 * Live remote status (2026-08-20 probe):
 * - agrokomakchi.uz: SPA shell only; robots.txt returns HTML (not robots rules).
 * - getway.karantin.uz/api/*: Bearer + egov SSO required; unauthenticated paths 404.
 * - reg.efito.uz: redirects to /signin; robots.txt 404.
 * - ToS link: akk.karantin.uz → PDF terms (login-gated API, not a public PPP dump).
 *
 * Policy: do NOT scrape authenticated SPAs or bypass robots/ToS.
 * Ingestion path: admin-uploaded official CSV / JSON / XLSX / text-PDF export.
 */
import { CatalogSourceAdapter } from "./catalog-adapter";

export type UzRegistryRemoteStatus = {
  adapterId: "uz-ppp-registry";
  liveFetchAllowed: false;
  blocker: string;
  probedAt: string;
  endpoints: Array<{
    url: string;
    status: number | null;
    note: string;
  }>;
  recommendedPath: "admin_csv_json_xlsx_pdf";
};

export const UZ_REGISTRY_BLOCKER =
  "UZ_OFFICIAL_REGISTRY_NO_PUBLIC_EXPORT: agrokomakchi.uz is an authenticated SPA (Bearer via getway.karantin.uz + egov SSO); reg.efito.uz requires sign-in; robots.txt is missing or non-compliant HTML. Commercial/official crawl fail-closed. Use admin CSV/JSON/XLSX/PDF import of an official export.";

/** Static probe result used by admin UI / health (no network required). */
export function getUzRegistryRemoteStatus(): UzRegistryRemoteStatus {
  return {
    adapterId: "uz-ppp-registry",
    liveFetchAllowed: false,
    blocker: UZ_REGISTRY_BLOCKER,
    probedAt: "2026-08-20",
    endpoints: [
      {
        url: "https://agrokomakchi.uz/minerals/",
        status: 200,
        note: "SPA HTML shell only — no public JSON/CSV dump",
      },
      {
        url: "https://agrokomakchi.uz/robots.txt",
        status: 200,
        note: "Returns SPA HTML, not robots rules — treat as fail-closed",
      },
      {
        url: "https://getway.karantin.uz/api/",
        status: 404,
        note: "API gateway requires Bearer; guessed public paths 404",
      },
      {
        url: "https://reg.efito.uz/",
        status: 307,
        note: "Redirects to /signin",
      },
      {
        url: "https://reg.efito.uz/robots.txt",
        status: 404,
        note: "Missing robots — fail-closed for automated crawl",
      },
    ],
    recommendedPath: "admin_csv_json_xlsx_pdf",
  };
}

/**
 * Optional live re-probe (admin/debug). Never scrapes product tables.
 */
export async function probeUzOfficialRegistryAccess(): Promise<UzRegistryRemoteStatus> {
  const base = getUzRegistryRemoteStatus();
  const endpoints: UzRegistryRemoteStatus["endpoints"] = [];
  for (const ep of base.endpoints) {
    try {
      const res = await fetch(ep.url, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "AgroOlamKnowledgeBot/1.0 (+https://ai-agranom.vercel.app; respect-robots)",
        },
      });
      endpoints.push({
        url: ep.url,
        status: res.status,
        note: ep.note,
      });
    } catch {
      endpoints.push({
        url: ep.url,
        status: null,
        note: `${ep.note} (fetch failed)`,
      });
    }
  }
  return {
    ...base,
    probedAt: new Date().toISOString(),
    endpoints,
    liveFetchAllowed: false,
    blocker: UZ_REGISTRY_BLOCKER,
  };
}

/**
 * Catalog adapter for curated excerpts only (no live PPP scrape).
 * Product rows enter via admin official-file import.
 */
export class UzbekistanOfficialRegistryAdapter extends CatalogSourceAdapter {
  readonly id = "uz-ppp-registry";
  protected catalogFile = "uz-ppp.json";

  async fetchIndex() {
    // Live remote dump blocked — catalog may be empty until admin import / curated file.
    return super.fetchIndex();
  }
}
