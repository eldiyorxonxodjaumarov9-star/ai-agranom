"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/lib/context/ThemeContext";

interface PlatformHeaderProps {
  onFocusChat?: () => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
}

export default function PlatformHeader({
  onFocusChat,
  searchValue,
  onSearchChange,
}: PlatformHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-brand-fg">
            <LeafIcon className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            Agro Olam
          </span>
        </a>

        <div className="mx-auto hidden min-w-0 max-w-md flex-1 md:block">
          <label className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Qidirish…"
              className="w-full rounded-xl border border-line bg-canvas-muted/80 py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand/40 focus:ring-2 focus:ring-brand/15"
            />
          </label>
        </div>

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <a href="#ai-chat" onClick={onFocusChat} className="btn-ghost hidden sm:inline-flex">
            AI Chat
          </a>
          <a href="#marketplace" className="btn-ghost hidden sm:inline-flex">
            Marketplace
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            className="btn-ghost !px-2.5"
            aria-label="Tema almashtirish"
          >
            {theme === "dark" ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
          </button>
          <a href="#auth" className="btn-ghost hidden lg:inline-flex">
            Kirish
          </a>
          <motion.a
            href="#auth"
            whileTap={{ scale: 0.98 }}
            className="btn-primary !px-3 !py-2 text-xs sm:!px-4 sm:!py-2.5 sm:text-sm"
          >
            Ro&apos;yxatdan o&apos;tish
          </motion.a>
        </nav>
      </div>
    </header>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66C7.5 17.5 9.5 14 17 12.5V8zm-.5-5.5C12 4 9 7 8 11c3.5-1 7-1 9.5-3.5C19 5 18 3 16.5 2.5z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M5 19l1.5-1.5" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M21 14.5A8.5 8.5 0 1110 3a7 7 0 0011 11.5z" strokeLinejoin="round" />
    </svg>
  );
}
