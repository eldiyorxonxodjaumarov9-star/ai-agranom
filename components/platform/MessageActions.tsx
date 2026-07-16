"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/chat/types";
import type { MarketplaceProduct } from "@/lib/platform/types";
import { getProductById, matchProductsFromText } from "@/lib/platform/marketplace-catalog";
import { exportAgronomPdf } from "@/lib/platform/pdf-report";
import { speakText, stopSpeaking } from "@/lib/platform/voice";
import { createReminder, ensureNotificationPermission, addCalendarTasks } from "@/lib/platform/reminders";

interface MessageActionsProps {
  message: ChatMessage;
  userQuestion?: string;
  onRegenerate?: () => void;
  onFeedback?: (v: "up" | "down") => void;
  onSave?: () => void;
  onAddCalendar?: () => void;
}

export default function MessageActions({
  message,
  userQuestion,
  onRegenerate,
  onFeedback,
  onSave,
  onAddCalendar,
}: MessageActionsProps) {
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");

  const products: MarketplaceProduct[] = (() => {
    const ids = message.meta?.products || [];
    const fromMeta = ids.map(getProductById).filter(Boolean) as MarketplaceProduct[];
    if (fromMeta.length) return fromMeta;
    return matchProductsFromText(message.content, 2);
  })();

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(""), 2200);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    flash("Nusxa olindi");
  };

  const share = async () => {
    const data = { title: "Я AI Дехқон", text: message.content };
    if (navigator.share) {
      await navigator.share(data);
    } else {
      await navigator.clipboard.writeText(message.content);
      flash("Ulashish uchun nusxa olindi");
    }
  };

  const pdf = async () => {
    setBusy("pdf");
    try {
      await exportAgronomPdf({
        problem: userQuestion || "AI maslahat",
        answer: message.content,
        cropName: message.meta?.health?.crop,
        products,
        imageDataUrls: message.imageUrls,
      });
      flash("PDF yuklandi");
    } catch {
      flash("PDF xatosi");
    } finally {
      setBusy("");
    }
  };

  const reminder = async () => {
    setBusy("rem");
    await ensureNotificationPermission();
    const first = message.meta?.reminders?.[0];
    const title =
      first?.title ||
      `Eslatma: ${message.meta?.health?.crop || "ekin"} parvarishi`;
    const hours = first?.hoursFromNow ?? 24;
    createReminder(title, hours, message.meta?.health?.crop);
    flash("Reminder yaratildi");
    setBusy("");
  };

  const calendar = () => {
    const items = message.meta?.calendar;
    if (items?.length) {
      addCalendarTasks(
        items.map((c) => ({
          title: c.title,
          daysFromNow: c.daysFromNow,
          cropName: c.crop,
        }))
      );
      flash("Kalendar yangilandi");
    }
    onAddCalendar?.();
  };

  const voice = () => {
    speakText(message.content);
    flash("Ovozli o'qish");
  };

  const btn =
    "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-ink-muted transition hover:bg-canvas-muted hover:text-ink";

  return (
    <div className="mt-2 space-y-2">
      {products.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {products.map((p) => (
            <a
              key={p.id}
              href={p.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft px-3 py-1 text-xs font-medium text-brand transition hover:opacity-90"
            >
              Marketplace&apos;da ko&apos;rish — {p.name}
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-0.5">
        <button type="button" className={btn} onClick={copy}>
          Copy
        </button>
        <button type="button" className={btn} onClick={() => onRegenerate?.()}>
          Regenerate
        </button>
        <button type="button" className={btn} onClick={() => onFeedback?.("up")}>
          Helpful
        </button>
        <button type="button" className={btn} onClick={() => onFeedback?.("down")}>
          Not Helpful
        </button>
        <button type="button" className={btn} onClick={share}>
          Share
        </button>
        <button type="button" className={btn} onClick={pdf} disabled={busy === "pdf"}>
          Export PDF
        </button>
        <button type="button" className={btn} onClick={() => onSave?.()}>
          Save
        </button>
        {products[0] && (
          <a href={products[0].href} className={btn}>
            Marketplace
          </a>
        )}
        <button type="button" className={btn} onClick={calendar}>
          Calendar
        </button>
        <button type="button" className={btn} onClick={reminder} disabled={busy === "rem"}>
          Reminder
        </button>
        <button type="button" className={btn} onClick={voice}>
          Voice
        </button>
        <button type="button" className={btn} onClick={stopSpeaking}>
          Stop
        </button>
      </div>
      {toast && <p className="text-[11px] text-brand">{toast}</p>}
    </div>
  );
}
