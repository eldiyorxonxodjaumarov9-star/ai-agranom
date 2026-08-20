/**
 * Seller / agro-pharmacy offer parser.
 * Only admin-allowlisted domains. Prefer JSON-LD / API; else sanitized HTML.
 * Seller data NEVER upgrades Product to VERIFIED.
 */
import { createHash } from "crypto";
import { assertRobotsAllowed } from "../parsers/policy";
import { normalizeTradeName } from "../products/recommend-gate";

export type ParsedSellerOffer = {
  tradeName: string;
  activeIngredient?: string;
  concentration?: string;
  formulation?: string;
  packSize?: string;
  manufacturer?: string;
  price?: number;
  currency?: string;
  stockStatus?: string;
  sourceUrl: string;
  parseMethod: "json_ld" | "api_json" | "html";
  checksum: string;
};

function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(raw: unknown): { price?: number; currency?: string } {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { price: raw };
  }
  if (typeof raw === "object" && raw && "value" in (raw as object)) {
    const o = raw as { value?: unknown; currency?: unknown };
    const n = Number(o.value);
    return {
      price: Number.isFinite(n) ? n : undefined,
      currency: o.currency ? String(o.currency) : undefined,
    };
  }
  if (typeof raw === "string") {
    const currency =
      /UZS|so'm|сум/i.test(raw)
        ? "UZS"
        : /USD|\$/.test(raw)
          ? "USD"
          : /EUR|€/.test(raw)
            ? "EUR"
            : undefined;
    const n = Number(raw.replace(/[^\d.,]/g, "").replace(",", "."));
    return { price: Number.isFinite(n) ? n : undefined, currency };
  }
  return {};
}

function offerChecksum(parts: Record<string, unknown>): string {
  return sha(JSON.stringify(parts)).slice(0, 16);
}

/** Extract Product JSON-LD blocks from HTML. */
export function parseJsonLdOffers(
  html: string,
  sourceUrl: string
): ParsedSellerOffer[] {
  const out: ParsedSellerOffer[] = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1].trim()) as unknown;
      const nodes = Array.isArray(data)
        ? data
        : data && typeof data === "object" && "@graph" in (data as object)
          ? ((data as { "@graph": unknown[] })["@graph"] as unknown[])
          : [data];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const o = node as Record<string, unknown>;
        const type = String(o["@type"] || "");
        if (!/Product/i.test(type)) continue;
        const name = String(o.name || "").trim();
        if (!name) continue;
        const offers = o.offers;
        const offerObj = Array.isArray(offers) ? offers[0] : offers;
        const priceInfo = parsePrice(
          offerObj && typeof offerObj === "object"
            ? (offerObj as { price?: unknown; priceCurrency?: unknown })
                .price ?? offerObj
            : undefined
        );
        const currency =
          priceInfo.currency ||
          (offerObj && typeof offerObj === "object"
            ? String(
                (offerObj as { priceCurrency?: unknown }).priceCurrency || ""
              ) || undefined
            : undefined);
        const availability =
          offerObj && typeof offerObj === "object"
            ? String(
                (offerObj as { availability?: unknown }).availability || ""
              )
            : "";
        const brand =
          o.brand && typeof o.brand === "object"
            ? String((o.brand as { name?: unknown }).name || "")
            : o.brand
              ? String(o.brand)
              : undefined;
        const parsed: ParsedSellerOffer = {
          tradeName: name,
          manufacturer: brand,
          packSize: o.size ? String(o.size) : undefined,
          price: priceInfo.price,
          currency: currency || "UZS",
          stockStatus: /InStock/i.test(availability)
            ? "in_stock"
            : /OutOfStock/i.test(availability)
              ? "out_of_stock"
              : availability || undefined,
          sourceUrl,
          parseMethod: "json_ld",
          checksum: "",
        };
        parsed.checksum = offerChecksum({
          tradeName: parsed.tradeName,
          price: parsed.price,
          currency: parsed.currency,
          stock: parsed.stockStatus,
          url: sourceUrl,
        });
        out.push(parsed);
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return out;
}

/** Parse a product API JSON object (seller-provided). */
export function parseSellerApiProduct(
  data: Record<string, unknown>,
  sourceUrl: string
): ParsedSellerOffer | null {
  const name = String(
    data.name || data.title || data.tradeName || data.productName || ""
  ).trim();
  if (!name) return null;
  const priceInfo = parsePrice(data.price ?? data.amount);
  const parsed: ParsedSellerOffer = {
    tradeName: name,
    activeIngredient: data.activeIngredient
      ? String(data.activeIngredient)
      : data.ai
        ? String(data.ai)
        : undefined,
    concentration: data.concentration
      ? String(data.concentration)
      : undefined,
    formulation: data.formulation ? String(data.formulation) : undefined,
    packSize: data.packSize
      ? String(data.packSize)
      : data.pack
        ? String(data.pack)
        : undefined,
    manufacturer: data.manufacturer
      ? String(data.manufacturer)
      : data.brand
        ? String(data.brand)
        : undefined,
    price: priceInfo.price,
    currency: priceInfo.currency || String(data.currency || "UZS"),
    stockStatus: data.stockStatus
      ? String(data.stockStatus)
      : data.inStock === true
        ? "in_stock"
        : data.inStock === false
          ? "out_of_stock"
          : undefined,
    sourceUrl,
    parseMethod: "api_json",
    checksum: "",
  };
  parsed.checksum = offerChecksum({
    tradeName: parsed.tradeName,
    price: parsed.price,
    currency: parsed.currency,
    stock: parsed.stockStatus,
    url: sourceUrl,
  });
  return parsed;
}

