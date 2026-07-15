"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { CropRecord, CalendarTask, ReminderItem, WeatherSnapshot } from "@/lib/platform/types";
import { growthDelta as growthPct } from "@/lib/platform/agent-meta";
import { loadCalendar, loadReminders } from "@/lib/platform/reminders";
import { fetchWeatherByGeolocation } from "@/lib/platform/weather";

interface AgronomPanelsProps {
  crops: CropRecord[];
  onSelectCrop?: (id: string) => void;
  refreshKey?: number;
}

export default function AgronomPanels({
  crops,
  onSelectCrop,
  refreshKey = 0,
}: AgronomPanelsProps) {
  const [tab, setTab] = useState<"crops" | "calendar" | "health" | "timeline" | "weather">("crops");
  const [calendar, setCalendar] = useState<CalendarTask[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    setCalendar(loadCalendar());
    setReminders(loadReminders());
  }, [refreshKey]);

  const loadWeather = async () => {
    setWeatherLoading(true);
    try {
      const w = await fetchWeatherByGeolocation();
      setWeather(w);
    } finally {
      setWeatherLoading(false);
    }
  };

  const tabs = [
    { id: "crops" as const, label: "Ekinlar" },
    { id: "calendar" as const, label: "Kalendar" },
    { id: "health" as const, label: "Health" },
    { id: "timeline" as const, label: "Timeline" },
    { id: "weather" as const, label: "Ob-havo" },
  ];

  return (
    <section className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
      <div className="glass-strong overflow-hidden rounded-3xl">
        <div className="flex flex-wrap gap-1 border-b border-line p-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-3 py-2 text-xs font-medium transition sm:text-sm ${
                tab === t.id
                  ? "bg-brand text-brand-fg"
                  : "text-ink-muted hover:bg-canvas-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {tab === "crops" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {crops.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCrop?.(c.id)}
                  className="rounded-2xl border border-line bg-canvas-muted/40 p-4 text-left transition hover:border-brand/30"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-ink">{c.name}</p>
                    <ScorePill score={c.healthScore} />
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">
                    {c.chats.length} suhbat · {c.images.length} rasm ·{" "}
                    {c.diseases.length} kasallik yozuvi
                  </p>
                  {c.chats[0] && (
                    <p className="mt-2 line-clamp-2 text-xs text-ink-faint">
                      {c.chats[c.chats.length - 1]?.content}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {tab === "calendar" && (
            <div className="space-y-3">
              {calendar.length === 0 ? (
                <Empty text="Kalendar bo'sh. AI javobidan Calendar tugmasini bosing." />
              ) : (
                [...calendar]
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex gap-3"
                    >
                      <div className="flex w-16 flex-col items-center">
                        <span className="text-[10px] text-ink-faint">
                          {formatDay(t.dueDate)}
                        </span>
                        <span className="mt-1 h-full w-px bg-line" />
                      </div>
                      <div className="flex-1 rounded-xl border border-line bg-canvas-muted/50 px-3 py-2">
                        <p className="text-sm font-medium text-ink">{t.title}</p>
                        <p className="text-xs text-ink-muted">{t.cropName}</p>
                      </div>
                    </motion.div>
                  ))
              )}
              {reminders.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    Reminders
                  </p>
                  {reminders.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="mb-2 rounded-xl border border-line px-3 py-2 text-sm"
                    >
                      {r.title}
                      <span className="ml-2 text-xs text-ink-faint">
                        {new Date(r.at).toLocaleString("uz-UZ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "health" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {crops.map((c) => (
                <div key={c.id} className="rounded-2xl border border-line p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-ink">{c.name}</p>
                    <ScorePill score={c.healthScore} large />
                  </div>
                  <ul className="mt-3 space-y-1 text-xs">
                    {c.healthPros.map((p) => (
                      <li key={p} className="text-emerald-700 dark:text-emerald-400">
                        {p}
                      </li>
                    ))}
                    {c.healthCons.map((p) => (
                      <li key={p} className="text-amber-700 dark:text-amber-400">
                        {p}
                      </li>
                    ))}
                    {!c.healthPros.length && !c.healthCons.length && (
                      <li className="text-ink-faint">Hali AI bahosi yo&apos;q</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {tab === "timeline" && (
            <div className="space-y-6">
              {crops
                .filter((c) => c.images.length > 0)
                .map((c) => {
                  const delta = growthPct(c.images.length, c.healthScore);
                  return (
                    <div key={c.id}>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-semibold text-ink">{c.name}</p>
                        {delta > 0 && (
                          <p className="text-xs text-brand">
                            O&apos;simlik ~{delta}% yaxshi rivojlangan
                          </p>
                        )}
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {[...c.images].reverse().map((img, i) => (
                          <div key={img.id} className="w-28 shrink-0">
                            <p className="mb-1 text-[10px] text-ink-faint">
                              {img.weekLabel || `${i + 1}-rasm`}
                            </p>
                            <img
                              src={img.dataUrl}
                              alt=""
                              className="h-24 w-28 rounded-xl object-cover ring-1 ring-line"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              {crops.every((c) => c.images.length === 0) && (
                <Empty text="O'sish timeline uchun rasm yuklang." />
              )}
            </div>
          )}

          {tab === "weather" && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={loadWeather}
                disabled={weatherLoading}
                className="btn-primary"
              >
                {weatherLoading ? "Tekshirilmoqda…" : "Joylashuv bo'yicha ob-havo"}
              </button>
              {weather && (
                <div className="rounded-2xl border border-line bg-gradient-to-br from-sky-500/10 to-transparent p-4">
                  <p className="text-2xl font-semibold text-ink">
                    {Math.round(weather.temp)}°C
                  </p>
                  <p className="text-sm text-ink-muted">
                    {weather.summary} · namlik {weather.humidity}% · yomg&apos;ir{" "}
                    {weather.precipitationProb}%
                  </p>
                  <p className="mt-3 text-sm font-medium text-ink">{weather.advice}</p>
                  <p className="mt-1 text-xs text-ink-faint">{weather.locationLabel}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ScorePill({ score, large }: { score: number; large?: boolean }) {
  const color =
    score >= 80
      ? "text-emerald-600"
      : score >= 60
        ? "text-amber-600"
        : "text-rose-600";
  return (
    <span className={`font-semibold ${color} ${large ? "text-xl" : "text-sm"}`}>
      {score}/100
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-ink-faint">{text}</p>;
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const today = new Date();
  const diff = Math.round(
    (d.setHours(0, 0, 0, 0) - new Date(today.setHours(0, 0, 0, 0)).getTime()) /
      86400000
  );
  if (diff === 0) return "Bugun";
  if (diff > 0) return `+${diff}k`;
  return iso.slice(5);
}
