"use client";

import { useState } from "react";

/**
 * Admin KZ PPP import — official CSV/JSON only (no scraping).
 */
export default function AdminKbProductsImportPage() {
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("agro-admin-token") || "";
  });
  const [fileText, setFileText] = useState("");
  const [filename, setFilename] = useState("upload.csv");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const saveToken = (v: string) => {
    setToken(v);
    sessionStorage.setItem("agro-admin-token", v);
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    setFilename(f.name);
    const text = await f.text();
    setFileText(text);
  };

  const submit = async () => {
    if (!token) {
      setError("AGRO_API_KEY kerak");
      return;
    }
    if (!fileText.trim()) {
      setError("CSV yoki JSON fayl yuklang");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kb/products/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename,
          content: fileText,
          format: filename.toLowerCase().endsWith(".json") ? "json" : "csv",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import xatosi");
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
            KZ PPP registry import
          </h1>
          <p className="text-sm text-ink-muted max-w-2xl">
            Faqat rasmiy CSV/JSON eksport. Google scraping yo‘q. XLSX bo‘lsa
            avval CSV qilib eksport qiling. Mahsulotlar avtomatik VERIFIED
            bo‘lmaydi — checklist o‘tgachgina.
          </p>
        </header>

        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">Bearer AGRO_API_KEY</span>
          <input
            type="password"
            className="w-full rounded-xl border border-line bg-canvas-elevated px-3 py-2"
            value={token}
            onChange={(e) => saveToken(e.target.value)}
            autoComplete="off"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-ink-muted">Official file (CSV / JSON)</span>
          <input
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
        </label>

        <button
          type="button"
          className="btn-primary"
          disabled={loading}
          onClick={submit}
        >
          {loading ? "Import…" : "Import & verify checklist"}
        </button>

        {error && (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <pre className="overflow-auto rounded-xl border border-line bg-canvas-elevated p-4 text-xs max-h-[60vh]">
          {result
            ? JSON.stringify(result, null, 2)
            : "Natija shu yerda. verifiedProducts=0 normal — rasmiy maydonlar to‘liq bo‘lmaguncha."}
        </pre>
      </div>
    </main>
  );
}
