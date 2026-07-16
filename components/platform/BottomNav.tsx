"use client";

import { useT } from "@/lib/context/LocaleContext";

interface BottomNavProps {
  active?: "home" | "ai" | "market" | "fav" | "profile";
  onAi?: () => void;
}

export default function BottomNav({ active = "home", onAi }: BottomNavProps) {
  const t = useT();

  const items = [
    { id: "home" as const, label: t.bottomNav.home, href: "#", icon: "🏠" },
    {
      id: "ai" as const,
      label: t.bottomNav.ai,
      href: "#ai-chat",
      icon: "🤖",
      onClick: onAi,
    },
    {
      id: "market" as const,
      label: t.bottomNav.market,
      href: "#marketplace",
      icon: "🛒",
    },
    { id: "fav" as const, label: t.bottomNav.fav, href: "#", icon: "❤️" },
    {
      id: "profile" as const,
      label: t.bottomNav.profile,
      href: "#",
      icon: "👤",
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line/80 bg-[#0B1220]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id} className="flex-1">
              <a
                href={item.href}
                onClick={(e) => {
                  if (item.onClick) {
                    e.preventDefault();
                    item.onClick();
                  }
                }}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
                  isActive ? "text-brand" : "text-ink-faint hover:text-ink-muted"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
