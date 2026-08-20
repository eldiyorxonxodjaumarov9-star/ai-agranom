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

type EmbeddingView = {
  embeddings?: {
    totalChunks: number;
    embedded: number;
    pending: number;
    failed: number;
    coveragePercent: number;
    vectorIndexReady: boolean;
    lastReindexAt: string | null;
    jobStatus?: string | null;
    checkpoint?: string | null;
    failedChunkIds?: string[];
    model?: string;
  };
  job?: {
    status: string;
    checkpoint: string | null;
    updatedAt: string;
    lastError: string | null;
  };
  workflow?: string;
};

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

function EmbeddingsPanel({
  data,
  loading,
  onRefresh,
  onRetryFailed,
}: {
  data: EmbeddingView | null;
  loading: boolean;
  onRefresh: () => void;
  onRetryFailed: () => void;
}) {
  const e = data?.embeddings;
  if (!e) {
    return (
      <p className="text-sm text-ink-muted">
        Embedding stats yo‘q — Yuklash ni bosing.
      </p>
    );
  }
  const pct = e.coveragePercent ?? 0;
  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Coverage" value={`${pct}%`} highlight={pct >= 100} />
        <Stat label="Embedded" value={String(e.embedded)} />
        <Stat label="Pending" value={String(e.pending)} warn={e.pending > 0} />
        <Stat label="Failed" value={String(e.failed)} warn={e.failed > 0} />
      </div>
      <div className="rounded-xl border border-line bg-canvas-elevated p-4 space-y-2">
        <div className="flex justify-between text-xs text-ink-muted">
          <span>Progress</span>
          <span>
            {e.embedded} / {e.totalChunks}
          </span>
        </div>
        <div className="h-2 rounded-full bg-canvas-muted overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <p className="text-xs text-ink-muted">
          vectorIndexReady:{" "}
          <strong className={e.vectorIndexReady ? "text-emerald-700" : "text-amber-700"}>
            {String(e.vectorIndexReady)}
          </strong>
          {" · "}
          model: {e.model || "text-embedding-3-small"}
        </p>
        {data?.job && (
          <p className="text-xs text-ink-muted">
            job: {data.job.status} · checkpoint: {data.job.checkpoint || "—"} ·
            updated: {data.job.updatedAt}
            {data.job.lastError ? ` · lastError: ${data.job.lastError}` : ""}
          </p>
        )}
        {e.lastReindexAt && (
          <p className="text-xs text-ink-muted">
            lastEmbeddingRun: {e.lastReindexAt}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost border border-line" onClick={onRefresh} disabled={loading}>
          Refresh status
        </button>
        <button type="button" className="btn-ghost border border-line" onClick={onRetryFailed} disabled={loading}>
          Clear failed queue
        </button>
      </div>
      <p className="text-xs text-ink-muted max-w-2xl">
        Full reindex: GitHub Actions → <strong>KB Embedding Reindex</strong> (manual).
        Secrets: DATABASE_URL, OPENAI_API_KEY. CLI:{" "}
        <code>npm run kb:reindex -- --mode embeddings</code>
      </p>
      {e.failedChunkIds && e.failedChunkIds.length > 0 && (
        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer font-medium">
            Failed chunk IDs ({e.failedChunkIds.length})
          </summary>
          <pre className="mt-2 text-xs overflow-auto max-h-40">
            {e.failedChunkIds.join("\n")}
          </pre>
        </details>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-canvas-elevated px-3 py-2">
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={`text-lg font-semibold ${
          highlight ? "text-emerald-700" : warn ? "text-amber-700" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function AdminKbPage() {
  const [tokenInput, setTokenInput] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [tab, setTab] = useState<TabId>("sync-jobs");
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncKind, setSyncKind] = useState("full");

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
    }),
    []
  );

  const establishSession = async () => {
    const value = tokenInput.trim();
    if (!value) {
      setError("AGRO_API_KEY kiriting — cookie session ochiladi (kalit saqlanmaydi).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${value}`,
          "Content-Type": "application/json",
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Unauthorized");
      setTokenInput("");
      setSessionReady(true);
      try {
        sessionStorage.removeItem("agro-admin-token");
      } catch {
        /* ignore */
      }
    } catch (e) {
      setSessionReady(false);
      setError(e instanceof Error ? e.message : "Session xato");
    } finally {
      setLoading(false);
    }
  };

  const loadEmbeddings = useCallback(async () => {
    const res = await fetch("/api/admin/kb/actions", {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ action: "embedding-status" }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Xato");
    setData(json as EmbeddingView);
  }, [headers]);

  const load = useCallback(async () => {
    if (!sessionReady) {
      setError("Avval admin session oching (Bearer bir marta).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (tab === "embeddings") {
        await loadEmbeddings();
      } else if (tab === "products") {
        const res = await fetch("/api/admin/kb/actions", {
          credentials: "include",
          headers,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Xato");
        setData({
          products: json.dashboard?.products,
          recordCounts: json.dashboard?.recordCounts,
          notes: json.dashboard?.notes,
        });
      } else {
        const res = await fetch(`/api/admin/kb?view=${tab}`, {
          credentials: "include",
          headers,
        });
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
  }, [headers, tab, sessionReady, loadEmbeddings]);

  const runSync = async () => {
    if (!sessionReady) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kb/sync", {
        method: "POST",
        credentials: "include",
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

  const retryFailed = async () => {
    if (!sessionReady) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kb/actions", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ action: "retry-failed-embeddings" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Xato");
      await loadEmbeddings();
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
            Phase 4: embedding coverage, product verification, KZ PPP import, cron
            health.{" "}
            <a className="underline" href="/admin/kb/products/import">
              Product registry import
            </a>
            . Bootstrap:{" "}
            <code className="text-xs">POST /api/admin/kb/bootstrap</code>. Embeddings:{" "}
            <strong>GitHub Actions → KB Embedding Reindex</strong>
          </p>
        </header>

        <section className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1 text-sm">
            <span className="text-ink-muted">
              AGRO_API_KEY (bir marta — httpOnly cookie session)
              {sessionReady ? " · session ochiq" : ""}
            </span>
            <input
              type="password"
              className="w-full rounded-xl border border-line bg-canvas-elevated px-3 py-2"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            onClick={establishSession}
            className="btn-primary"
            disabled={loading}
          >
            Session
          </button>
          <button type="button" onClick={load} className="btn-primary" disabled={loading}>
            {loading ? "Yuklanmoqda…" : "Yuklash"}
          </button>
        </section>

        <section className="rounded-xl border border-line bg-canvas-elevated p-4 space-y-2 text-sm">
          <p className="font-medium">Seller / agro-dorixona domenlari</p>
          <p className="text-ink-muted text-xs">
            Real saytlar ro‘yxatini yuboring — kodga o‘ylab topilgan domen
            qo‘yilmaydi.{" "}
            <a className="underline" href="/admin/kb/products/import">
              Rasmiy PPP import
            </a>
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              id="seller-domain-input"
              type="text"
              placeholder="masalan: pharmacy.example.uz"
              className="grow rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
              disabled={!sessionReady}
            />
            <button
              type="button"
              className="btn-ghost border border-line"
              disabled={!sessionReady || loading}
              onClick={async () => {
                const el = document.getElementById(
                  "seller-domain-input"
                ) as HTMLInputElement | null;
                const domain = el?.value?.trim() || "";
                if (!domain) {
                  setError("Seller domenini kiriting (real sayt).");
                  return;
                }
                setLoading(true);
                setError(null);
                try {
                  const res = await fetch("/api/admin/kb/sellers", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "add_domain",
                      domain,
                      enabled: false,
                    }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || "Seller xatosi");
                  setData(json);
                  if (el) el.value = "";
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Xato");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Domen qo‘shish
            </button>
            <button
              type="button"
              className="btn-ghost border border-line"
              disabled={!sessionReady || loading}
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const res = await fetch("/api/admin/kb/sellers", {
                    credentials: "include",
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || "Xato");
                  setData(json);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Xato");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Seller ro‘yxat
            </button>
          </div>
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
              if (!sessionReady) return;
              setLoading(true);
              try {
                const res = await fetch("/api/admin/kb/actions", {
                  credentials: "include",
                  headers,
                });
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
            disabled={loading || !sessionReady}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={runSync}
            className="btn-ghost border border-line"
            disabled={loading || !sessionReady}
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

        {tab === "embeddings" ? (
          <EmbeddingsPanel
            data={data as EmbeddingView | null}
            loading={loading}
            onRefresh={load}
            onRetryFailed={retryFailed}
          />
        ) : (
          <pre className="overflow-auto rounded-xl border border-line bg-canvas-elevated p-4 text-xs leading-relaxed max-h-[70vh]">
            {data ? JSON.stringify(data, null, 2) : "Ma’lumot yo‘q — Yuklash ni bosing."}
          </pre>
        )}
      </div>
    </main>
  );
}
