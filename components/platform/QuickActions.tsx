"use client";

import { motion } from "framer-motion";

const actions = [
  {
    title: "Kasallik aniqlash",
    desc: "Belgilarni tavsiflang — tashxis oling",
    gradient: "from-emerald-500/20 via-teal-400/10 to-transparent",
    icon: DiseaseIcon,
    prompt: "O'simlikimda kasallik belgilari bor. Tashxis qo'yib bersangiz.",
  },
  {
    title: "Rasm orqali tashxis",
    desc: "Barg yoki meva rasmidan tahlil",
    gradient: "from-sky-500/20 via-cyan-400/10 to-transparent",
    icon: ScanIcon,
    prompt: "Barg rasmini tahlil qilib, mumkin bo'lgan kasallikni ayting.",
  },
  {
    title: "O'g'it tavsiyasi",
    desc: "Ekin va tuproqqa mos NPK",
    gradient: "from-amber-500/20 via-orange-400/10 to-transparent",
    icon: FlaskIcon,
    prompt: "Bug'doy uchun eng yaxshi o'g'it tavsiyasini bering.",
  },
  {
    title: "Sug'orish kalkulyatori",
    desc: "Maydon va mavsum bo'yicha hisob",
    gradient: "from-blue-500/20 via-indigo-400/10 to-transparent",
    icon: DropIcon,
    prompt: "1 gektar pomidor uchun sug'orish rejasini hisoblab bering.",
  },
];

interface QuickActionsProps {
  onAction: (prompt: string) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Tezkor amallar
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Bir bosishda Я AI Дехқон ga yo&apos;naling
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((a, i) => (
          <motion.button
            key={a.title}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAction(a.prompt)}
            className={`group relative overflow-hidden rounded-2xl border border-line bg-canvas-elevated p-4 text-left shadow-soft transition`}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.gradient}`}
            />
            <div className="relative">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas-muted text-brand">
                <a.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink">{a.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                {a.desc}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function DiseaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3c4 3 7 6 7 10a7 7 0 11-14 0c0-4 3-7 7-10z" strokeLinejoin="round" />
      <path d="M12 14v2M12 10h.01" strokeLinecap="round" />
    </svg>
  );
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 8V5h3M16 5h3v3M20 16v3h-3M8 19H5v-3" strokeLinecap="round" />
      <rect x="8" y="8" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M10 3h4M11 3v6l-5.5 9.5A2 2 0 007.2 21h9.6a2 2 0 001.7-2.5L13 9V3" strokeLinejoin="round" />
      <path d="M8 15h8" strokeLinecap="round" />
    </svg>
  );
}

function DropIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3s6 6.5 6 11a6 6 0 11-12 0c0-4.5 6-11 6-11z" strokeLinejoin="round" />
    </svg>
  );
}
