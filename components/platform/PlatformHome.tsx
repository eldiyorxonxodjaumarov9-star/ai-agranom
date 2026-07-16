"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { LocaleProvider, useT } from "@/lib/context/LocaleContext";
import TopBar, { useRegionWeather } from "./TopBar";
import ActionGrid from "./ActionGrid";
import AgronomChat, { type AgronomChatHandle } from "./AgronomChat";
import BottomNav from "./BottomNav";

function HomeContent() {
  const t = useT();
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
    <div className="min-h-screen bg-canvas text-ink">
      <TopBar
        regionId={regionId}
        onRegionChange={setRegionId}
        weather={weather}
        weatherLoading={weatherLoading}
      />

      <main className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8">
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
              {t.appName}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] font-medium leading-relaxed text-ink-muted sm:text-lg">
              {t.hero.subtitle}
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-faint sm:text-[15px]">
              {t.hero.description}
            </p>
          </motion.div>
        </section>

        <ActionGrid onAction={onAction} />

        <AgronomChat
          weather={weather}
          regionId={regionId}
          chatRef={chatApi}
        />

        <section id="marketplace" className="mx-auto max-w-3xl px-4 pb-10 text-center sm:px-6">
          <p className="text-xs text-ink-faint">{t.marketplace.note}</p>
        </section>
      </main>

      <BottomNav active="home" onAi={() => chatApi.current?.focus()} />
    </div>
  );
}

export default function PlatformHome() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <HomeContent />
      </LocaleProvider>
    </ThemeProvider>
  );
}
