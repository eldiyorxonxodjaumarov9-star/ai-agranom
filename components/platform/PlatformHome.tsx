"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import TopBar, { useRegionWeather } from "./TopBar";
import ActionGrid from "./ActionGrid";
import AgronomChat, { type AgronomChatHandle } from "./AgronomChat";
import BottomNav from "./BottomNav";

function HomeContent() {
  const { regionId, setRegionId, weather, weatherLoading } = useRegionWeather();
  const chatApi = useRef<AgronomChatHandle | null>(null);

  const onAction = (type: "focus" | "voice" | "image", prompt?: string) => {
    if (type === "voice") {
      chatApi.current?.startVoice();
      return;
    }
    if (type === "image") {
      chatApi.current?.openImages();
      if (prompt) {
        setTimeout(() => chatApi.current?.sendPrompt(prompt), 600);
      }
      return;
    }
    chatApi.current?.focus();
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-ink">
      <TopBar
        regionId={regionId}
        onRegionChange={setRegionId}
        weather={weather}
        weatherLoading={weatherLoading}
      />

      <main className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-4 pb-8 pt-12 text-center sm:px-6 sm:pt-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
              <span className="mr-2" aria-hidden>
                🌱
              </span>
              Men Agro Olam AI Agronomman
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-muted sm:text-base">
              O&apos;simlik kasalliklari, zararkunandalar, o&apos;g&apos;itlar,
              sug&apos;orish, urug&apos;, hosildorlik va qishloq xo&apos;jaligi
              bo&apos;yicha sun&apos;iy intellekt yordamchisi.
            </p>
            <p className="mt-3 text-sm text-ink-faint">
              Savolingizni yozing yoki rasm yuboring.
            </p>
          </motion.div>
        </section>

        <ActionGrid onAction={onAction} />

        <AgronomChat weather={weather} chatRef={chatApi} />

        {/* Secondary marketplace anchor — not hero */}
        <section id="marketplace" className="mx-auto max-w-3xl px-4 pb-10 text-center sm:px-6">
          <p className="text-xs text-ink-faint">
            Marketplace ikkinchi o&apos;rinda — asosiy urg&apos;u AI Agronomga.
          </p>
        </section>
      </main>

      <BottomNav active="home" onAi={() => chatApi.current?.focus()} />
    </div>
  );
}

export default function PlatformHome() {
  return (
    <ThemeProvider>
      <HomeContent />
    </ThemeProvider>
  );
}
