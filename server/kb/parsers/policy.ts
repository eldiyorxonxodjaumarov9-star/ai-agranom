/**
 * Crawl/robots policy helpers for seller parsers.
 * Commercial/unknown sources: robots fetch failure => fail-closed.
 */

export type RobotsPolicyMode = "official" | "commercial";

/** Parse robots.txt body locally (no network). */
export function pathAllowedByRobotsText(
  robotsTxt: string,
  path: string
): boolean {
  const lines = robotsTxt.split(/\r?\n/);
  let applies = false;
  const disallows: string[] = [];
  const allows: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    if (/^user-agent:\s*\*/i.test(t)) {
      applies = true;
      continue;
    }
    if (/^user-agent:/i.test(t)) {
      applies = false;
      continue;
    }
    if (!applies) continue;
    const d = t.match(/^disallow:\s*(.*)$/i);
    if (d) {
      disallows.push(d[1].trim());
      continue;
    }
    const a = t.match(/^allow:\s*(.*)$/i);
    if (a) allows.push(a[1].trim());
  }
  if (allows.some((a) => a && path.startsWith(a))) return true;
  return !disallows.some((d) => d && path.startsWith(d));
}

export function assertRobotsAllowed(input: {
  robotsTxt: string | null;
  fetchFailed: boolean;
  path: string;
  mode: RobotsPolicyMode;
}): { allowed: boolean; reason: string } {
  if (input.fetchFailed) {
    if (input.mode === "commercial") {
      return { allowed: false, reason: "robots_fetch_failed_fail_closed" };
    }
    return { allowed: false, reason: "robots_fetch_failed" };
  }
  if (input.robotsTxt == null) {
    return {
      allowed: input.mode !== "commercial",
      reason:
        input.mode === "commercial"
          ? "robots_missing_fail_closed"
          : "robots_missing",
    };
  }
  const ok = pathAllowedByRobotsText(input.robotsTxt, input.path);
  return { allowed: ok, reason: ok ? "allowed" : "robots_deny" };
}

export function isOfferFresh(
  lastCheckedAt: Date | string | null | undefined,
  maxAgeHours = 72
): boolean {
  if (!lastCheckedAt) return false;
  const t = new Date(lastCheckedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= maxAgeHours * 3600_000;
}
