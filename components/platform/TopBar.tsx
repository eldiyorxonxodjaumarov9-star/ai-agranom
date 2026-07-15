"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  REGIONS,
  fetchWeatherByRegion,
  weatherEmoji,
  type RegionId,
} from "@/lib/platform/weather";
import type { WeatherSnapshot } from "@/lib/platform/types";

const REGION_KEY = "agro-olam-region";

interface TopBarProps {
  regionId: string;
  onRegionChange: (id: string) => void;
  weather: WeatherSnapshot | null;
  weatherLoading?: boolean;
}

export default function TopBar({
  regionId,
  onRegionChange,
  weather,
  weatherLoading,
}: TopBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const region = REGIONS.find((r) => r.id === regionId) || REGIONS[0];

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const isRain =
    weather &&
    (weather.precipitationProb >= 55 ||
      [61, 63, 80, 95].includes(weather.weatherCode));

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-[#0B1220]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-[#111827]/80 px-3 py-2 text-sm text-ink transition hover:border-brand/30"
          >
            <span aria-hidden>🌍</span>
            <span className="font-medium">{region.name}</span>
            <Chevron className={`h-3.5 w-3.5 text-ink-faint transition ${open ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {open && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute left-0 top-full z-50 mt-2 max-h-64 w-48 overflow-y-auto rounded-xl border border-line bg-[#111827] py-1 shadow-lift"
              >
                {REGIONS.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-canvas-muted ${
                        r.id === regionId ? "text-brand" : "text-ink-muted"
                      }`}
                      onClick={() => {
                        onRegionChange(r.id);
                        setOpen(false);
                      }}
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <a href="/" className="hidden items-center gap-2 sm:flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-fg">
            <LeafIcon className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Agro Olam</span>
        </a>

        <div className="inline-flex min-w-[7.5rem] items-center justify-end gap-2 rounded-xl border border-line bg-[#111827]/80 px-3 py-2 text-sm">
          <span aria-hidden>🌤</span>
          {weatherLoading ? (
            <span className="text-ink-faint">…</span>
          ) : weather ? (
            <span className="font-medium text-ink">
              {isRain ? (
                <>🌧 Yomg&apos;ir</>
              ) : (
                <>
                  {weatherEmoji(weather.weatherCode)} +{Math.round(weather.temp)}°
                </>
              )}
            </span>
          ) : (
            <span className="text-ink-faint">—</span>
          )}
        </div>
      </div>
    </header>
  );
}

export function useRegionWeather() {
  const [regionId, setRegionId] = useState<string>("toshkent");
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(REGION_KEY);
    if (saved && REGIONS.some((r) => r.id === saved)) {
      setRegionId(saved);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    localStorage.setItem(REGION_KEY, regionId);
    fetchWeatherByRegion(regionId)
      .then((w) => {
        if (!cancelled) setWeather(w);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [regionId]);

  return {
    regionId: regionId as RegionId,
    setRegionId,
    weather,
    weatherLoading: loading,
  };
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66C7.5 17.5 9.5 14 17 12.5V8zm-.5-5.5C12 4 9 7 8 11c3.5-1 7-1 9.5-3.5C19 5 18 3 16.5 2.5z" />
    </svg>
  );
}
