import type { ActiveIngredientEntity, LangMap } from "./crops";

const L = (
  uz: string,
  ru: string,
  kk: string,
  ky: string,
  en: string
): LangMap => ({ uz, ru, kk, ky, en });

/** Active-ingredient classes only — NOT trade names. Always NEEDS_REVIEW. */
export const ACTIVE_INGREDIENTS: ActiveIngredientEntity[] = [
  {
    id: "copper",
    name: "Copper compounds (class)",
    type: "fungicide",
    targets: ["late-blight", "bacterial-spot", "downy-mildew"],
    cropsHint: ["tomato", "potato", "grape"],
    safetyNotes: L(
      "PPE, baliqlar/suv, asalari ehtiyoti; faqat ro‘yxatdan o‘tgan preparat.",
      "СИЗ, водоёмы, пчёлы; только зарегистрированный препарат.",
      "ЖҚҚ, су қоймалары, аралар; тек тіркелген препарат.",
      "ЖЕК, суу сактагычтар, аарылар; катталган препарат гана.",
      "PPE, aquatic/bee precautions; registered product only."
    ),
    sourceUrl: "https://www.fao.org/pest-and-pesticide-management/en/",
    status: "NEEDS_REVIEW",
  },
  {
    id: "sulfur",
    name: "Sulfur (class)",
    type: "fungicide",
    targets: ["powdery-mildew"],
    cropsHint: ["grape", "cucumber", "tomato"],
    safetyNotes: L(
      "Issiqda fitotoksiklik xavfi; labelga qarang.",
      "Риск фитотоксичности в жару; см. этикетку.",
      "Ыстықта фитоуыттылық; этикетканы қараңыз.",
      "Ысыкта фитотоксиктик; энбелгини караңыз.",
      "Phytotoxicity risk in heat; see label."
    ),
    sourceUrl: "https://www.fao.org/pest-and-pesticide-management/en/",
    status: "NEEDS_REVIEW",
  },
  {
    id: "bt",
    name: "Bacillus thuringiensis (class)",
    type: "biological",
    targets: ["cabbage-worm", "bollworm", "cutworm"],
    cropsHint: ["cabbage", "cotton", "tomato"],
    safetyNotes: L(
      "Biologik vosita; nishon hasharot va ekinga ro‘yxatdan o‘tganligini tekshiring.",
      "Биопрепарат; проверьте регистрацию на культуру и вредителя.",
      "Биопрепарат; дақыл мен зиянкеске тіркеуді тексеріңіз.",
      "Биопрепарат; өсүмдүк жана зыянкечке каттоону текшериңиз.",
      "Biological; verify registration for crop and pest."
    ),
    sourceUrl: "https://www.fao.org/pest-and-pesticide-management/ipm/integrated-pest-management/en/",
    status: "NEEDS_REVIEW",
  },
  {
    id: "spinosad",
    name: "Spinosad (class)",
    type: "insecticide",
    targets: ["thrips", "leafminer", "cabbage-worm"],
    cropsHint: ["tomato", "pepper", "cabbage"],
    safetyNotes: L(
      "Asalari xavfi mumkin; gullashda ehtiyot.",
      "Возможен риск для пчёл; осторожно при цветении.",
      "Араларға қауіп болуы мүмкін; гүлдеу кезінде сақ болыңыз.",
      "Аарыларга коркунуч болушу мүмкүн; гүлдөө учурунда этият.",
      "Possible bee risk; caution during bloom."
    ),
    sourceUrl: "https://www.fao.org/pest-and-pesticide-management/en/",
    status: "NEEDS_REVIEW",
  },
  {
    id: "abamectin",
    name: "Abamectin (class)",
    type: "insecticide",
    targets: ["spider-mite", "leafminer", "thrips"],
    cropsHint: ["tomato", "cucumber", "cotton"],
    safetyNotes: L(
      "Zaharli; PPE va PHI majburiy.",
      "Токсичен; обязательны СИЗ и срок ожидания.",
      "Улы; ЖҚҚ және күту мерзімі міндетті.",
      "Уулуу; ЖЕК жана күтүү мөөнөтү милдеттүү.",
      "Toxic; PPE and PHI mandatory."
    ),
    sourceUrl: "https://www.fao.org/pest-and-pesticide-management/en/",
    status: "NEEDS_REVIEW",
  },
  {
    id: "imidacloprid",
    name: "Imidacloprid (class)",
    type: "insecticide",
    targets: ["aphid-green", "whitefly", "thrips"],
    cropsHint: ["cotton", "tomato", "wheat"],
    safetyNotes: L(
      "Neonicotinoid; asalari va suv muhofazasi; mahalliy cheklovlarga rioya.",
      "Неоникотиноид; защита пчёл и воды; соблюдайте местные ограничения.",
      "Неоникотиноид; аралар мен суды қорғау; жергілікті шектеулер.",
      "Неоникотиноид; аары жана сууну коргоо; жергиликтүү чектөөлөр.",
      "Neonicotinoid; protect bees/water; follow local restrictions."
    ),
    sourceUrl: "https://www.fao.org/pest-and-pesticide-management/en/",
    status: "NEEDS_REVIEW",
  },
  {
    id: "mancozeb",
    name: "Mancozeb (class)",
    type: "fungicide",
    targets: ["late-blight", "early-blight", "downy-mildew"],
    cropsHint: ["tomato", "potato", "grape"],
    safetyNotes: L(
      "Faqat ro‘yxatdan o‘tgan formulatsiya; PHI labeldan.",
      "Только зарегистрированная формуляция; срок ожидания с этикетки.",
      "Тек тіркелген формуляция; күту мерзімі этикеткадан.",
      "Катталган формация гана; күтүү мөөнөтү энбелгиден.",
      "Registered formulation only; PHI from label."
    ),
    sourceUrl: "https://www.fao.org/pest-and-pesticide-management/en/",
    status: "NEEDS_REVIEW",
  },
  {
    id: "azoxystrobin",
    name: "Azoxystrobin (class)",
    type: "fungicide",
    targets: ["powdery-mildew", "rust", "leaf-spot"],
    cropsHint: ["wheat", "grape", "tomato"],
    safetyNotes: L(
      "Rezistentlik xavfi — mode of action aylantiring; label.",
      "Риск резистентности — ротация механизмов; этикетка.",
      "Төзімділік қаупі — әсер ету тәсілін ауыстырыңыз; этикетка.",
      "Туруктуулук коркунучу — таасир кылуу ыкмасын алмаштырыңыз; энбелги.",
      "Resistance risk — rotate MoA; label."
    ),
    sourceUrl: "https://www.fao.org/pest-and-pesticide-management/en/",
    status: "NEEDS_REVIEW",
  },
  {
    id: "glyphosate",
    name: "Glyphosate (class)",
    type: "herbicide",
    targets: ["weeds"],
    cropsHint: ["wheat", "maize", "cotton"],
    safetyNotes: L(
      "Gerbitsid; ekin sezgirligi va buffer zonalarni tekshiring.",
      "Гербицид; проверьте чувствительность культуры и буферные зоны.",
      "Гербицид; дақыл сезімталдығы мен буферлік аймақтарды тексеріңіз.",
      "Гербицид; өсүмдүк сезгичтигин жана буфердик зоналарды текшериңиз.",
      "Herbicide; check crop sensitivity and buffer zones."
    ),
    sourceUrl: "https://www.fao.org/pest-and-pesticide-management/en/",
    status: "NEEDS_REVIEW",
  },
  {
    id: "urea-n",
    name: "Urea nitrogen fertilizer (class)",
    type: "fertilizer",
    targets: ["n-deficiency"],
    cropsHint: ["tomato", "wheat", "maize"],
    safetyNotes: L(
      "Dozani tuproq/barg tahlili va o‘g‘it yorlig‘iga asoslang.",
      "Дозу основывайте на анализе почвы/листа и этикетке удобрения.",
      "Дозаны топырақ/жапырақ талдауы және тыңайтқыш этикеткасына негіздеңіз.",
      "Дозаны топурак/жалбырак анализи жана жер семирткич энбелгисине негиздеңиз.",
      "Base rates on soil/tissue tests and fertilizer label."
    ),
    sourceUrl: "https://www.fao.org/soils/en/",
    status: "NEEDS_REVIEW",
  },
];
