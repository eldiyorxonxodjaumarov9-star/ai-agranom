#!/usr/bin/env node
/**
 * Secret scan for changed files vs origin/main (CI).
 * Patterns are assembled so this file does not self-match.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SKIP = new Set([
  "package-lock.json",
  ".env.example",
]);
const SKIP_EXT = [".png", ".jpg", ".woff2", ".pack"];

function listFiles() {
  try {
    execSync("git fetch origin main --depth=1", { stdio: "ignore" });
  } catch {
    /* optional */
  }
  try {
    return execSync("git diff --name-only origin/main...HEAD", { encoding: "utf8" })
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return execSync("git ls-files", { encoding: "utf8" })
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

const openAiKey = new RegExp("sk-" + "[A-Za-z0-9]{20,}");
const rsaHeader = new RegExp("BEGIN " + "RSA PRIVATE " + "KEY");
const vercelTok = new RegExp("vercel_" + "[A-Za-z0-9_]{24,}");
const dbCred = new RegExp(
  "postgres(?:ql)?://" + "[^\\s/:]+:[^\\s/@]+@[^\\s]+"
);

const files = listFiles();
for (const f of files) {
  if (!f || !fs.existsSync(f) || !fs.statSync(f).isFile()) continue;
  if (SKIP.has(f) || SKIP_EXT.some((e) => f.endsWith(e))) continue;
  if (f === "scripts/ci-secret-scan.js") continue;
  const text = fs.readFileSync(f, "utf8");
  if (openAiKey.test(text) || rsaHeader.test(text) || vercelTok.test(text)) {
    console.error("Possible secret in", f);
    process.exit(1);
  }
  const dbHits = text.split(/\r?\n/).filter((line) => dbCred.test(line));
  const bad = dbHits.filter(
    (line) =>
      !/127\.0\.0\.1|localhost|ci:ci@|example\.|your_|changeme|\.\.\./.test(line)
  );
  if (bad.length) {
    console.error("Possible DB credential in", f);
    process.exit(1);
  }
}

console.log("SECRET_SCAN: clean");
