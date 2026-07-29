/**
 * Curated Central Asia–relevant crop roster.
 * Provenance: FAO crop lists / regional extension practice (summaries).
 * Scientific names are not translated.
 */
export type LangMap = { uz: string; ru: string; kk: string; ky: string; en: string };

export interface CropEntity {
  id: string;
  scientificName: string;
  names: LangMap;
  group: string;
  tempC: string;
  humidity: string;
  soil: string;
  ph: string;
  irrigation: string;
  regions: string[];
  commonDiseaseIds: string[];
  commonPestIds: string[];
}

export interface DiseaseEntity {
  id: string;
  scientificName: string;
  eppoCode?: string;
  pathogenType: "fungal" | "bacterial" | "viral" | "physiological" | "nutrient" | "other";
  names: LangMap;
  cropIds: string[];
  severity: "low" | "medium" | "high";
  earlySymptoms: LangMap;
  lateSymptoms: LangMap;
  conditions: LangMap;
  prevention: LangMap;
  confusedWith?: string[];
  sourceUrl: string;
  organization: string;
}

export interface PestEntity {
  id: string;
  scientificName: string;
  eppoCode?: string;
  pestType: string;
  names: LangMap;
  cropIds: string[];
  lifecycle: LangMap;
  damage: LangMap;
  prevention: LangMap;
  biological: LangMap;
  sourceUrl: string;
  organization: string;
}

export interface ActiveIngredientEntity {
  id: string;
  name: string;
  type: "fungicide" | "insecticide" | "herbicide" | "fertilizer" | "biological";
  targets: string[];
  cropsHint: string[];
  safetyNotes: LangMap;
  sourceUrl: string;
  /** Always NEEDS_REVIEW until agronom verifies registration */
  status: "NEEDS_REVIEW";
}

const L = (
  uz: string,
  ru: string,
  kk: string,
  ky: string,
  en: string
): LangMap => ({ uz, ru, kk, ky, en });

