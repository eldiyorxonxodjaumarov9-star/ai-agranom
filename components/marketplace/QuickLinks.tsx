const links = [
  {
    id: "instagram",
    title: "Bizning Instagram",
    subtitle: "@agroolam",
    icon: "📸",
    gradient: "from-pink-500 to-purple-600",
    href: "https://instagram.com",
  },
  {
    id: "tiktok",
    title: "Bizning TikTok",
    subtitle: "@agroolam",
    icon: "🎵",
    gradient: "from-gray-800 to-gray-900",
    href: "https://tiktok.com",
  },
  {
    id: "all-listings",
    title: "Barcha e'lonlar",
    subtitle: "2,500+ ta",
    icon: "📋",
    gradient: "from-agro-500 to-agro-700",
    href: "#kategoriyalar",
  },
  {
    id: "favorites",
    title: "Sevimlilar",
    subtitle: "Saqlanganlar",
    icon: "❤️",
    gradient: "from-red-400 to-rose-500",
    href: "#",
  },
];

export default function QuickLinks() {
  return (
    <section className="bg-surface py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
          Tezkor havolalar
        </h2>

        {/* Mobile: horizontal scroll */}
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group flex min-w-[160px] shrink-0 items-center gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-card sm:min-w-0"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${link.gradient} text-lg shadow-sm`}
              >
                <span className="drop-shadow-sm">{link.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-800 group-hover:text-agro-700">
                  {link.title}
                </p>
                <p className="text-xs text-gray-500">{link.subtitle}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
