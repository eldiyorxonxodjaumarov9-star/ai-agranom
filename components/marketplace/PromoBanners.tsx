const promos = [
  {
    id: "fresh-veg",
    title: "Yangi sabzavotlar",
    subtitle: "To'g'ridan-to'g'ri yetkazib beruvchilardan",
    cta: "Ko'rish",
    gradient: "from-emerald-500 to-green-700",
    emoji: "🥬",
    pattern: "bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]",
  },
  {
    id: "seeds",
    title: "Urug' va agrokimyo",
    subtitle: "Sertifikatlangan mahsulotlar",
    cta: "Tanlash",
    gradient: "from-lime-500 to-agro-700",
    emoji: "🌾",
    pattern: "bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.12),transparent_50%)]",
  },
  {
    id: "fast-delivery",
    title: "Tez yetkazib berish",
    subtitle: "24 soat ichida shahar bo'ylab",
    cta: "Buyurtma",
    gradient: "from-teal-500 to-cyan-700",
    emoji: "⚡",
    pattern: "bg-[radial-gradient(circle_at_70%_60%,rgba(255,255,255,0.1),transparent_40%)]",
  },
  {
    id: "trusted",
    title: "Ishonchli sotuvchilar",
    subtitle: "Tekshirilgan va reytingli",
    cta: "Batafsil",
    gradient: "from-agro-600 to-agro-900",
    emoji: "✅",
    pattern: "bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent_45%)]",
  },
];

export default function PromoBanners() {
  return (
    <section className="bg-white py-8 sm:py-14">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <h2 className="text-lg font-bold text-gray-900 sm:text-2xl">
          Maxsus takliflar
        </h2>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">
          Eng yaxshi narxlarda agro mahsulotlar
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 lg:gap-5">
          {promos.map((promo) => (
            <a
              key={promo.id}
              href="#"
              className={`group relative min-h-[140px] overflow-hidden rounded-2xl bg-gradient-to-br sm:min-h-[160px] sm:rounded-3xl ${promo.gradient} ${promo.pattern} p-4 shadow-card transition-all active:scale-[0.99] sm:p-6 sm:hover:-translate-y-0.5 sm:hover:shadow-card-lg`}
            >
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold leading-tight text-white sm:text-xl">
                    {promo.title}
                  </h3>
                  <p className="mt-1 text-xs leading-snug text-white/85 sm:text-sm">
                    {promo.subtitle}
                  </p>
                  <span className="mt-3 inline-flex items-center rounded-lg bg-white/20 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm sm:mt-4 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm">
                    {promo.cta} →
                  </span>
                </div>
                <span className="shrink-0 text-3xl drop-shadow-lg sm:text-5xl">
                  {promo.emoji}
                </span>
              </div>
              <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5 sm:h-32 sm:w-32" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