export const CROPS: CropEntity[] = [
  { id: "tomato", scientificName: "Solanum lycopersicum", names: L("pomidor", "томат", "қызанақ", "помидор", "tomato"), group: "solanaceae", tempC: "18–27", humidity: "60–80%", soil: "loam, well-drained", ph: "6.0–6.8", irrigation: "drip preferred", regions: ["KZ", "UZ", "KG", "greenhouse"], commonDiseaseIds: ["late-blight", "early-blight", "powdery-mildew", "bacterial-spot", "tmv", "blossom-end-rot", "n-deficiency", "k-deficiency"], commonPestIds: ["aphid-green", "whitefly", "thrips", "spider-mite", "tomato-hornworm"] },
  { id: "cucumber", scientificName: "Cucumis sativus", names: L("bodring", "огурец", "қияр", "бадыран", "cucumber"), group: "cucurbitaceae", tempC: "20–30", humidity: "70–90%", soil: "fertile loam", ph: "6.0–7.0", irrigation: "frequent light", regions: ["KZ", "UZ", "KG", "greenhouse"], commonDiseaseIds: ["powdery-mildew", "downy-mildew", "angular-leaf-spot", "fusarium-wilt"], commonPestIds: ["aphid-green", "spider-mite", "thrips", "whitefly"] },
  { id: "potato", scientificName: "Solanum tuberosum", names: L("kartoshka", "картофель", "картоп", "картошка", "potato"), group: "solanaceae", tempC: "15–20", humidity: "moderate", soil: "loose loam", ph: "5.0–6.5", irrigation: "even moisture", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["late-blight", "early-blight", "common-scab", "blackleg", "potato-virus-y"], commonPestIds: ["colorado-beetle", "aphid-green", "wireworm", "potato-tuber-moth"] },
  { id: "onion", scientificName: "Allium cepa", names: L("piyoz", "лук", "пияз", "пияз", "onion"), group: "allium", tempC: "13–24", humidity: "moderate", soil: "well-drained", ph: "6.0–7.0", irrigation: "avoid wet foliage late", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["onion-downy", "botrytis-neck", "fusarium-basal"], commonPestIds: ["onion-thrips", "onion-fly"] },
  { id: "carrot", scientificName: "Daucus carota", names: L("sabzi", "морковь", "сәбіз", "сабиз", "carrot"), group: "apiaceae", tempC: "15–21", humidity: "moderate", soil: "deep sandy loam", ph: "6.0–6.8", irrigation: "steady", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["alternaria-leaf-blight", "cavity-spot"], commonPestIds: ["carrot-fly", "aphid-green"] },
  { id: "cabbage", scientificName: "Brassica oleracea var. capitata", names: L("karam", "капуста", "қырыққабат", "капуста", "cabbage"), group: "brassica", tempC: "15–20", humidity: "high", soil: "fertile", ph: "6.0–7.5", irrigation: "regular", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["clubroot", "black-rot", "downy-mildew"], commonPestIds: ["cabbage-worm", "aphid-cabbage", "flea-beetle"] },
  { id: "pepper", scientificName: "Capsicum annuum", names: L("qalampir", "перец", "бұрыш", "калемпир", "pepper"), group: "solanaceae", tempC: "20–28", humidity: "60–80%", soil: "loam", ph: "6.0–6.8", irrigation: "drip", regions: ["KZ", "UZ", "KG", "greenhouse"], commonDiseaseIds: ["powdery-mildew", "bacterial-spot", "phytophthora-blight", "blossom-end-rot"], commonPestIds: ["aphid-green", "thrips", "whitefly", "spider-mite"] },
  { id: "eggplant", scientificName: "Solanum melongena", names: L("baqlajon", "баклажан", "баклажан", "баклажан", "eggplant"), group: "solanaceae", tempC: "22–30", humidity: "60–75%", soil: "fertile", ph: "5.5–6.5", irrigation: "regular", regions: ["KZ", "UZ", "KG", "greenhouse"], commonDiseaseIds: ["early-blight", "verticillium-wilt", "powdery-mildew"], commonPestIds: ["aphid-green", "spider-mite", "whitefly", "colorado-beetle"] },
  { id: "wheat", scientificName: "Triticum aestivum", names: L("bug'doy", "пшеница", "бидай", "буудай", "wheat"), group: "cereal", tempC: "15–25", humidity: "variable", soil: "loam", ph: "6.0–7.5", irrigation: "critical at heading", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["stem-rust", "leaf-rust", "powdery-mildew-wheat", "fusarium-head-blight", "septoria"], commonPestIds: ["aphid-cereal", "sunn-pest", "wheat-thrips"] },
  { id: "barley", scientificName: "Hordeum vulgare", names: L("arpa", "ячмень", "арпа", "арпа", "barley"), group: "cereal", tempC: "12–22", humidity: "variable", soil: "loam", ph: "6.0–7.5", irrigation: "moderate", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["net-blotch", "powdery-mildew-wheat", "stem-rust"], commonPestIds: ["aphid-cereal", "sunn-pest"] },
  { id: "maize", scientificName: "Zea mays", names: L("makkajo'xori", "кукуруза", "жүгері", "жүгөрү", "maize"), group: "cereal", tempC: "18–30", humidity: "moderate", soil: "deep fertile", ph: "5.8–7.0", irrigation: "critical at tasseling", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["northern-leaf-blight", "common-rust-maize", "smut"], commonPestIds: ["corn-borer", "aphid-cereal", "cutworm"] },
  { id: "rice", scientificName: "Oryza sativa", names: L("sholi", "рис", "күріш", "күрүч", "rice"), group: "cereal", tempC: "20–35", humidity: "flooded", soil: "clay puddled", ph: "5.5–6.5", irrigation: "flood/alternate wet-dry", regions: ["KZ", "UZ"], commonDiseaseIds: ["rice-blast", "bacterial-leaf-blight", "sheath-blight"], commonPestIds: ["rice-stem-borer", "planthopper"] },
  { id: "cotton", scientificName: "Gossypium hirsutum", names: L("paxta", "хлопчатник", "мақта", "пахта", "cotton"), group: "fiber", tempC: "22–32", humidity: "moderate", soil: "deep loam", ph: "5.8–7.0", irrigation: "furrow/drip", regions: ["UZ", "KZ", "KG"], commonDiseaseIds: ["verticillium-wilt", "fusarium-wilt", "bacterial-blight-cotton"], commonPestIds: ["bollworm", "aphid-green", "whitefly", "spider-mite", "thrips"] },
  { id: "sunflower", scientificName: "Helianthus annuus", names: L("kungaboqar", "подсолнечник", "күнбағыс", "күн карагай", "sunflower"), group: "oilseed", tempC: "18–28", humidity: "moderate", soil: "well-drained", ph: "6.0–7.5", irrigation: "critical flowering", regions: ["KZ", "UZ"], commonDiseaseIds: ["sclerotinia", "downy-mildew-sunflower", "rust-sunflower"], commonPestIds: ["aphid-green", "cutworm"] },
  { id: "alfalfa", scientificName: "Medicago sativa", names: L("beda", "люцерна", "жоңышқа", "беде", "alfalfa"), group: "forage", tempC: "15–28", humidity: "moderate", soil: "deep well-drained", ph: "6.5–7.5", irrigation: "after cuts", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["anthracnose-alfalfa", "spring-black-stem"], commonPestIds: ["aphid-green", "alfalfa-weevil"] },
  { id: "grape", scientificName: "Vitis vinifera", names: L("uzum", "виноград", "жүзім", "жүзүм", "grape"), group: "fruit", tempC: "15–30", humidity: "moderate", soil: "well-drained", ph: "5.5–6.5", irrigation: "regulated deficit possible", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["powdery-mildew", "downy-mildew", "botrytis-bunch", "black-rot-grape"], commonPestIds: ["spider-mite", "thrips", "grape-moth"] },
  { id: "apple", scientificName: "Malus domestica", names: L("olma", "яблоня", "алма", "алма", "apple"), group: "fruit", tempC: "15–25", humidity: "moderate", soil: "loam", ph: "5.5–6.5", irrigation: "regular young trees", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["apple-scab", "powdery-mildew", "fire-blight", "bitter-pit"], commonPestIds: ["codling-moth", "aphid-green", "spider-mite"] },
  { id: "pear", scientificName: "Pyrus communis", names: L("nok", "груша", "алмұрт", "алмурут", "pear"), group: "fruit", tempC: "15–25", humidity: "moderate", soil: "loam", ph: "6.0–7.0", irrigation: "regular", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["fire-blight", "pear-scab", "powdery-mildew"], commonPestIds: ["codling-moth", "psylla", "aphid-green"] },
  { id: "peach", scientificName: "Prunus persica", names: L("shaftoli", "персик", "шабдалы", "шабдалы", "peach"), group: "fruit", tempC: "18–30", humidity: "moderate", soil: "well-drained", ph: "6.0–7.0", irrigation: "regular", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["peach-leaf-curl", "brown-rot", "powdery-mildew"], commonPestIds: ["aphid-green", "oriental-fruit-moth", "spider-mite"] },
  { id: "apricot", scientificName: "Prunus armeniaca", names: L("o'rik", "абрикос", "өрік", "өрүк", "apricot"), group: "fruit", tempC: "18–30", humidity: "moderate", soil: "well-drained", ph: "6.0–7.0", irrigation: "critical fruit swell", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["brown-rot", "shot-hole", "cytospora"], commonPestIds: ["aphid-green", "oriental-fruit-moth"] },
  { id: "sweet-cherry", scientificName: "Prunus avium", names: L("gilos", "черешня", "шие", "чие", "sweet cherry"), group: "fruit", tempC: "15–25", humidity: "moderate", soil: "well-drained", ph: "6.0–7.0", irrigation: "steady", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["brown-rot", "bacterial-canker", "powdery-mildew"], commonPestIds: ["cherry-fruit-fly", "aphid-green"] },
  { id: "sour-cherry", scientificName: "Prunus cerasus", names: L("olcha", "вишня", "шие", "алча", "sour cherry"), group: "fruit", tempC: "15–25", humidity: "moderate", soil: "loam", ph: "6.0–7.0", irrigation: "moderate", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["brown-rot", "leaf-spot-cherry"], commonPestIds: ["cherry-fruit-fly", "aphid-green"] },
  { id: "walnut", scientificName: "Juglans regia", names: L("yong'oq", "грецкий орех", "жаңғақ", "жаңгак", "walnut"), group: "nut", tempC: "15–30", humidity: "moderate", soil: "deep", ph: "6.0–7.5", irrigation: "deep infrequent", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["walnut-blight", "anthracnose-walnut"], commonPestIds: ["codling-moth", "aphid-green"] },
  { id: "strawberry", scientificName: "Fragaria × ananassa", names: L("qulupnay", "клубника", "құлпынай", "кулпунай", "strawberry"), group: "berry", tempC: "15–25", humidity: "moderate-high", soil: "well-drained", ph: "5.5–6.5", irrigation: "drip", regions: ["KZ", "UZ", "KG", "greenhouse"], commonDiseaseIds: ["gray-mold", "powdery-mildew", "anthracnose-strawberry", "verticillium-wilt"], commonPestIds: ["spider-mite", "thrips", "aphid-green"] },
  { id: "watermelon", scientificName: "Citrullus lanatus", names: L("tarvuz", "арбуз", "қарбыз", "дарбыз", "watermelon"), group: "cucurbitaceae", tempC: "22–32", humidity: "moderate", soil: "sandy loam", ph: "6.0–7.0", irrigation: "deep then reduce near harvest", regions: ["KZ", "UZ"], commonDiseaseIds: ["powdery-mildew", "fusarium-wilt", "anthracnose-cucurbit"], commonPestIds: ["aphid-green", "spider-mite", "whitefly"] },
  { id: "melon", scientificName: "Cucumis melo", names: L("qovun", "дыня", "қауын", "коон", "melon"), group: "cucurbitaceae", tempC: "22–32", humidity: "moderate", soil: "sandy loam", ph: "6.0–7.0", irrigation: "regular early", regions: ["KZ", "UZ"], commonDiseaseIds: ["powdery-mildew", "downy-mildew", "fusarium-wilt"], commonPestIds: ["aphid-green", "spider-mite", "whitefly"] },
  { id: "lettuce", scientificName: "Lactuca sativa", names: L("salat", "салат", "салат", "салат", "lettuce"), group: "leafy", tempC: "10–20", humidity: "high", soil: "fertile", ph: "6.0–7.0", irrigation: "frequent light", regions: ["KZ", "UZ", "KG", "greenhouse"], commonDiseaseIds: ["downy-mildew", "botrytis-gray", "bacterial-soft-rot"], commonPestIds: ["aphid-green", "thrips", "cutworm"] },
  { id: "spinach", scientificName: "Spinacia oleracea", names: L("ismaloq", "шпинат", "шпинат", "шпинат", "spinach"), group: "leafy", tempC: "10–20", humidity: "moderate", soil: "fertile", ph: "6.0–7.5", irrigation: "steady", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["downy-mildew", "leaf-spot"], commonPestIds: ["aphid-green", "leafminer"] },
  { id: "bean", scientificName: "Phaseolus vulgaris", names: L("loviya", "фасоль", "бұршақ", "буурчак", "common bean"), group: "legume", tempC: "18–28", humidity: "moderate", soil: "loam", ph: "6.0–7.0", irrigation: "critical flowering", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["anthracnose-bean", "rust-bean", "bacterial-blight-bean"], commonPestIds: ["aphid-green", "spider-mite", "thrips"] },
  { id: "chickpea", scientificName: "Cicer arietinum", names: L("no'xat", "нут", "ноқат", "нокот", "chickpea"), group: "legume", tempC: "18–28", humidity: "low-moderate", soil: "well-drained", ph: "6.0–8.0", irrigation: "limited", regions: ["KZ", "UZ"], commonDiseaseIds: ["ascochyta-blight", "fusarium-wilt"], commonPestIds: ["aphid-green", "cutworm"] },
  { id: "soybean", scientificName: "Glycine max", names: L("soya", "соя", "соя", "соя", "soybean"), group: "legume", tempC: "20–30", humidity: "moderate", soil: "loam", ph: "6.0–7.0", irrigation: "critical pod fill", regions: ["KZ", "UZ"], commonDiseaseIds: ["soybean-rust", "frogeye-leaf-spot", "root-rot"], commonPestIds: ["aphid-green", "spider-mite", "cutworm"] },
  { id: "sugar-beet", scientificName: "Beta vulgaris", names: L("qand lavlagi", "сахарная свёкла", "қант қызылшасы", "кант кызылча", "sugar beet"), group: "root", tempC: "15–25", humidity: "moderate", soil: "deep loam", ph: "6.5–8.0", irrigation: "regular", regions: ["KZ", "KG"], commonDiseaseIds: ["cercospora-leaf-spot", "powdery-mildew", "rhizomania"], commonPestIds: ["aphid-green", "flea-beetle", "cutworm"] },
  { id: "garlic", scientificName: "Allium sativum", names: L("sarimsoq", "чеснок", "сарымсақ", "сарымсак", "garlic"), group: "allium", tempC: "12–24", humidity: "moderate", soil: "well-drained", ph: "6.0–7.0", irrigation: "reduce near harvest", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["white-rot-allium", "botrytis-neck", "rust-allium"], commonPestIds: ["onion-thrips", "onion-fly"] },
  { id: "pumpkin", scientificName: "Cucurbita pepo", names: L("qovoq", "тыква", "асқабақ", "ашкабак", "pumpkin"), group: "cucurbitaceae", tempC: "20–30", humidity: "moderate", soil: "fertile", ph: "6.0–7.0", irrigation: "deep", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["powdery-mildew", "downy-mildew", "bacterial-wilt"], commonPestIds: ["aphid-green", "spider-mite", "squash-bug"] },
  { id: "zucchini", scientificName: "Cucurbita pepo", names: L("kabachok", "кабачок", "кабачок", "кабачок", "zucchini"), group: "cucurbitaceae", tempC: "18–28", humidity: "moderate", soil: "fertile", ph: "6.0–7.0", irrigation: "regular", regions: ["KZ", "UZ", "KG", "greenhouse"], commonDiseaseIds: ["powdery-mildew", "downy-mildew", "bacterial-wilt"], commonPestIds: ["aphid-green", "whitefly", "spider-mite"] },
  { id: "radish", scientificName: "Raphanus sativus", names: L("turp", "редис", "редиска", "редиска", "radish"), group: "brassica", tempC: "10–18", humidity: "moderate", soil: "loose", ph: "6.0–7.0", irrigation: "steady", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["clubroot", "downy-mildew", "black-rot"], commonPestIds: ["flea-beetle", "aphid-cabbage"] },
  { id: "cauliflower", scientificName: "Brassica oleracea var. botrytis", names: L("gulkaram", "цветная капуста", "гүлді қырыққабат", "гүлдүү капуста", "cauliflower"), group: "brassica", tempC: "15–20", humidity: "high", soil: "fertile", ph: "6.0–7.0", irrigation: "regular", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["clubroot", "black-rot", "downy-mildew"], commonPestIds: ["cabbage-worm", "aphid-cabbage", "flea-beetle"] },
  { id: "broccoli", scientificName: "Brassica oleracea var. italica", names: L("brokkoli", "брокколи", "брокколи", "брокколи", "broccoli"), group: "brassica", tempC: "15–20", humidity: "high", soil: "fertile", ph: "6.0–7.0", irrigation: "regular", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["clubroot", "black-rot", "downy-mildew"], commonPestIds: ["cabbage-worm", "aphid-cabbage"] },
  { id: "plum", scientificName: "Prunus domestica", names: L("olxo'ri", "слива", "алхоры", "алмурут слива", "plum"), group: "fruit", tempC: "15–28", humidity: "moderate", soil: "well-drained", ph: "6.0–7.0", irrigation: "regular", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["brown-rot", "shot-hole", "plum-pox"], commonPestIds: ["aphid-green", "plum-fruit-moth"] },
  { id: "pomegranate", scientificName: "Punica granatum", names: L("anor", "гранат", "анар", "анар", "pomegranate"), group: "fruit", tempC: "20–35", humidity: "low-moderate", soil: "well-drained", ph: "5.5–7.0", irrigation: "deep", regions: ["UZ", "KZ"], commonDiseaseIds: ["alternaria-fruit-rot", "botrytis-gray"], commonPestIds: ["aphid-green", "spider-mite"] },
  { id: "fig", scientificName: "Ficus carica", names: L("anjir", "инжир", "інжір", "анжир", "fig"), group: "fruit", tempC: "18–32", humidity: "low-moderate", soil: "well-drained", ph: "6.0–7.5", irrigation: "deep", regions: ["UZ", "KZ"], commonDiseaseIds: ["fig-rust", "botrytis-gray"], commonPestIds: ["spider-mite", "thrips"] },
  { id: "raspberry", scientificName: "Rubus idaeus", names: L("malina", "малина", "таңқурай", "малина", "raspberry"), group: "berry", tempC: "15–25", humidity: "moderate", soil: "well-drained organic", ph: "5.5–6.5", irrigation: "regular", regions: ["KZ", "KG"], commonDiseaseIds: ["anthracnose-raspberry", "botrytis-gray", "powdery-mildew"], commonPestIds: ["aphid-green", "spider-mite"] },
  { id: "currant", scientificName: "Ribes nigrum", names: L("smorodina", "смородина", "қарақат", "карагат", "blackcurrant"), group: "berry", tempC: "15–25", humidity: "moderate", soil: "moist fertile", ph: "6.0–7.0", irrigation: "regular", regions: ["KZ", "KG"], commonDiseaseIds: ["powdery-mildew", "anthracnose-currant", "white-pine-blister"], commonPestIds: ["aphid-green", "spider-mite"] },
  { id: "tobacco", scientificName: "Nicotiana tabacum", names: L("tamaki", "табак", "темекі", "тамеки", "tobacco"), group: "solanaceae", tempC: "20–30", humidity: "moderate", soil: "well-drained", ph: "5.5–6.5", irrigation: "regular", regions: ["KZ", "KG"], commonDiseaseIds: ["tmv", "blue-mold", "black-shank"], commonPestIds: ["aphid-green", "thrips", "whitefly"] },
  { id: "safflower", scientificName: "Carthamus tinctorius", names: L("saflor", "сафлор", "мақсары", "сафлор", "safflower"), group: "oilseed", tempC: "18–30", humidity: "low", soil: "well-drained", ph: "6.0–8.0", irrigation: "limited", regions: ["KZ", "UZ"], commonDiseaseIds: ["rust-safflower", "alternaria-leaf-blight"], commonPestIds: ["aphid-green", "cutworm"] },
  { id: "sorghum", scientificName: "Sorghum bicolor", names: L("sorg'o", "сорго", "құмай", "сорго", "sorghum"), group: "cereal", tempC: "20–32", humidity: "low-moderate", soil: "varied", ph: "5.5–7.5", irrigation: "drought tolerant", regions: ["KZ", "UZ"], commonDiseaseIds: ["anthracnose-sorghum", "smut", "leaf-blight"], commonPestIds: ["aphid-cereal", "stem-borer"] },
  { id: "millet", scientificName: "Panicum miliaceum", names: L("tariq", "просо", "тары", "тары", "proso millet"), group: "cereal", tempC: "18–30", humidity: "low", soil: "light", ph: "5.5–7.5", irrigation: "low", regions: ["KZ"], commonDiseaseIds: ["smut", "leaf-spot"], commonPestIds: ["aphid-cereal", "cutworm"] },
  { id: "lentil", scientificName: "Lens culinaris", names: L("yasmiq", "чечевица", "жасымық", "жасмык", "lentil"), group: "legume", tempC: "15–25", humidity: "low-moderate", soil: "well-drained", ph: "6.0–8.0", irrigation: "limited", regions: ["KZ", "UZ"], commonDiseaseIds: ["ascochyta-blight", "fusarium-wilt", "botrytis-gray"], commonPestIds: ["aphid-green", "cutworm"] },
  { id: "pea", scientificName: "Pisum sativum", names: L("no'xat (yashil)", "горох", "бұршақ", "буурчак", "pea"), group: "legume", tempC: "10–20", humidity: "moderate", soil: "loam", ph: "6.0–7.5", irrigation: "critical flowering", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["powdery-mildew", "ascochyta-blight", "root-rot"], commonPestIds: ["aphid-green", "pea-weevil"] },
  { id: "basil", scientificName: "Ocimum basilicum", names: L("rayhon", "базилик", "райхан", "райхан", "basil"), group: "herb", tempC: "20–30", humidity: "moderate", soil: "fertile", ph: "6.0–7.0", irrigation: "regular", regions: ["KZ", "UZ", "KG", "greenhouse"], commonDiseaseIds: ["downy-mildew-basil", "fusarium-wilt", "botrytis-gray"], commonPestIds: ["aphid-green", "thrips", "spider-mite"] },
  { id: "mint", scientificName: "Mentha spicata", names: L("yalpiz", "мята", "жалбыз", "жалбыз", "mint"), group: "herb", tempC: "15–25", humidity: "high", soil: "moist", ph: "6.0–7.5", irrigation: "frequent", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["rust-mint", "powdery-mildew", "verticillium-wilt"], commonPestIds: ["aphid-green", "spider-mite"] },
  { id: "greenhouse-tomato", scientificName: "Solanum lycopersicum", names: L("issiqxona pomidori", "тепличный томат", "жылыжай қызанағы", "теплица помидору", "greenhouse tomato"), group: "solanaceae", tempC: "18–26", humidity: "60–80% ventilated", soil: "substrate/soil", ph: "5.8–6.5", irrigation: "drip EC managed", regions: ["KZ", "UZ", "KG", "greenhouse"], commonDiseaseIds: ["late-blight", "powdery-mildew", "botrytis-gray", "tmv", "n-deficiency"], commonPestIds: ["whitefly", "spider-mite", "thrips", "aphid-green"] },
  { id: "greenhouse-cucumber", scientificName: "Cucumis sativus", names: L("issiqxona bodringi", "тепличный огурец", "жылыжай қияры", "теплица бадыраны", "greenhouse cucumber"), group: "cucurbitaceae", tempC: "20–28", humidity: "70–90% ventilated", soil: "substrate", ph: "5.5–6.5", irrigation: "drip high frequency", regions: ["KZ", "UZ", "KG", "greenhouse"], commonDiseaseIds: ["powdery-mildew", "downy-mildew", "gummy-stem-blight"], commonPestIds: ["spider-mite", "whitefly", "thrips", "aphid-green"] },
  { id: "ornamental-rose", scientificName: "Rosa spp.", names: L("atirgul", "роза", "раушан", "роза", "rose"), group: "ornamental", tempC: "15–25", humidity: "moderate", soil: "fertile", ph: "6.0–6.5", irrigation: "base of plant", regions: ["KZ", "UZ", "KG"], commonDiseaseIds: ["powdery-mildew", "black-spot-rose", "botrytis-gray", "rust-rose"], commonPestIds: ["aphid-green", "spider-mite", "thrips"] },
];
