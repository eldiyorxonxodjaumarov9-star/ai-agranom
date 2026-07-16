"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme, type AppTheme } from "@/lib/context/ThemeContext";
import { useT } from "@/lib/context/LocaleContext";

const OPTIONS: { value: AppTheme; icon: string }[] = [
  { value: "light", icon: "☀️" },
  { value: "dark", icon: "🌙" },
  { value: "system", icon: "💻" },
];

export default function ThemeSwitcher() {
  const t = useT();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const labels: Record<AppTheme, string> = {
    light: t.theme.light,
    dark: t.theme.dark,
    system: t.theme.system,
  };

  const triggerIcon =
    !mounted
      ? "💻"
      : theme === "system"
        ? "💻"
        : resolvedTheme === "dark"
          ? "🌙"
          : "☀️";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line/80 bg-canvas-elevated/80 px-2.5 py-2 text-sm shadow-soft backdrop-blur-md transition hover:border-brand/30 hover:bg-canvas-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:gap-2 sm:px-3"
        aria-label={t.theme.label}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={t.theme.label}
      >
        <span className="text-base leading-none" aria-hidden>
          {triggerIcon}
        </span>
        <span className="hidden font-medium text-ink sm:inline">
          {mounted ? labels[theme] : t.theme.system}
        </span>
        <Chevron
          className={`h-3.5 w-3.5 shrink-0 text-ink-faint transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={t.theme.label}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-[60] mt-2 w-52 overflow-hidden rounded-xl border border-line bg-canvas-elevated/95 py-1 shadow-lift backdrop-blur-xl sm:w-56"
          >
            {OPTIONS.map((opt) => {
              const selected = mounted && theme === opt.value;
              return (
                <li key={opt.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition focus-visible:bg-canvas-muted focus-visible:outline-none ${
                      selected
                        ? "bg-brand/10 font-medium text-brand"
                        : "text-ink-muted hover:bg-canvas-muted hover:text-ink"
                    }`}
                    onClick={() => {
                      setTheme(opt.value);
                      setOpen(false);
                    }}
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {opt.icon}
                    </span>
                    <span className="flex-1">{labels[opt.value]}</span>
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
