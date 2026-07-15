import type { WeatherSnapshot } from "./types";

const WMO: Record<number, string> = {
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
};

export const REGIONS = [
  { id: "toshkent", name: "Toshkent", lat: 41.2995, lon: 69.2401 },
  { id: "samarqand", name: "Samarqand", lat: 39.6542, lon: 66.9597 },
  { id: "fargona", name: "Farg'ona", lat: 40.3842, lon: 71.7843 },
  { id: "andijon", name: "Andijon", lat: 40.7821, lon: 72.3442 },
  { id: "namangan", name: "Namangan", lat: 40.9983, lon: 71.6726 },
  { id: "buxoro", name: "Buxoro", lat: 39.7681, lon: 64.4556 },
  { id: "xorazm", name: "Urganch", lat: 41.55, lon: 60.6333 },
  { id: "qarshi", name: "Qarshi", lat: 38.8606, lon: 65.7891 },
  { id: "navoiy", name: "Navoiy", lat: 40.1039, lon: 65.3686 },
  { id: "jizzax", name: "Jizzax", lat: 40.1158, lon: 67.8422 },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export function weatherEmoji(code: number): string {
  if ([61, 63, 80, 81, 82].includes(code)) return "🌧";
  if ([71, 73, 75].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈";
  if ([45, 48].includes(code)) return "🌫";
  if ([2, 3].includes(code)) return "⛅";
  return "☀️";
}

export function weatherAdvice(temp: number, precipProb: number, code: number): string {
  if (precipProb >= 60 || [61, 63, 80, 95].includes(code)) {
    return "Yomg'ir ehtimoli yuqori. Bugun sug'ormang.";
  }
  if (temp >= 40) {
    return `Issiq (~${Math.round(temp)}°C). Soyali sug'orish tavsiya etiladi.`;
  }
  if (temp <= 5) {
    return "Havo sovuq. Issiqsevar ekinlarni himoya qiling.";
  }
  return "Ob-havo qulay.";
}

async function fetchAt(lat: number, lon: number, label: string): Promise<WeatherSnapshot | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code` +
    `&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const c = data.current;
  const code = Number(c.weather_code ?? 0);
  const temp = Number(c.temperature_2m);
  const precip = Number(c.precipitation_probability ?? 0);

  return {
    temp,
    feelsLike: Number(c.apparent_temperature),
    humidity: Number(c.relative_humidity_2m),
    precipitationProb: precip,
    weatherCode: code,
    summary: WMO[code] || "Ob-havo",
    advice: weatherAdvice(temp, precip, code),
    locationLabel: label,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchWeatherByRegion(regionId: string): Promise<WeatherSnapshot | null> {
  const region = REGIONS.find((r) => r.id === regionId) || REGIONS[0];
  return fetchAt(region.lat, region.lon, region.name);
}

export async function fetchWeatherByGeolocation(): Promise<WeatherSnapshot | null> {
  if (typeof window === "undefined" || !navigator.geolocation) return null;

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
    });
  }).catch(() => null);

  if (!position) return null;
  const { latitude, longitude } = position.coords;
  return fetchAt(latitude, longitude, `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
}

export function weatherPromptBlock(w: WeatherSnapshot | null): string {
  if (!w) return "";
  return `JOYLASHUV OB-HAVOSI (${w.locationLabel}):
Temp: ${w.temp}°C, namlik ${w.humidity}%, yomg'ir ${w.precipitationProb}%, holat: ${w.summary}.
Maslahat: ${w.advice}`;
}
