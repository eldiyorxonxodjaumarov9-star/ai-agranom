import type { Locale } from "./types";

const WMO: Record<Locale, Record<number, string>> = {
  kk: {
    0: "Ашық аспан",
    1: "Негізінен ашық",
    2: "Бұлтты",
    3: "Бұлтты",
    45: "Тұман",
    51: "Сіркірей жаңбыр",
    61: "Жаңбыр",
    63: "Қатты жаңбыр",
    71: "Қар",
    80: "Нөсер",
    95: "Найзағай",
  },
  ru: {
    0: "Ясно",
    1: "Преимущественно ясно",
    2: "Переменная облачность",
    3: "Облачно",
    45: "Туман",
    51: "Морось",
    61: "Дождь",
    63: "Сильный дождь",
    71: "Снег",
    80: "Ливень",
    95: "Гроза",
  },
  uz: {
    0: "Ochiq osmon",
    1: "Asosan ochiq",
    2: "Qisman bulutli",
    3: "Bulutli",
    45: "Tuman",
    51: "Mayda yomg'ir",
    61: "Yomg'ir",
    63: "Kuchli yomg'ir",
    71: "Qor",
    80: "Jala",
    95: "Momaqaldiroq",
  },
  ky: {
    0: "Ачык аспан",
    1: "Негизинен ачык",
    2: "Булуттуу",
    3: "Булуттуу",
    45: "Туман",
    51: "Чиркей жамгыр",
    61: "Жамгыр",
    63: "Катуу жамгыр",
    71: "Кар",
    80: "Нөшөр",
    95: "Чагылган",
  },
};

const ADVICE: Record<Locale, { rain: string; hot: string; cold: string; ok: string }> = {
  kk: {
    rain: "Жаңбыр ықтималдығы жоғары. Бүгін суаруды ұсынбаймыз.",
    hot: "Ыстық (~{temp}°C). Таңертең немесе кешке суаруды ұсынамыз.",
    cold: "Суық ауа. Жылы сүйетін дақылдарды қорғаңыз.",
    ok: "Ауа райы қолайлы.",
  },
  ru: {
    rain: "Высокая вероятность дождя. Сегодня полив не рекомендуется.",
    hot: "Жарко (~{temp}°C). Рекомендуется полив утром или вечером.",
    cold: "Холодная погода. Защитите теплолюбивые культуры.",
    ok: "Погодные условия благоприятны.",
  },
  uz: {
    rain: "Yomg'ir ehtimoli yuqori. Bugun sug'orish tavsiya etilmaydi.",
    hot: "Issiq (~{temp}°C). Ertalab yoki kechqurun sug'orish tavsiya etiladi.",
    cold: "Sovuq havo. Issiqsevar ekinlarni himoya qiling.",
    ok: "Ob-havo qulay.",
  },
  ky: {
    rain: "Жамгыр ыктымалдыгы жогору. Бүгүн сугарбоону сунбайбыз.",
    hot: "Ысык (~{temp}°C). Эртең менен же кечкурун сугаруу сунулат.",
    cold: "Суук аба. Жылуу сүйгөн өсүмдүктөрдү коргоңуз.",
    ok: "Аба ырайы ыңгайлуу.",
  },
};

const FALLBACK: Record<Locale, string> = {
  kk: "Ауа райы",
  ru: "Погода",
  uz: "Ob-havo",
  ky: "Аба ырайы",
};

export function getWeatherSummary(code: number, locale: Locale): string {
  return WMO[locale]?.[code] ?? WMO.ru[code] ?? FALLBACK[locale];
}

export function getWeatherAdvice(
  temp: number,
  precipProb: number,
  code: number,
  locale: Locale
): string {
  const a = ADVICE[locale] ?? ADVICE.ru;
  if (precipProb >= 60 || [61, 63, 80, 95].includes(code)) return a.rain;
  if (temp >= 35) return a.hot.replace("{temp}", String(Math.round(temp)));
  if (temp <= 0) return a.cold;
  return a.ok;
}
