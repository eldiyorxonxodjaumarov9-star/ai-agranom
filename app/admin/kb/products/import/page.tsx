"use client";

import { useEffect, useState } from "react";

/**
 * Official PPP import (UZ / KZ) — CSV / JSON / XLSX / PDF.
 * Uses httpOnly admin cookie session (same as /admin/kb).
 */
export default function AdminKbProductsImportPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [bootToken, setBootToken] = useState("");
  const [country, setCountry] = useState<"UZ" | "KZ">("UZ");
  const [fileText, setFileText] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [filename, setFilename] = useState("upload.csv");
  const [format, setFormat] = useState<"csv" | "json" | "xlsx" | "pdf">("csv");
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<unknown>(null);
  const [remoteStatus, setRemoteStatus] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openSession = async () => {
    if (!bootToken.trim()) {
      setError("AGRO_API_KEY kiriting — cookie session ochiladi.");
      return;
    }
    setError(null);
    const res = await fetch("/api/admin/session", {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${bootToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!res.ok) {
      setError("Session ochilmadi — kalitni tekshiring.");
      setSessionReady(false);
      return;
    }
    setBootToken("");
    setSessionReady(true);
    try {
      sessionStorage.removeItem("agro-admin-token");
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!sessionReady) return;
    fetch("/api/admin/kb/products/import", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setRemoteStatus(j))
      .catch(() => setRemoteStatus(null));
  }, [sessionReady]);

  const onFile = async (f: File | null) => {
    if (!f) return;
    setFilename(f.name);
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      setFormat("xlsx");
      const buf = await f.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      setFileBase64(btoa(binary));
      setFileText("");
    } else if (lower.endsWith(".pdf")) {
      setFormat("pdf");
      const buf = await f.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      setFileBase64(btoa(binary));
      setFileText("");
    } else if (lower.endsWith(".json")) {
      setFormat("json");
      setFileText(await f.text());
      setFileBase64("");
    } else {
      setFormat("csv");
      setFileText(await f.text());
      setFileBase64("");
    }
  };

  const submit = async () => {
    if (!sessionReady) {
      setError("Avval admin session oching.");
      return;
    }
    if (!fileText.trim() && !fileBase64.trim()) {
      setError("Rasmiy CSV/JSON/XLSX/PDF yuklang");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kb/products/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          format,
          country,
          dryRun,
          content: fileText || undefined,
          contentBase64: fileBase64 || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.hint || "Import xatosi");
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-canvas text-ink px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm text-ink-muted">
            <a href="/admin/kb" className="underline">
              ← KB Admin
            </a>
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Rasmiy PPP registry import
          </h1>
          <p className="text-sm text-ink-muted max-w-2xl">
            UZ live SPA/API dump bloklangan (SSO). Faqat rasmiy CSV/JSON/XLSX/PDF
            eksport. Seller ma’lumoti VERIFIED qilmaydi.
          </p>
        </header>

        <div className="flex flex-wrap gap-2 items-end">
          <label className="block space-y-1 text-sm grow">
            <span className="text-ink-muted">
              AGRO_API_KEY (bir marta — httpOnly cookie)
              {sessionReady ? " · session ochiq" : ""}
            </span>
            <input
              type="password"
              className="w-full rounded-xl border border-line bg-canvas-elevated px-3 py-2"
              value={bootToken}
              onChange={(e) => setBootToken(e.target.value)}
              autoComplete="off"
              disabled={sessionReady}
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            onClick={openSession}
            disabled={sessionReady}
          >
            Session
          </button>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">Mamlakat</span>
          <select
            className="w-full rounded-xl border border-line bg-canvas-elevated px-3 py-2"
            value={country}
            onChange={(e) => setCountry(e.target.value as "UZ" | "KZ")}
          >
            <option value="UZ">O‘zbekiston (UZ)</option>
            <option value="KZ">Qozog‘iston (KZ)</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">
            Official file (CSV / JSON / XLSX / PDF)
          </span>
          <input
            type="file"
            accept=".csv,.json,.xlsx,.xls,.pdf,text/csv,application/json,application/pdf"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
          />
          <span>dryRun (preview — DB yozilmaydi). Default ON.</span>
        </label>

        <button
          type="button"
          className="btn-primary"
          disabled={loading || !sessionReady}
          onClick={submit}
        >
          {loading ? "Import…" : "Import & verify checklist"}
        </button>

        {error && (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
            {error}
          </p>
        )}

        {remoteStatus != null && (
          <pre className="overflow-auto rounded-xl border border-line bg-canvas-elevated p-4 text-xs max-h-[30vh]">
            {JSON.stringify(remoteStatus, null, 2)}
          </pre>
        )}

        <pre className="overflow-auto rounded-xl border border-line bg-canvas-elevated p-4 text-xs max-h-[60vh]">
          {result
            ? JSON.stringify(result, null, 2)
            : "Natija shu yerda (imported/updated/skipped/failed)."}
        </pre>
      </div>
    </main>
  );
}