/**
 * Sanitized HTML fallback — conservative field heuristics (no raw HTML retained).
 */
export function parseSellerHtmlProduct(
  html: string,
  sourceUrl: string
): ParsedSellerOffer | null {
  const text = stripTags(html);
  if (text.length < 8) return null;

  const titleMatch =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const tradeName = titleMatch
    ? stripTags(titleMatch[1]).slice(0, 200)
    : text.slice(0, 80);
  if (!tradeName) return null;

  const ai =
    text.match(
      /(?:active\s*ingredient|ta['']?sir\s*etu[vw]chi\s*modda|действующ\w*\s*веществ\w*)\s*[:\-–]\s*([^.;\n]{2,80})/i
    )?.[1]?.trim();
  const concentration =
    text.match(
      /(?:concentration|konsentratsiya|концентрац\w*)\s*[:\-–]\s*([^.;\n]{1,40})/i
    )?.[1]?.trim() ||
    text.match(/(\d+[.,]?\d*\s*(?:g\/l|g\/kg|%|мг\/л|г\/л))/i)?.[1];
  const formulation =
    text.match(
      /\b(SC|WG|WP|EC|SL|OD|FS|CS|SE|ME|GR|SP)\b/
    )?.[1] ||
    text.match(
      /(?:formulation|formulatsiya|препаратная\s*форма)\s*[:\-–]\s*([^.;\n]{1,40})/i
    )?.[1]?.trim();
  const packSize =
    text.match(
      /(?:pack|qadoq|упаковк\w*)\s*[:\-–]\s*([^.;\n]{1,40})/i
    )?.[1]?.trim() ||
    text.match(/(\d+[.,]?\d*\s*(?:ml|l|g|kg|мл|л|г|кг))/i)?.[1];
  const manufacturer =
    text.match(
      /(?:manufacturer|ishlab\s*chiqaruvchi|производител\w*)\s*[:\-–]\s*([^.;\n]{2,80})/i
    )?.[1]?.trim();
  const priceInfo = parsePrice(
    text.match(
      /(?:price|narx|цена)\s*[:\-–]?\s*([\d\s.,]+\s*(?:UZS|USD|EUR|so'?m|сум)?)/i
    )?.[1]
  );
  const stockStatus = /out\s*of\s*stock|mavjud\s*emas|нет\s*в\s*наличии/i.test(
    text
  )
    ? "out_of_stock"
    : /in\s*stock|mavjud|в\s*наличии/i.test(text)
      ? "in_stock"
      : undefined;

  const parsed: ParsedSellerOffer = {
    tradeName,
    activeIngredient: ai,
    concentration,
    formulation,
    packSize,
    manufacturer,
    price: priceInfo.price,
    currency: priceInfo.currency || "UZS",
    stockStatus,
    sourceUrl,
    parseMethod: "html",
    checksum: "",
  };
  parsed.checksum = offerChecksum({
    tradeName: parsed.tradeName,
    price: parsed.price,
    currency: parsed.currency,
    stock: parsed.stockStatus,
    url: sourceUrl,
  });
  return parsed;
}

export function parseSellerPage(
  htmlOrJson: string,
  sourceUrl: string,
  contentType?: string
): ParsedSellerOffer[] {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("json") || /^\s*[\[{]/.test(htmlOrJson.trim())) {
    try {
      const data = JSON.parse(htmlOrJson) as unknown;
      if (Array.isArray(data)) {
        return data
          .map((x) =>
            x && typeof x === "object"
              ? parseSellerApiProduct(x as Record<string, unknown>, sourceUrl)
              : null
          )
          .filter(Boolean) as ParsedSellerOffer[];
      }
      if (data && typeof data === "object") {
        const one = parseSellerApiProduct(
          data as Record<string, unknown>,
          sourceUrl
        );
        return one ? [one] : [];
      }
    } catch {
      // fall through to HTML
    }
  }

  const jsonLd = parseJsonLdOffers(htmlOrJson, sourceUrl);
  if (jsonLd.length) return jsonLd;

  const htmlOne = parseSellerHtmlProduct(htmlOrJson, sourceUrl);
  return htmlOne ? [htmlOne] : [];
}

export function assertSellerDomainAllowed(input: {
  domain: string;
  allowlist: string[];
  robotsTxt: string | null;
  robotsFetchFailed: boolean;
  path: string;
}): { allowed: boolean; reason: string } {
  const host = input.domain.toLowerCase().replace(/^www\./, "");
  const ok = input.allowlist.some(
    (d) => d.toLowerCase().replace(/^www\./, "") === host
  );
  if (!ok) return { allowed: false, reason: "domain_not_allowlisted" };
  return assertRobotsAllowed({
    robotsTxt: input.robotsTxt,
    fetchFailed: input.robotsFetchFailed,
    path: input.path,
    mode: "commercial",
  });
}

/** Map offer trade name to a VERIFIED product id only via existing aliases/names — never verify. */
export function matchOfferToVerifiedProductId(input: {
  tradeName: string;
  candidates: Array<{
    id: string;
    name: string;
    status: string;
    registrationStatus: string;
  }>;
}): string | null {
  const norm = normalizeTradeName(input.tradeName);
  for (const c of input.candidates) {
    if (c.status !== "VERIFIED" || c.registrationStatus !== "ACTIVE") continue;
    if (normalizeTradeName(c.name) === norm) return c.id;
  }
  return null;
}
