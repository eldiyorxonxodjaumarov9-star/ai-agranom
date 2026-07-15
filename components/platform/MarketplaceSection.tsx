"use client";

import { motion } from "framer-motion";

const categories = [
  { title: "Agrokimyo", desc: "O'g'it va himoya", icon: ChemIcon },
  { title: "Urug'lar", desc: "Sifatli navlar", icon: SeedIcon },
  { title: "Texnika", desc: "Traktor va asbob", icon: TractorIcon },
  { title: "Xizmatlar", desc: "Agro mutaxassislar", icon: ServiceIcon },
  { title: "Meva-sabzavot", desc: "Yangi hosil", icon: FruitIcon },
  { title: "Chorva", desc: "Ozuqa va ashyo", icon: LivestockIcon },
];

export default function MarketplaceSection() {
  return (
    <section id="marketplace" className="border-t border-line bg-canvas-muted/40 py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand">
              Marketplace
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              6 ta asosiy kategoriya
            </h2>
          </div>
          <a href="#products" className="text-sm font-medium text-ink-muted hover:text-brand">
            Ko&apos;rish →
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((c, i) => (
            <motion.a
              key={c.title}
              href="#products"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ scale: 1.02 }}
              className="glass group flex flex-col items-start gap-3 rounded-2xl p-4 transition hover:border-brand/25"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-brand-fg">
                <c.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{c.title}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{c.desc}</p>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChemIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 3h6M10 3v5l-5 9a3 3 0 002.6 4.5h8.8A3 3 0 0019 17l-5-9V3" />
    </svg>
  );
}

function SeedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 20c4-2 7-6 7-10S15 4 12 4 5 6 5 10s3 8 7 10z" />
    </svg>
  );
}

function TractorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="7" cy="17" r="3" />
      <circle cx="18" cy="17" r="2" />
      <path d="M4 12h7l2-5h5l2 5v5M10 12V7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ServiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z" strokeLinejoin="round" />
    </svg>
  );
}

function FruitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 8c-4 0-7 3-7 7s3 6 7 6 7-2 7-6-3-7-7-7z" />
      <path d="M12 8c0-2 1-4 3-5" strokeLinecap="round" />
    </svg>
  );
}

function LivestockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 14c0-3 2-5 5-5h4c3 0 5 2 5 5v5H5v-5z" strokeLinejoin="round" />
      <path d="M9 9V7a3 3 0 016 0v2" strokeLinecap="round" />
    </svg>
  );
}
