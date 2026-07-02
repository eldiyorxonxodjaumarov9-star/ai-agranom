"use client";

import { useChat } from "@/lib/context/ChatContext";

const SIDE_ITEMS = [
  { id: "home", label: "Bosh sahifa", href: "#", icon: HomeIcon, active: true },
  { id: "favorites", label: "Sevimlilar", href: "#", icon: HeartIcon, active: false },
];

const RIGHT_ITEMS = [
  { id: "chat", label: "Chat", icon: ChatIcon, isChat: true },
  { id: "menu", label: "Menyu", href: "#", icon: MenuIcon, active: false },
];

export default function BottomNavigation() {
  const { isOpen, toggleChat } = useChat();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden"
      aria-label="Asosiy navigatsiya"
    >
      <div className="relative mx-auto grid h-[72px] max-w-lg grid-cols-5 items-end px-1 pb-2">
        {/* Left items */}
        {SIDE_ITEMS.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="flex flex-col items-center justify-end gap-0.5 pb-0.5"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center ${
                item.active ? "text-agro-600" : "text-gray-400"
              }`}
            >
              <item.icon className="h-6 w-6" />
            </span>
            <span
              className={`text-[10px] font-medium leading-none ${
                item.active ? "text-agro-700" : "text-gray-500"
              }`}
            >
              {item.label}
            </span>
          </a>
        ))}

        {/* Center plus button */}
        <div className="relative flex flex-col items-center">
          <button
            className="absolute -top-7 left-1/2 flex h-[3.25rem] w-[3.25rem] -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-agro-500 to-agro-700 text-white shadow-card-lg ring-4 ring-white transition-transform active:scale-95"
            aria-label="Qo'shish"
          >
            <PlusIcon className="h-6 w-6" />
          </button>
          <span className="pb-0.5 text-[10px] font-medium leading-none text-gray-500">
            Qo&apos;shish
          </span>
        </div>

        {/* Right items */}
        {RIGHT_ITEMS.map((item) =>
          item.isChat ? (
            <button
              key={item.id}
              onClick={toggleChat}
              className="flex flex-col items-center justify-end gap-0.5 pb-0.5"
              aria-label={item.label}
              aria-expanded={isOpen}
            >
              <span
                className={`relative flex h-7 w-7 items-center justify-center ${
                  isOpen ? "text-agro-600" : "text-gray-400"
                }`}
              >
                <item.icon className="h-6 w-6" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-agro-500" />
              </span>
              <span
                className={`text-[10px] font-medium leading-none ${
                  isOpen ? "text-agro-700" : "text-gray-500"
                }`}
              >
                {item.label}
              </span>
            </button>
          ) : (
            <a
              key={item.id}
              href={item.href}
              className="flex flex-col items-center justify-end gap-0.5 pb-0.5"
            >
              <span className="flex h-7 w-7 items-center justify-center text-gray-400">
                <item.icon className="h-6 w-6" />
              </span>
              <span className="text-[10px] font-medium leading-none text-gray-500">
                {item.label}
              </span>
            </a>
          )
        )}
      </div>
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}
