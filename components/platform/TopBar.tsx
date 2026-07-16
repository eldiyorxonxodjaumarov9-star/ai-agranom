"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  REGIONS,
  DEFAULT_REGION_ID,
  fetchWeatherByRegion,
  localizeWeather,
  weatherEmoji,
  type RegionId,
} from "@/lib/platform/weather";
import type { WeatherSnapshot } from "@/lib/platform/types";
import { getRegionName } from "@/lib/i18n/regions";
import { useLocale } from "@/lib/context/LocaleContext";
import { saveUserProfile } from "@/lib/platform/user-profile";
import LanguageSwitcher from "./LanguageSwitcher";

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
  const { locale, t } = useLocale();
  const [regionOpen, setRegionOpen] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);
  const weatherRef = useRef<HTMLDivElement>(null);

  const regionName = getRegionName(regionId, locale);
  const displayWeather =
    weather && !weatherLoading
      ? localizeWeather(weather, locale, regionId)
      : null;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) {
        setRegionOpen(false);
      }
      if (weatherRef.current && !weatherRef.current.contains(e.target as Node)) {
        setWeatherOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-[#0B1220]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
        {/* Region */}
        <div className="relative min-w-0 flex-1" ref={regionRef}>
          <button
            type="button"
            onClick={() => {
              setRegionOpen((v) => !v);
              setWeatherOpen(false);
            }}
            className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-line/80 bg-[#111827]/70 px-2.5 py-2 text-sm text-ink shadow-soft backdrop-blur-md transition hover:border-brand/30 sm:gap-2 sm:px-3"
          >
            <span aria-hidden>📍</span>
            <span className="hidden shrink-0 text-ink-faint sm:inline">
              {t.nav.region}
            </span>
            <span className="truncate font-medium">{regionName}</span>
            <Chevron
              className={`h-3.5 w-3.5 shrink-0 text-ink-faint transition ${regionOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {regionOpen && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute left-0 top-full z-50 mt-2 max-h-72 w-[min(100vw-1.5rem,18rem)] overflow-y-auto rounded-xl border border-line bg-[#111827]/95 py-1 shadow-lift backdrop-blur-xl scrollbar-thin"
              >
                {REGIONS.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2.5 text-left text-sm transition hover:bg-canvas-muted ${
                        r.id === regionId ? "font-medium text-brand" : "text-ink-muted"
                      }`}
                      onClick={() => {
                        onRegionChange(r.id);
                        saveUserProfile({ regionId: r.id });
                        setRegionOpen(false);
                      }}
                    >
                      {getRegionName(r.id, locale)}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Brand — desktop */}
        <a href="/" className="hidden shrink-0 items-center gap-2 lg:flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-fg shadow-soft">
            <LeafIcon className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight">{t.nav.brand}</span>
        </a>

        {/* Weather + Language */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="relative" ref={weatherRef}>
            <button
              type="button"
              onClick={() => {
                setWeatherOpen((v) => !v);
                setRegionOpen(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line/80 bg-[#111827]/70 px-2.5 py-2 text-sm shadow-soft backdrop-blur-md transition hover:border-brand/30 sm:gap-2 sm:px-3"
            >
              <span aria-hidden>🌤</span>
              <span className="hidden text-ink-faint sm:inline">{t.nav.weather}</span>
              {weatherLoading ? (
                <span className="font-medium text-ink-faint">…</span>
              ) : displayWeather ? (
                <span className="font-medium text-ink">
                  {weatherEmoji(displayWeather.weatherCode)}{" "}
                  {Math.round(displayWeather.temp)}°
                </span>
              ) : (
                <span className="text-ink-faint">—</span>
              )}
            </button>

            <AnimatePresence>
              {weatherOpen && displayWeather && !weatherLoading && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-line bg-[#111827]/95 p-4 shadow-lift backdrop-blur-xl"
                >
                  <p className="text-xs font-medium text-ink-faint">{regionName}</p>
                  <p className="mt-1 text-lg font-semibold text-ink">
                    {weatherEmoji(displayWeather.weatherCode)}{" "}
                    {displayWeather.summary}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li className="flex justify-between gap-2">
                      <span className="text-ink-muted">{t.weather.temperature}</span>
                      <span className="font-medium text-ink">
                        {Math.round(displayWeather.temp)}°C
                      </span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-ink-muted">{t.weather.humidity}</span>
                      <span className="font-medium text-ink">
                        {displayWeather.humidity}%
                      </span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-ink-muted">{t.weather.wind}</span>
                      <span className="font-medium text-ink">
                        {Math.round(displayWeather.windSpeed)} {t.weather.windUnit}
                      </span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-ink-muted">{t.weather.rain}</span>
                      <span className="font-medium text-ink">
                        {displayWeather.precipitationProb}%
                      </span>
                    </li>
                  </ul>
                  <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-faint">
                    {displayWeather.advice}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

export function useRegionWeather() {
  const [regionId, setRegionId] = useState<string>(DEFAULT_REGION_ID);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(REGION_KEY);
    if (saved && REGIONS.some((r) => r.id === saved)) {
      setRegionId(saved);
    } else {
      localStorage.setItem(REGION_KEY, DEFAULT_REGION_ID);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    localStorage.setItem(REGION_KEY, regionId);
    saveUserProfile({ regionId });
    fetchWeatherByRegion(regionId, "ru")
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

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66C7.5 17.5 9.5 14 17 12.5V8zm-.5-5.5C12 4 9 7 8 11c3.5-1 7-1 9.5-3.5C19 5 18 3 16.5 2.5z" />
    </svg>
  );
}
