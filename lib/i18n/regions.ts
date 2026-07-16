import type { Locale } from "./types";
import type { RegionId } from "@/lib/platform/weather";

export const REGION_NAMES: Record<RegionId, Record<Locale, string>> = {
  almaty: {
    kk: "Алматы",
    ru: "г. Алматы",
    uz: "Olmati",
    ky: "Алматы",
  },
  astana: {
    kk: "Астана",
    ru: "г. Астана",
    uz: "Ostona",
    ky: "Астана",
  },
  shymkent: {
    kk: "Шымкент",
    ru: "Шымкент",
    uz: "Chimkent",
    ky: "Шымкент",
  },
  abay: {
    kk: "Абай облысы",
    ru: "Абайская область",
    uz: "Abay viloyati",
    ky: "Абай облусу",
  },
  akmola: {
    kk: "Ақмола облысы",
    ru: "Акмолинская область",
    uz: "Aqmola viloyati",
    ky: "Акмола облусу",
  },
  aktobe: {
    kk: "Ақтөбе облысы",
    ru: "Актюбинская область",
    uz: "Aqtobe viloyati",
    ky: "Актөбе облусу",
  },
  "almaty-obl": {
    kk: "Алматы облысы",
    ru: "Алматинская область",
    uz: "Olmati viloyati",
    ky: "Алматы облусу",
  },
  atyrau: {
    kk: "Атырау облысы",
    ru: "Атырауская область",
    uz: "Atyrau viloyati",
    ky: "Атырау облусу",
  },
  "east-kz": {
    kk: "Шығыс Қазақстан облысы",
    ru: "Восточно-Казахстанская область",
    uz: "Sharqiy Qozog'iston viloyati",
    ky: "Чыгыш Казакстан облусу",
  },
  zhambyl: {
    kk: "Жамбыл облысы",
    ru: "Жамбылская область",
    uz: "Jambil viloyati",
    ky: "Жамбыл облусу",
  },
  zhetysu: {
    kk: "Жетісу облысы",
    ru: "Жетысуская область",
    uz: "Jetisu viloyati",
    ky: "Жетису облусу",
  },
  "west-kz": {
    kk: "Батыс Қазақстан облысы",
    ru: "Западно-Казахстанская область",
    uz: "G'arbiy Qozog'iston viloyati",
    ky: "Батыш Казакстан облусу",
  },
  karaganda: {
    kk: "Қарағанды облысы",
    ru: "Карагандинская область",
    uz: "Qarag'andi viloyati",
    ky: "Караганды облусу",
  },
  kostanay: {
    kk: "Қостанай облысы",
    ru: "Костанайская область",
    uz: "Qostanay viloyati",
    ky: "Костанай облусу",
  },
  kyzylorda: {
    kk: "Қызылорда облысы",
    ru: "Кызылординская область",
    uz: "Qizilo'rta viloyati",
    ky: "Кызылорда облусу",
  },
  mangystau: {
    kk: "Маңғыстау облысы",
    ru: "Мангистауская область",
    uz: "Mang'istau viloyati",
    ky: "Мангыстау облусу",
  },
  pavlodar: {
    kk: "Павлодар облысы",
    ru: "Павлодарская область",
    uz: "Pavlodar viloyati",
    ky: "Павлодар облусу",
  },
  "north-kz": {
    kk: "Солтүстік Қазақстан облысы",
    ru: "Северо-Казахстанская область",
    uz: "Shimoliy Qozog'iston viloyati",
    ky: "Түндүк Казакстан облусу",
  },
  turkestan: {
    kk: "Түркістан облысы",
    ru: "Туркестанская область",
    uz: "Turkiston viloyati",
    ky: "Түркстан облусу",
  },
  ulytau: {
    kk: "Ұлытау облысы",
    ru: "Улытауская область",
    uz: "Ulutau viloyati",
    ky: "Улутау облусу",
  },
};

export function getRegionName(id: RegionId | string, locale: Locale): string {
  const names = REGION_NAMES[id as RegionId];
  return names?.[locale] ?? id;
}
