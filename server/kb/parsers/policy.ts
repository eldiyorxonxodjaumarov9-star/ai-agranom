/**
 * Crawl/robots policy helpers for seller parsers.
 * Commercial/unknown sources: robots fetch failure => fail-closed.
 *
 * Matching: longest-match wins; equal length → Allow beats Disallow (Google-style).
 * Supports * wildcards and end-anchor $.
 */

export type RobotsPolicyMode = "official" | "commercial";

function robotsPatternToRegExp(pattern: string): RegExp {
  let p = pattern.trim();
  if (!p) return /^/; // empty Allow/Disallow → match everything / nothing special
  const endAnchor = p.endsWith("$");
  if (endAnchor) p = p.slice(0, -1);
  const escaped = p
    .replace(/[.+?^{}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}${endAnchor ? "$" : ""}`);
}

function patternLength(pattern: string): number {
  return pattern.replace(/\$$/, "").replace(/\*/g, "").length;
}

/** Parse robots.txt body locally (no network). */
export function pathAllowedByRobotsText(
  robotsTxt: string,
  path: string
): boolean {
  const lines = robotsTxt.split(/\r?\n/);
  let applies = false;
  const rules: Array<{ type: "allow" | "disallow"; pattern: string }> = [];

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
      rules.push({ type: "disallow", pattern: d[1].trim() });
      continue;
    }
    const a = t.match(/^allow:\s*(.*)$/i);
    if (a) {
      rules.push({ type: "allow", pattern: a[1].trim() });
    }
  }

  // Empty Disallow means allow all for that agent group when no other match
  let bestLen = -1;
  let bestType: "allow" | "disallow" | null = null;

  for (const rule of rules) {
    if (rule.type === "disallow" && rule.pattern === "") continue; // empty disallow = allow all
    if (rule.type === "allow" && rule.pattern === "") {
      // empty allow is unusual; treat as allow all with length 0
      if (0 > bestLen || (0 === bestLen && bestType === "disallow")) {
        bestLen = 0;
        bestType = "allow";
      }
      continue;
    }
    const re = robotsPatternToRegExp(rule.pattern);
    if (!re.test(path)) continue;
    const len = patternLength(rule.pattern);
    if (
      len > bestLen ||
      (len === bestLen && rule.type === "allow" && bestType === "disallow")
    ) {
      bestLen = len;
      bestType = rule.type;
    }
  }

  if (bestType == null) return true;
  return bestType === "allow";
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
