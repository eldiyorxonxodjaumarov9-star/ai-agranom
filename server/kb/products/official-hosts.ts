/**
 * Trusted official registry hosts — HTTPS hostname allowlist only.
 * Arbitrary HTTPS is NOT official.
 */
const TRUSTED_OFFICIAL_HOSTS = new Set([
  "akk.karantin.uz",
  "agrokomakchi.uz",
  "www.gov.kz",
  "gov.kz",
  "adilet.zan.kz",
]);

const BLOCKED_HOST_RE =
  /^(example\.|localhost$|127\.0\.0\.1$|0\.0\.0\.0$|\[::1\])/i;

export function isTrustedOfficialHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  if (BLOCKED_HOST_RE.test(hostname) || BLOCKED_HOST_RE.test(h)) return false;
  if (/^(fixture|sample|test|demo|mock)\./i.test(h)) return false;
  return (
    TRUSTED_OFFICIAL_HOSTS.has(hostname.toLowerCase()) ||
    TRUSTED_OFFICIAL_HOSTS.has(h) ||
    TRUSTED_OFFICIAL_HOSTS.has(`www.${h}`)
  );
}

export function parseOfficialLabelUrl(
  url?: string | null
): { ok: true; host: string } | { ok: false; reason: string } {
  if (!url?.trim()) return { ok: false, reason: "missing_label_url" };
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, reason: "invalid_label_url" };
  }
  if (u.protocol !== "https:") return { ok: false, reason: "label_not_https" };
  if (!isTrustedOfficialHost(u.hostname)) {
    return { ok: false, reason: "label_host_not_trusted" };
  }
  return { ok: true, host: u.hostname.toLowerCase() };
}

export { TRUSTED_OFFICIAL_HOSTS };
