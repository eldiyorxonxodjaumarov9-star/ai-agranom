"use client";

import { useCallback, useMemo, useState } from "react";

type TabId =
  | "sync-jobs"
  | "failed"
  | "duplicates"
  | "conflicts"
  | "pending"
  | "source-status"
  | "embeddings"
  | "products";

const TABS: { id: TabId; label: string }[] = [
  { id: "sync-jobs", label: "Sync jobs" },
  { id: "failed", label: "Failed imports" },
  { id: "duplicates", label: "Duplicates" },
  { id: "conflicts", label: "Conflicts" },
  { id: "pending", label: "Pending review" },
  { id: "source-status", label: "Source status" },
  { id: "embeddings", label: "Embeddings" },
  { id: "products", label: "Products / PPP" },
];

export default function AdminKbPage() {
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("agro-admin-token") || "";
  });
  const [tab, setTab] = useState<TabId>("sync-jobs");
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncKind, setSyncKind] = useState("full");

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const saveToken = (value: string) => {
    setToken(value);
    sessionStorage.setItem("agro-admin-token", value);
  };

  const load = useCallback(async () => {
    if (!token) {
      setError("AGRO_API_KEY Bearer token kiriting (faqat shu brauzerda saqlanadi).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (tab === "embeddings" || tab === "products") {
        const res = await fetch("/api/admin/kb/actions", { headers });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Xato");
        setData(
          tab === "embeddings"
            ? {
                embeddings: json.dashboard?.embeddings,
                phase4: json.dashboard?.phase4,
                database: json.dashboard?.database,
              }
            : {
                products: json.dashboard?.products,
                recordCounts: json.dashboard?.recordCounts,
                notes: json.dashboard?.notes,
              }
        );
      } else {
        const res = await fetch(`/api/admin/kb?view=${tab}`, { headers });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Xato");
        setData(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [headers, tab, token]);

  const runSync = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kb/sync", {
        method: "POST",
        headers,
        body: JSON.stringify({ kind: syncKind }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync xatosi");
      setData(json);
      setTab("sync-jobs");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-canvas text-ink px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm text-ink-muted">Agro Olam · Knowledge Base Admin</p>
          <h1 className="text-3xl font-semibold tracking-tight">KB Sync & Review</h1>
          <p className="text-sm text-ink-muted max-w-2xl">
            Phase 4: embedding coverage, product verification queue, KZ PPP admin
            import, cron/source health. Token faqat sessionStorage’da. Embedding
            reindex Vercel request ichida emas — CLI:{" "}
            <code className="text-xs">npm run kb:reindex -- --mode embeddings</code>
          </p>
        </header>

        <section className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1 text-sm">
            <span className="text-ink-muted">Bearer AGRO_API_KEY</span>
            <input
              type="password"
              className="w-full rounded-xl border border-line bg-canvas-elevated px-3 py-2"
              value={token}
              onChange={(e) => saveToken(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            onClick={load}
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Yuklanmoqda…" : "Yuklash"}
          </button>
        </section>

        <section className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-xl border border-line bg-canvas-elevated px-3 py-2 text-sm"
            value={syncKind}
            onChange={(e) => setSyncKind(e.target.value)}
          >
            <option value="full">full</option>
            <option value="diseases">diseases (weekly)</option>
            <option value="pests">pests (weekly)</option>
            <option value="product_registry">product_registry (daily)</option>
            <option value="broken_links">broken_links (weekly)</option>
          </select>
          <button
            type="button"
            onClick={async () => {
              if (!token) return;
              setLoading(true);
              try {
                const res = await fetch("/api/admin/kb/actions", { headers });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Xato");
                setData(json);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Xato");
              } finally {
                setLoading(false);
              }
            }}
            className="btn-ghost border border-line"
            disabled={loading || !token}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={runSync}
            className="btn-ghost border border-line"
            disabled={loading || !token}
          >
            Sync ishga tushirish
          </button>
        </section>

        <nav className="flex flex-wrap gap-2 border-b border-line pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                tab === t.id
                  ? "bg-canvas-muted font-medium"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {error && (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <pre className="overflow-auto rounded-xl border border-line bg-canvas-elevated p-4 text-xs leading-relaxed max-h-[70vh]">
          {data ? JSON.stringify(data, null, 2) : "Ma’lumot yo‘q — Yuklash ni bosing."}
        </pre>
      </div>
    </main>
  );
}
