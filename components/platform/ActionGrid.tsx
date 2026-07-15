"use client";

import { motion } from "framer-motion";

const ACTIONS = [
  {
    id: "disease",
    icon: "🔍",
    title: "Kasallikni aniqlash",
    subtitle: "Rasm orqali aniqlash",
    prompt: "O'simlikimda kasallik belgilari bor. Rasm asosida tashxis qo'ying.",
    action: "image" as const,
  },
  {
    id: "diagnosis",
    icon: "📷",
    title: "AI Tashxis",
    subtitle: "Barg yoki meva rasmini tahlil qilish",
    prompt: "Barg yoki meva rasmini tahlil qilib, kasallik/zararkunanda aniqlang.",
    action: "image" as const,
  },
  {
    id: "ask",
    icon: "💬",
    title: "Savol berish",
    subtitle: "AI Agronom bilan suhbat",
    prompt: "",
    action: "focus" as const,
  },
  {
    id: "voice",
    icon: "🎤",
    title: "Ovoz orqali so'rash",
    subtitle: "Gapiring — AI javob beradi",
    prompt: "",
    action: "voice" as const,
  },
];

interface ActionGridProps {
  onAction: (type: "focus" | "voice" | "image", prompt?: string) => void;
}

export default function ActionGrid({ onAction }: ActionGridProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {ACTIONS.map((a, i) => (
          <motion.button
            key={a.id}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.05 }}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAction(a.action, a.prompt || undefined)}
            className="group relative overflow-hidden rounded-2xl border border-line bg-[#111827] p-4 text-left shadow-soft transition hover:border-brand/35 sm:p-5"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-sky-500/5 opacity-0 transition group-hover:opacity-100" />
            <div className="relative">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-canvas-muted text-xl">
                {a.icon}
              </span>
              <p className="mt-3 text-sm font-semibold text-ink sm:text-[15px]">
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
