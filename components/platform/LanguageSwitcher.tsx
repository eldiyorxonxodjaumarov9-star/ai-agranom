"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/lib/context/LocaleContext";

export default function LanguageSwitcher() {
  const { locale, setLocale, locales } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = locales.find((l) => l.code === locale) ?? locales[1];

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-line/80 bg-[#111827]/70 px-2.5 py-2 text-sm shadow-soft backdrop-blur-md transition hover:border-brand/30 sm:gap-2 sm:px-3"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="text-base leading-none" aria-hidden>
          🌐
        </span>
        <span className="hidden font-medium text-ink sm:inline">{current.label}</span>
        <span className="font-medium text-ink sm:hidden">{current.flag}</span>
        <Chevron
          className={`h-3.5 w-3.5 shrink-0 text-ink-faint transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-[60] mt-2 w-48 overflow-hidden rounded-xl border border-line bg-[#111827]/95 py-1 shadow-lift backdrop-blur-xl"
          >
            {locales.map((item) => {
              const selected = item.code === locale;
              return (
                <li key={item.code} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition hover:bg-canvas-muted ${
                      selected ? "bg-brand/10 text-brand" : "text-ink-muted"
                    }`}
                    onClick={() => {
                      setLocale(item.code);
                      setOpen(false);
                    }}
                  >
                    <span className="text-base leading-none">{item.flag}</span>
                    <span className="flex-1 font-medium">{item.label}</span>
                    {selected && (
                      <span className="text-brand" aria-hidden>
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
