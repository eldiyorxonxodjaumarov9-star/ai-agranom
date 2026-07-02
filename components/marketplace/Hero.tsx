"use client";

import { useChat } from "@/lib/context/ChatContext";
import { HeroIllustration } from "./icons";

export default function Hero() {
  const { openChat } = useChat();

  return (
    <section className="relative overflow-hidden">
      <div className="bg-gradient-to-br from-agro-700 via-agro-600 to-agro-800">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-agro-400/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:flex lg:items-center lg:gap-12 lg:px-8 lg:py-16">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-agro-100 backdrop-blur-sm sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-agro-300 animate-pulse" />
              O&apos;zbekistonning #1 agro marketplace
            </span>

            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Agro Olam —{" "}
              <span className="text-agro-200">aqlli agro marketplace</span>
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-agro-100/90 sm:text-lg lg:mx-0">
              Mahsulotlar, xizmatlar va AI agronom maslahatlari bir joyda
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href="#kategoriyalar"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-agro-800 shadow-card transition-all hover:scale-[1.02] hover:shadow-card-lg sm:w-auto"
              >
                Mahsulot ko&apos;rish
              </a>
              <button
                onClick={openChat}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:w-auto"
              >
                <ChatSparkleIcon className="h-5 w-5" />
                AI Agronomdan so&apos;rash
              </button>
            </div>

            {/* Stats */}
            <div className="mt-10 flex justify-center gap-8 lg:justify-start">
              {[
                { value: "2,500+", label: "E'lonlar" },
                { value: "800+", label: "Sotuvchilar" },
                { value: "24/7", label: "AI maslahat" },
              ].map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <p className="text-xl font-bold text-white sm:text-2xl">
                    {stat.value}
                  </p>
                  <p className="text-xs text-agro-200 sm:text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Illustration */}
          <div className="mt-8 flex flex-1 justify-center lg:mt-0">
            <div className="relative w-full max-w-md">
              <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-sm ring-1 ring-white/20 sm:p-6">
                <HeroIllustration className="h-auto w-full" />
              </div>
              <div className="absolute -bottom-3 -left-3 rounded-2xl bg-white px-4 py-2.5 shadow-card-lg sm:-bottom-4 sm:-left-4">
                <p className="text-xs font-medium text-gray-500">Bugun yetkazildi</p>
                <p className="text-lg font-bold text-agro-700">1,240+ buyurtma</p>
              </div>
              <div className="absolute -right-2 -top-2 rounded-2xl bg-agro-500 px-3 py-2 shadow-card sm:-right-4 sm:-top-4 sm:px-4">
                <p className="text-xs font-bold text-white">Yangi mahsulotlar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatSparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12H7v-2h6v2zm3-4H7V8h9v2z" />
    </svg>
  );
}
