/**
 * Block private/link-local/metadata destinations before outbound fetch.
 */
import { lookup } from "dns/promises";
import { isIP } from "net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);

export function isPrivateIp(ip: string): boolean {
  const v = ip.trim().toLowerCase();
  if (v === "::1" || v === "0.0.0.0") return true;
  if (v.startsWith("127.")) return true;
  if (v.startsWith("10.")) return true;
  if (v.startsWith("192.168.")) return true;
  if (v.startsWith("169.254.")) return true;
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
  const m = v.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

export async function assertSafeOutboundUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("invalid_url");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("protocol_not_allowed");
  }
  if (process.env.NODE_ENV === "production" && u.protocol !== "https:") {
    throw new Error("https_required");
  }
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("host_blocked");
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("private_ip_blocked");
  } else {
    const addrs = await lookup(host, { all: true });
    for (const a of addrs) {
      if (isPrivateIp(a.address)) throw new Error("resolved_private_ip");
    }
  }
  const allow = (process.env.KB_FETCH_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length > 0) {
    const ok = allow.some(
      (a) => host === a || host.endsWith(`.${a}`)
    );
    if (!ok) throw new Error("host_not_allowlisted");
  }
  return u;
}
