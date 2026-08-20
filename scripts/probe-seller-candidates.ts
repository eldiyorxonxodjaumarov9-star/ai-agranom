/**
 * Probe seller candidate domains (robots/ToS/JSON-LD) — no crawl enable.
 */
const DOMAINS = [
  "gozaltabiat.uz",
  "anguzalagro.uz",
  "bizkim.uz",
  "namunagroup.com",
  "pengsheng.uz",
];

async function probe(domain: string) {
  const base = `https://${domain}`;
  const out: Record<string, unknown> = { domain, baseUrl: base };
  try {
    const robotsRes = await fetch(`${base}/robots.txt`, {
      redirect: "follow",
      headers: { "User-Agent": "AgroOlamKnowledgeBot/1.0 (discovery; no-crawl)" },
    });
    const robotsBody = await robotsRes.text();
    const robotsIsHtml = /<html|<!doctype/i.test(robotsBody.slice(0, 200));
    const disallowAll =
      /(^|\n)\s*disallow:\s*\/\s*(\n|$)/i.test(robotsBody) &&
      !/(^|\n)\s*allow:\s*\/\s*(\n|$)/i.test(robotsBody);
    out.robots = {
      status: robotsRes.status,
      isHtml: robotsIsHtml,
      disallowAll,
      snip: robotsIsHtml
        ? "[html]"
        : robotsBody.slice(0, 180).replace(/\s+/g, " "),
    };
  } catch (e) {
    out.robots = { error: e instanceof Error ? e.message : String(e) };
  }

  try {
    const home = await fetch(base + "/", {
      redirect: "follow",
      headers: { "User-Agent": "AgroOlamKnowledgeBot/1.0 (discovery; no-crawl)" },
    });
    const html = await home.text();
    const hasJsonLd = /application\/ld\+json/i.test(html);
    const looksShop =
      /product|narx|price|catalog|shop|магазин|дорихона/i.test(html);
    out.home = {
      status: home.status,
      finalUrl: home.url,
      pageType: looksShop ? "likely_commerce_or_catalog" : "unknown_or_marketing",
      hasJsonLd,
      len: html.length,
    };
  } catch (e) {
    out.home = { error: e instanceof Error ? e.message : String(e) };
  }

  // Common ToS paths — existence only
  const tosPaths = ["/terms", "/tos", "/privacy", "/oferta", "/shartlar"];
  const tosHits: string[] = [];
  for (const p of tosPaths) {
    try {
      const r = await fetch(base + p, {
        method: "HEAD",
        redirect: "manual",
        headers: { "User-Agent": "AgroOlamKnowledgeBot/1.0 (discovery; no-crawl)" },
      });
      if (r.status > 0 && r.status < 400) tosHits.push(`${p}:${r.status}`);
    } catch {
      /* ignore */
    }
  }
  out.tosCandidates = tosHits;

  const robots = out.robots as { status?: number; isHtml?: boolean; disallowAll?: boolean; error?: string };
  const home = out.home as { status?: number; hasJsonLd?: boolean; error?: string };
  let crawlAllowed = false;
  let crawlNote = "pending_admin_review";
  if (robots.error || home.error) {
    crawlNote = "fetch_failed_fail_closed";
  } else if (robots.isHtml || robots.status === 404) {
    crawlNote = "robots_missing_or_html_fail_closed";
  } else if (robots.disallowAll) {
    crawlNote = "robots_disallow_all";
  } else {
    crawlAllowed = false; // still false until admin enables
    crawlNote = "robots_present_but_crawl_disabled_until_admin_approve";
  }
  out.crawlEnabled = false;
  out.crawlRecommendation = crawlNote;
  out.wouldAllowAfterReview = crawlAllowed === false && crawlNote.includes("robots_present");

  return out;
}

async function main() {
  const results = [];
  for (const d of DOMAINS) {
    results.push(await probe(d));
  }
  console.log(JSON.stringify({ ok: true, crawlEnabled: false, results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
