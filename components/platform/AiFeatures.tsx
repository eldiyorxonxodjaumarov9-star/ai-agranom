"use client";

import { motion } from "framer-motion";

const features = [
  { title: "Kasallik aniqlaydi", icon: Check },
  { title: "Rasmni tahlil qiladi (multi, 10 ta)", icon: Check },
  { title: "O'g'it tavsiya qiladi + Marketplace", icon: Check },
  { title: "Sug'orishni hisoblaydi + ob-havo", icon: Check },
  { title: "Hosildorlikni oshirish maslahati", icon: Check },
  { title: "100+ tilda javob beradi", icon: Check },
  { title: "Smart Crop Memory", icon: Check },
  { title: "Plant Calendar + Reminders", icon: Check },
  { title: "Health Score + Growth Timeline", icon: Check },
  { title: "PDF Report + Voice Дехқон", icon: Check },
];

export default function AiFeatures() {
  return (
    <section className="border-t border-line bg-canvas-muted/30 py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Я AI Дехқон platformasi
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Oddiy chatbot emas — professional dehqon agent
          </p>
        </div>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.li
              key={f.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
              className="glass flex items-start gap-3 rounded-2xl p-4"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Check className="h-4 w-4" />
              </span>
              <p className="text-sm font-medium leading-snug text-ink">{f.title}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
