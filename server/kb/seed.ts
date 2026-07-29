import { createHash } from "crypto";
import type { KnowledgeChunk, SourceRecord } from "./types";

function checksum(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function chunk(
  partial: Omit<KnowledgeChunk, "checksum" | "version" | "updatedAt" | "status"> & {
    status?: KnowledgeChunk["status"];
  }
): KnowledgeChunk {
  const now = "2026-07-16T00:00:00.000Z";
  return {
    ...partial,
    status: partial.status ?? "VERIFIED",
    version: 1,
    updatedAt: now,
    checksum: checksum(partial.content),
  };
}

export const SEED_SOURCES: SourceRecord[] = [
  {
    id: "src-fao-ipm",
    title: "Integrated Pest Management principles",
    organization: "FAO",
    url: "https://www.fao.org/pest-and-pesticide-management/ipm/integrated-pest-management/en/",
    accessedAt: "2026-07-16",
    license: "verify_per_document",
    reliabilityScore: 0.95,
    registryId: "fao",
  },
  {
    id: "src-eppo-phytophthora",
    title: "Phytophthora infestans (late blight)",
    organization: "EPPO",
    url: "https://gd.eppo.int/taxon/PHYTIN",
    accessedAt: "2026-07-16",
    license: "verify",
    reliabilityScore: 0.96,
    registryId: "eppo",
  },
  {
    id: "src-extension-tomato",
    title: "Tomato leaf yellowing and nutrient disorders (extension summary)",
    organization: "University extension / USDA open materials",
    url: "https://www.usda.gov",
    accessedAt: "2026-07-16",
    license: "verify_per_document",
    reliabilityScore: 0.85,
    registryId: "usda-nifa",
  },
  {
    id: "src-agro-catalog",
    title: "Agro Olam Marketplace product catalog",
    organization: "Agro Olam",
    url: "https://ai-agranom.vercel.app/#marketplace",
    accessedAt: "2026-07-16",
    license: "internal",
    reliabilityScore: 0.9,
    registryId: "agro-olam-catalog",
  },
];

/** Curated VERIFIED seed — Phase 1 bootstrap (not scraped). */
export const SEED_CHUNKS: KnowledgeChunk[] = [
  chunk({
    id: "chunk-tomato-late-blight",
    entityType: "disease",
    entityId: "disease-phytophthora-infestans",
    language: "ru",
    title: "Фитофтороз томата (Phytophthora infestans)",
    content:
      "Фитофтороз томата вызывается Phytophthora infestans. Типичные признаки: водянистые серо-бурые пятна на листьях, часто с белым налётом на нижней стороне при высокой влажности; быстрое распространение в прохладную влажную погоду. Поражает листья, стебли и плоды. Дифференциал: альтернариоз обычно даёт концентрические кольца на более сухих пятнах. Культурные меры: проветривание теплицы, капельный полив под корень, удаление поражённых листьев, севооборот. Химические фунгициды — только зарегистрированные препараты по официальной этикетке; дозу не выдумывать. Marketplace: fungicide-phytophthora.",
    keywords: [
      "фитофтора",
      "фитофтороз",
      "помидор",
      "томат",
      "phytophthora",
      "late blight",
      "белый налёт",
      "пятна",
    ],
    cropIds: ["tomato"],
    plantParts: ["leaf", "stem", "fruit"],
    regions: ["kz", "central-asia"],
    sourceId: "src-eppo-phytophthora",
    sourceUrl: "https://gd.eppo.int/taxon/PHYTIN",
    sourceTitle: "Phytophthora infestans (late blight)",
    organization: "EPPO",
    reliabilityScore: 0.96,
  }),
  chunk({
    id: "chunk-tomato-late-blight-uz",
    entityType: "disease",
    entityId: "disease-phytophthora-infestans",
    language: "uz",
    title: "Pomidor fitoftorozi (Phytophthora infestans)",
    content:
      "Pomidor fitoftorozi Phytophthora infestans qo'zg'atuvchisi bilan bog'liq. Belgilari: barglarda suvli kulrang-jigarrang dog'lar, yuqori namlikda bargning pastki tomonida oq mog'or/nalyot; salqin nam ob-havoda tez tarqaladi. Barg, poya va meva zararlanishi mumkin. Farqlash: alternarioz odatda quruqroq dog'larda konsentrik halqalar beradi. Agrotexnika: issiqxonani shamollatish, tomchilab ildizga sug'orish, zararlangan barglarni olib tashlash, almashlab ekish. Fungitsid — faqat rasmiy ro'yxatdan o'tgan preparat va yorliq dozasiga ko'ra. Marketplace: fungicide-phytophthora.",
    keywords: [
      "fitoftora",
      "fitoftoroz",
      "pomidor",
      "phytophthora",
      "oq mog'or",
      "dog'",
      "barg",
    ],
    cropIds: ["tomato"],
    plantParts: ["leaf", "stem", "fruit"],
    regions: ["kz", "central-asia"],
    sourceId: "src-eppo-phytophthora",
    sourceUrl: "https://gd.eppo.int/taxon/PHYTIN",
    sourceTitle: "Phytophthora infestans (late blight)",
    organization: "EPPO",
    reliabilityScore: 0.96,
  }),
  chunk({
    id: "chunk-tomato-n-deficiency",
    entityType: "nutrient",
    entityId: "nutrient-nitrogen-deficiency",
    language: "ru",
    title: "Дефицит азота у томата",
    content:
      "Недостаток азота: равномерное пожелтение старых (нижних) листьев, замедленный рост, бледная зелень. Не путать с вирусами или корневыми проблемами (те часто неравномерны или сопровождаются увяданием). Меры: анализ почвы/листа при возможности; сбалансированное азотное питание; избегать избытка N в плодоношении. Marketplace варианты: urea-azot, npk-20-20-20. Дозы — только по этикетке удобрения.",
    keywords: [
      "азот",
      "желтеют",
      "нижние листья",
      "nitrogen",
      "дефицит",
      "помидор",
      "томат",
      "саргай",
    ],
    cropIds: ["tomato"],
    plantParts: ["leaf"],
    regions: ["kz", "central-asia"],
    sourceId: "src-extension-tomato",
    sourceUrl: "https://www.usda.gov",
    sourceTitle: "Tomato leaf yellowing and nutrient disorders",
    organization: "University extension / USDA open materials",
    reliabilityScore: 0.85,
  }),
  chunk({
    id: "chunk-tomato-k-deficiency",
    entityType: "nutrient",
    entityId: "nutrient-potassium-deficiency",
    language: "ru",
    title: "Дефицит калия у томата",
    content:
      "Дефицит калия: края и кончики листьев желтеют/буреют (краевой ожог), плоды могут быть мягче или с неравномерным созреванием. Часто путают с ожогом от соли или засухой. Меры: калиевые удобрения по анализу и этикетке; равномерный полив. Marketplace: kaliy-sulfat, npk-16-16-16.",
    keywords: ["калий", "края листьев", "ожог", "potassium", "томат", "помидор"],
    cropIds: ["tomato"],
    plantParts: ["leaf", "fruit"],
    regions: ["kz", "central-asia"],
    sourceId: "src-extension-tomato",
    sourceUrl: "https://www.usda.gov",
    sourceTitle: "Tomato leaf yellowing and nutrient disorders",
    organization: "University extension / USDA open materials",
    reliabilityScore: 0.85,
  }),
  chunk({
    id: "chunk-cucumber-irrigation",
    entityType: "irrigation",
    entityId: "irrigation-cucumber",
    language: "kk",
    title: "Қиярды суару",
    content:
      "Қияр тамыр аймағында тұрақты ылғалдылықты қажет етеді, бірақ батпақтануды көтермейді. Жапырақтарды үстінен суармау — саңырауқұлақ аурулары қаупін азайтады. Тамшылатып суару ұсынылады. Жылыжайда желдету мен ылғалдылықты бақылаңыз. Marketplace: drip-kit. FAO IPM қағидаларына сәйкес мәдени шаралар маңызды.",
    keywords: ["қияр", "суару", "cucumber", "irrigation", "тамшы", "жылыжай"],
    cropIds: ["cucumber"],
    plantParts: ["root", "leaf"],
    regions: ["kz"],
    sourceId: "src-fao-ipm",
    sourceUrl:
      "https://www.fao.org/pest-and-pesticide-management/ipm/integrated-pest-management/en/",
    sourceTitle: "Integrated Pest Management principles",
    organization: "FAO",
    reliabilityScore: 0.95,
  }),
  chunk({
    id: "chunk-ipm-general",
    entityType: "general",
    entityId: "ipm-principles",
    language: "en",
    title: "IPM principles (FAO)",
    content:
      "Integrated Pest Management (IPM): monitor pests/diseases, prefer cultural and biological controls, use chemical PPP only when needed, always follow registered labels, protect pollinators and water. Never invent dosages. Prefer prevention: resistant varieties, sanitation, crop rotation, greenhouse ventilation.",
    keywords: ["ipm", "prevention", "fao", "biological", "fungicide", "insecticide"],
    cropIds: [],
    plantParts: [],
    regions: ["kz", "central-asia"],
    sourceId: "src-fao-ipm",
    sourceUrl:
      "https://www.fao.org/pest-and-pesticide-management/ipm/integrated-pest-management/en/",
    sourceTitle: "Integrated Pest Management principles",
    organization: "FAO",
    reliabilityScore: 0.95,
  }),
  chunk({
    id: "chunk-aphids-general",
    entityType: "pest",
    entityId: "pest-aphids",
    language: "uz",
    title: "Shira (aphids) — umumiy belgi va IPM",
    content:
      "Shira (aphids): bargning orqa tomonida mayda hasharotlar, yopishqoq shira (honeydew), barg buralishi, o'sishning sekinlashishi. Biologik: tabiiy dushmanlarni saqlash, zaruratda ro'yxatdan o'tgan insektitsid (yorliq bo'yicha). Marketplace: insecticide-general — faqat ruxsat etilgan ekin/maqsad uchun va labelga rioya qilib. Dozani o'ylab topmang.",
    keywords: ["shira", "aphid", "barg", "honeydew", "insektitsid", "zararkunanda"],
    cropIds: ["tomato", "cucumber", "pepper"],
    plantParts: ["leaf"],
    regions: ["kz", "central-asia"],
    sourceId: "src-fao-ipm",
    sourceUrl:
      "https://www.fao.org/pest-and-pesticide-management/ipm/integrated-pest-management/en/",
    sourceTitle: "Integrated Pest Management principles",
    organization: "FAO",
    reliabilityScore: 0.92,
  }),
  chunk({
    id: "chunk-marketplace-safety",
    entityType: "product",
    entityId: "marketplace-safety-rules",
    language: "ru",
    title: "Правила рекомендации препаратов Marketplace",
    content:
      "Рекомендовать только товары из каталога Agro Olam с известным id. Не выдумывать дозу, срок ожидания до сбора урожая или смешивание препаратов. Если этикетка недоступна — указать, что доза и PHI берутся только с официальной этикетки и местного реестра. СИЗ обязательны. Беречь пчёл и водоёмы.",
    keywords: ["доза", "этикетка", "marketplace", "безопасность", "фунгицид", "удобрение"],
    cropIds: [],
    sourceId: "src-agro-catalog",
    sourceUrl: "https://ai-agranom.vercel.app/#marketplace",
    sourceTitle: "Agro Olam Marketplace product catalog",
    organization: "Agro Olam",
    reliabilityScore: 0.9,
  }),
];
