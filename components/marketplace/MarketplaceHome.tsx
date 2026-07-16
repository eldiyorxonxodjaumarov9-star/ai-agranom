"use client";

import { ChatProvider } from "@/lib/context/ChatContext";
import { LocaleProvider, useT } from "@/lib/context/LocaleContext";
import Header from "./Header";
import Hero from "./Hero";
import CategoryGrid from "./CategoryGrid";
import QuickLinks from "./QuickLinks";
import PromoBanners from "./PromoBanners";
import AIAgronomChat from "./AIAgronomChat";
import BottomNavigation from "./BottomNavigation";

function MarketplaceBody() {
  const t = useT();

  const helpLinks = [
    {
      title: "Marketplace",
      links: ["Barcha e'lonlar", "Kategoriyalar", "Sotuvchilar", "Yetkazib berish"],
    },
    {
      title: "Kompaniya",
      links: ["Biz haqimizda", "Hamkorlik", "Yangiliklar", "Karyera"],
    },
    {
      title: "Yordam",
      links: [t.marketplace.helpLink, "FAQ", "Bog'lanish", "Maxfiylik"],
    },
  ];

  return (
    <>
      <Header />
      <main className="pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <Hero />
        <CategoryGrid />
        <QuickLinks />
        <PromoBanners />

        <section className="bg-surface py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  Mashhur e&apos;lonlar
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Eng ko&apos;p ko&apos;rilgan mahsulotlar
                </p>
              </div>
              <a
                href="#"
                className="text-sm font-semibold text-agro-600 hover:text-agro-700"
              >
                Hammasi →
              </a>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredListings.map((item) => (
                <article
                  key={item.id}
                  className="group overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-card"
                >
                  <div
                    className={`flex h-36 items-center justify-center bg-gradient-to-br ${item.bg} text-5xl`}
                  >
                    {item.emoji}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-medium text-agro-600">
                      {item.category}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-800 group-hover:text-agro-700">
                      {item.title}
                    </h3>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-base font-bold text-gray-900">
                        {item.price}
                      </p>
                      <span className="text-xs text-gray-400">{item.location}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-gray-100 bg-white py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-lg font-bold text-agro-800">{t.appName}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  O&apos;zbekistonning zamonaviy agro marketplace platformasi.{" "}
                  {t.marketplace.footerBlurb}
                </p>
              </div>
              {helpLinks.map((col) => (
                <div key={col.title}>
                  <p className="text-sm font-semibold text-gray-900">{col.title}</p>
                  <ul className="mt-3 space-y-2">
                    {col.links.map((link) => (
                      <li key={link}>
                        <a
                          href="#"
                          className="text-sm text-gray-500 transition-colors hover:text-agro-600"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-10 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
              &copy; {new Date().getFullYear()} {t.appName}. Barcha huquqlar
              himoyalangan.
            </div>
          </div>
        </footer>
      </main>

      <AIAgronomChat />
      <BottomNavigation />
    </>
  );
}

export default function MarketplaceHome() {
  return (
    <LocaleProvider>
      <ChatProvider>
        <MarketplaceBody />
      </ChatProvider>
    </LocaleProvider>
  );
}

const featuredListings = [
  {
    id: "1",
    title: "Organik pomidor — 1 tonna",
    category: "Sabzavot",
    price: "4 500 000 so'm",
    location: "Toshkent",
    emoji: "🍅",
    bg: "from-red-50 to-orange-50",
  },
  {
    id: "2",
    title: "NPK 15-15-15 o'g'it — 50kg",
    category: "Agrokimyo",
    price: "185 000 so'm",
    location: "Samarqand",
    emoji: "🌱",
    bg: "from-green-50 to-emerald-50",
  },
  {
    id: "3",
    title: "Traktor xizmati — 1 kun",
    category: "Xizmatlar",
    price: "800 000 so'm",
    location: "Farg'ona",
    emoji: "🚜",
    bg: "from-amber-50 to-yellow-50",
  },
  {
    id: "4",
    title: "Olma navbat — 500kg",
    category: "Mevalar",
    price: "3 200 000 so'm",
    location: "Namangan",
    emoji: "🍎",
    bg: "from-rose-50 to-red-50",
  },
];
