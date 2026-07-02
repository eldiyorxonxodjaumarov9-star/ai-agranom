/**
 * Knowledge base provider interface.
 * Admin keyinroq bu interfeys orqali DB, CMS yoki fayl bazasini ulashi mumkin.
 */
export interface KnowledgeEntry {
  id: string;
  category: "product" | "service" | "faq" | "seasonal" | "general";
  title: string;
  content: string;
  keywords?: string[];
  updatedAt?: string;
}

export interface KnowledgeProvider {
  getAll(): Promise<KnowledgeEntry[]>;
  search?(query: string): Promise<KnowledgeEntry[]>;
}

/**
 * Hozirgi vaqt uchun statik baza.
 * Admin panel qo'shilganda bu fayl DB provider bilan almashtiriladi.
 */
const STATIC_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "svc-1",
    category: "service",
    title: "Agro Olam maslahat xizmati",
    content:
      "Agro Olam mutaxassislari dehqon va fermerlarga ekin tanlash, o'g'itlash rejasi, kasallik va zararkunanda diagnostikasi bo'yicha shaxsiy maslahat beradi. Bog'lanish: +998 (XX) XXX-XX-XX",
    keywords: ["maslahat", "mutaxassis", "konsultatsiya"],
  },
  {
    id: "svc-2",
    category: "service",
    title: "Agro Olam sug'orish tizimlari",
    content:
      "Tomchilatib sug'orish, sprinkler va avtomatik sug'orish tizimlarini loyihalash va o'rnatish xizmati. Suv tejash va hosildorlikni oshirish uchun zamonaviy yechimlar.",
    keywords: ["sug'orish", "tomchilatib", "suv"],
  },
  {
    id: "prod-1",
    category: "product",
    title: "Organik o'g'itlar",
    content:
      "Agro Olam organik va mineral o'g'itlar assortimenti: NPK murakkab o'g'itlar, kaliy, fosfor, azotli o'g'itlar. Barcha mahsulotlar sertifikatlangan.",
    keywords: ["o'g'it", "NPK", "organik", "mineral"],
  },
  {
    id: "prod-2",
    category: "product",
    title: "Urug' va ko'chatlar",
    content:
      "Sifatli urug' va ko'chatlar: pomidor, bodring, qalampir, kartoshka va boshqa ekinlar. Yuqori unumdorlik va kasalliklarga chidamlilik.",
    keywords: ["urug'", "ko'chat", "ekin"],
  },
  {
    id: "prod-3",
    category: "product",
    title: "O'simlik himoyasi vositalari",
    content:
      "Fungitsidlar, insektitsidlar va gerbitsidlar. Faqat ro'yxatdan o'tgan va sertifikatlangan preparatlar. Dozani mutaxassis tavsiyasi bilan qo'llang.",
    keywords: ["fungitsid", "insektitsid", "himoya", "dori"],
  },
  {
    id: "faq-1",
    category: "faq",
    title: "Agro Olam bilan bog'lanish",
    content:
      "Telefon: +998 (XX) XXX-XX-XX | Email: info@agroolam.uz | Manzil: O'zbekiston. Ish vaqti: Dushanba–Juma, 09:00–18:00",
    keywords: ["bog'lanish", "telefon", "email", "manzil"],
  },
  {
    id: "season-1",
    category: "seasonal",
    title: "Bahor mavsumi ishlari",
    content:
      "Mart–aprel: tuproq tayyorlash, urug' ekish, o'g'itlash. May: sug'orish rejimini boshlash, zararkunandalarga qarshi profilaktika.",
    keywords: ["bahor", "ekish", "mavsum"],
  },
];

export class StaticKnowledgeProvider implements KnowledgeProvider {
  async getAll(): Promise<KnowledgeEntry[]> {
    return STATIC_KNOWLEDGE;
  }

  async search(query: string): Promise<KnowledgeEntry[]> {
    const q = query.toLowerCase();
    return STATIC_KNOWLEDGE.filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        entry.content.toLowerCase().includes(q) ||
        entry.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  }
}

/** Singleton — admin panel qo'shilganda DB provider bilan almashtiriladi */
let provider: KnowledgeProvider = new StaticKnowledgeProvider();

export function setKnowledgeProvider(newProvider: KnowledgeProvider): void {
  provider = newProvider;
}

export function getKnowledgeProvider(): KnowledgeProvider {
  return provider;
}

export async function buildKnowledgeContext(userMessage: string): Promise<string> {
  const entries = provider.search
    ? await provider.search(userMessage)
    : await provider.getAll();

  const relevant = entries.length > 0 ? entries : await provider.getAll();

  return relevant
    .map(
      (e) =>
        `[${e.category.toUpperCase()}] ${e.title}:\n${e.content}`
    )
    .join("\n\n");
}
