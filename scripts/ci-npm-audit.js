#!/usr/bin/env node
/**
 * CI dependency audit gate.
 * - critical → always fail
 * - high → fail unless GHSA is listed in DOCUMENTED_HIGH_EXCEPTIONS with rationale
 * Never treat `npm audit || true` as PASS.
 */
const { execSync } = require("child_process");

/** @type {Record<string, { reason: string; reviewed: string }>} */
const DOCUMENTED_HIGH_EXCEPTIONS = {
  // Empty after sharp override; keep structure for future justified exceptions only.
};

let raw;
try {
  raw = execSync("npm audit --omit=dev --json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (e) {
  raw = e.stdout || "";
  if (!raw) {
    console.error("npm audit failed with no JSON output");
    process.exit(1);
  }
}

let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error("npm audit JSON parse failed");
  process.exit(1);
}

const vulns = report.vulnerabilities || {};
const critical = [];
const high = [];
const highBlocked = [];

for (const [name, v] of Object.entries(vulns)) {
  const sev = v.severity;
  const vias = Array.isArray(v.via) ? v.via : [];
  const ghsas = vias
    .filter((x) => x && typeof x === "object")
    .map((x) => {
      const url = String(x.url || "");
      const m = url.match(/GHSA-[a-z0-9-]+/i);
      return m ? m[0].toUpperCase() : null;
    })
    .filter(Boolean);

  if (sev === "critical") {
    critical.push({ name, ghsas, range: v.range });
  } else if (sev === "high") {
    high.push({ name, ghsas, range: v.range });
    const allowed = ghsas.length > 0 && ghsas.every((g) => DOCUMENTED_HIGH_EXCEPTIONS[g]);
    // Also allow if the package itself is not reported via GHSA objects but still high:
    // require explicit exception key by package name as fallback.
    const pkgAllowed = Boolean(DOCUMENTED_HIGH_EXCEPTIONS[`pkg:${name}`]);
    if (!allowed && !pkgAllowed) {
      highBlocked.push({ name, ghsas, range: v.range });
    } else {
      const keys = ghsas.length ? ghsas : [`pkg:${name}`];
      for (const k of keys) {
        const ex = DOCUMENTED_HIGH_EXCEPTIONS[k];
        if (ex) {
          console.log(
            `HIGH_EXCEPTION_OK: ${k} (${name}) — ${ex.reason} [reviewed ${ex.reviewed}]`
          );
        }
      }
    }
  }
}

const meta = report.metadata?.vulnerabilities || {};
console.log(
  `AUDIT_SUMMARY: critical=${meta.critical || 0} high=${meta.high || 0} moderate=${meta.moderate || 0} low=${meta.low || 0}`
);

if (critical.length) {
  console.error("CRITICAL vulnerabilities (must fix):", JSON.stringify(critical));
  process.exit(1);
}
if (highBlocked.length) {
  console.error(
    "HIGH vulnerabilities without documented exception:",
    JSON.stringify(highBlocked)
  );
  process.exit(1);
}

console.log("AUDIT_GATE: PASS");
process.exit(0);
