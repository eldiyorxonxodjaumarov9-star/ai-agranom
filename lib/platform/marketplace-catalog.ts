import type { MarketplaceProduct } from "./types";

/** AI faqat shu katalogdan mahsulot tavsiya qiladi */
export const MARKETPLACE_CATALOG: MarketplaceProduct[] = [
  {
    id: "npk-20-20-20",
    name: "NPK 20-20-20",
    category: "O'g'it",
    price: "195 000 so'm",
    description: "Muvozanatli kompleks o'g'it — meva-sabzavot uchun.",
    keywords: ["npk", "20-20-20", "o'g'it", "pomidor", "bodring"],
    href: "/marketplace/npk-20-20-20",
  },
  {
    id: "npk-16-16-16",
    name: "NPK 16-16-16",
    category: "O'g'it",
    price: "185 000 so'm",
    description: "Umumiy maqsadli mineral o'g'it.",
    keywords: ["npk", "16-16-16", "o'g'it"],
    href: "/marketplace/npk-16-16-16",
  },
  {
    id: "urea-azot",
    name: "Karbamid (Azot)",
    category: "O'g'it",
    price: "120 000 so'm",
    description: "Azot yetishmasligi uchun.",
    keywords: ["azot", "karbamid", "sarg'ayish", "urea"],
    href: "/marketplace/urea-azot",
  },
  {
    id: "kaliy-sulfat",
    name: "Kaliy sulfat",
    category: "O'g'it",
    price: "140 000 so'm",
    description: "Meva sifatini yaxshilash, kaliy tanqisligi.",
    keywords: ["kaliy", "sulfat", "meva"],
    href: "/marketplace/kaliy-sulfat",
  },
  {
    id: "fungicide-phytophthora",
    name: "Fitoftora himoyasi",
    category: "Himoya",
    price: "89 000 so'm",
    description: "Pomidor/kartoshka fitoftorasiga qarshi preparat.",
    keywords: ["fitoftora", "fungitsid", "pomidor", "kartoshka"],
    href: "/marketplace/fungicide-phytophthora",
  },
  {
    id: "insecticide-general",
    name: "Zararkunanda himoyasi",
    category: "Himoya",
    price: "76 000 so'm",
    description: "Barg va meva zararkunandalariga qarshi.",
    keywords: ["zararkunanda", "qurt", "insektitsid"],
    href: "/marketplace/insecticide-general",
  },
  {
    id: "tomato-seed-f1",
    name: "Pomidor urug'i F1",
    category: "Urug'",
    price: "42 000 so'm",
    description: "Yuqori unumdor F1 nav.",
    keywords: ["pomidor", "urug'", "f1"],
    href: "/marketplace/tomato-seed-f1",
  },
  {
    id: "drip-kit",
    name: "Tomchilatib sug'orish to'plami",
    category: "Sug'orish",
    price: "450 000 so'm",
    description: "1 gektargacha moslashuvchan to'plam.",
    keywords: ["sug'orish", "tomchilatib", "suv"],
    href: "/marketplace/drip-kit",
  },
];

export function getProductById(id: string): MarketplaceProduct | undefined {
  return MARKETPLACE_CATALOG.find((p) => p.id === id);
}

export function matchProductsFromText(text: string, limit = 3): MarketplaceProduct[] {
  const lower = text.toLowerCase();
  const scored = MARKETPLACE_CATALOG.map((p) => {
    let score = 0;
    for (const k of p.keywords) {
      if (lower.includes(k.toLowerCase())) score += 2;
    }
    if (lower.includes(p.name.toLowerCase())) score += 5;
    if (lower.includes(p.id)) score += 5;
    return { p, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.p);
}

export function catalogPromptBlock(): string {
  return MARKETPLACE_CATALOG.map(
    (p) =>
      `- id:${p.id} | ${p.name} (${p.category}) — ${p.price} — ${p.description}`
  ).join("\n");
}
