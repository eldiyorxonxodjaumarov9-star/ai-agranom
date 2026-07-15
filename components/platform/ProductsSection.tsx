"use client";

import { motion } from "framer-motion";

const products = [
  {
    title: "NPK 16-16-16",
    meta: "Agrokimyo · 50 kg",
    price: "185 000 so'm",
    tone: "from-emerald-500/15 to-teal-500/5",
  },
  {
    title: "Pomidor urug'i F1",
    meta: "Urug' · 10 g",
    price: "42 000 so'm",
    tone: "from-rose-500/15 to-orange-500/5",
  },
  {
    title: "Damlamash xizmati",
    meta: "Xizmat · 1 ga",
    price: "1 200 000 so'm",
    tone: "from-sky-500/15 to-blue-500/5",
  },
  {
    title: "Organik olma",
    meta: "Meva · 100 kg",
    price: "900 000 so'm",
    tone: "from-amber-500/15 to-yellow-500/5",
  },
];

export default function ProductsSection() {
  return (
    <section id="products" className="py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Tanlangan mahsulotlar
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Minimal kartochkalar — faqat keraklisi
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p, i) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.03 }}
              className="glass group overflow-hidden rounded-3xl transition"
            >
              <div
                className={`flex h-28 items-end bg-gradient-to-br ${p.tone} p-4`}
              >
                <span className="rounded-full bg-canvas-elevated/70 px-2.5 py-1 text-[10px] font-medium text-ink-muted backdrop-blur">
                  Agro Olam
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-ink">{p.title}</h3>
                <p className="mt-1 text-xs text-ink-faint">{p.meta}</p>
                <p className="mt-3 text-sm font-semibold text-brand">{p.price}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
