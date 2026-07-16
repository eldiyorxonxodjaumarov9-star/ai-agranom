"use client";

import { motion } from "framer-motion";
import { useT } from "@/lib/context/LocaleContext";

interface ActionGridProps {
  onAction: (type: "focus" | "voice" | "image", prompt?: string) => void;
}

export default function ActionGrid({ onAction }: ActionGridProps) {
  const t = useT();

  const actions = [
    {
      id: "disease",
      icon: "🔍",
      title: t.actions.disease.title,
      subtitle: t.actions.disease.subtitle,
      prompt: t.actions.disease.prompt,
      action: "image" as const,
    },
    {
      id: "diagnosis",
      icon: "📷",
      title: t.actions.diagnosis.title,
      subtitle: t.actions.diagnosis.subtitle,
      prompt: t.actions.diagnosis.prompt,
      action: "image" as const,
    },
    {
      id: "ask",
      icon: "💬",
      title: t.actions.ask.title,
      subtitle: t.actions.ask.subtitle,
      prompt: "",
      action: "focus" as const,
    },
    {
      id: "voice",
      icon: "🎤",
      title: t.actions.voice.title,
      subtitle: t.actions.voice.subtitle,
      prompt: "",
      action: "voice" as const,
    },
  ];

  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {actions.map((a, i) => (
          <motion.button
            key={a.id}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.05 }}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAction(a.action, a.prompt || undefined)}
            className="group relative overflow-hidden rounded-2xl border border-line/80 bg-[#111827]/80 p-4 text-left shadow-soft backdrop-blur-sm transition hover:border-brand/35 hover:shadow-lift sm:p-5"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-sky-500/5 opacity-0 transition group-hover:opacity-100" />
            <div className="relative">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-canvas-muted/80 text-xl shadow-soft">
                {a.icon}
              </span>
              <p className="mt-3 text-sm font-semibold tracking-tight text-ink sm:text-[15px]">
                {a.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted sm:text-[13px]">
                {a.subtitle}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
