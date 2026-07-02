const categories = [
  {
    id: "transport",
    title: "Transport va texnika",
    icon: "🚜",
    color: "from-amber-50 to-orange-50",
    iconBg: "bg-amber-100",
    count: "340+",
  },
  {
    id: "services",
    title: "Xizmatlar",
    icon: "🛠️",
    color: "from-blue-50 to-indigo-50",
    iconBg: "bg-blue-100",
    count: "180+",
  },
  {
    id: "agrochem",
    title: "Agrokimyo va urug'lar",
    icon: "🌱",
    color: "from-green-50 to-emerald-50",
    iconBg: "bg-green-100",
    count: "520+",
  },
  {
    id: "packaging",
    title: "Tara va qadoqlar",
    icon: "📦",
    color: "from-stone-50 to-neutral-50",
    iconBg: "bg-stone-200",
    count: "95+",
  },
  {
    id: "delivery",
    title: "Magazin va yetkazib berish",
    icon: "🚚",
    color: "from-violet-50 to-purple-50",
    iconBg: "bg-violet-100",
    count: "210+",
  },
  {
    id: "vegetables",
    title: "Sabzavot va ko'katlar",
    icon: "🥬",
    color: "from-lime-50 to-green-50",
    iconBg: "bg-lime-100",
    count: "680+",
  },
  {
    id: "fruits",
    title: "Mevalar va sitruslar",
    icon: "🍊",
    color: "from-orange-50 to-amber-50",
    iconBg: "bg-orange-100",
    count: "420+",
  },
  {
    id: "dried",
    title: "Quruq mevalar va yormalar",
    icon: "🥜",
    color: "from-yellow-50 to-amber-50",
    iconBg: "bg-yellow-100",
    count: "150+",
  },
];

export default function CategoryGrid() {
  return (
    <section id="kategoriyalar" className="bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Kategoriyalar
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Kerakli bo&apos;limni tanlang
            </p>
          </div>
          <a
            href="#"
            className="hidden text-sm font-semibold text-agro-600 hover:text-agro-700 sm:block"
          >
            Barchasini ko&apos;rish →
          </a>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${cat.color} p-3 shadow-soft ring-1 ring-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-card sm:p-5`}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${cat.iconBg} text-xl shadow-sm transition-transform group-hover:scale-110 sm:h-12 sm:w-12 sm:text-2xl`}
              >
                {cat.icon}
              </div>
              <h3 className="mt-2.5 text-xs font-semibold leading-snug text-gray-800 sm:mt-3 sm:text-base">
                {cat.title}
              </h3>
              <p className="mt-1 text-xs font-medium text-gray-500">
                {cat.count} e&apos;lon
              </p>
              <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-white/40 transition-transform group-hover:scale-125" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
