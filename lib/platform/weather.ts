import type { WeatherSnapshot } from "./types";
import type { Locale } from "@/lib/i18n/types";
import { getRegionName } from "@/lib/i18n/regions";
import {
  getWeatherAdvice,
  getWeatherSummary,
} from "@/lib/i18n/weather-labels";

/** Регионы Казахстана — координаты */
export const REGIONS = [
  { id: "almaty", lat: 43.2389, lon: 76.8897 },
  { id: "astana", lat: 51.1694, lon: 71.4491 },
  { id: "shymkent", lat: 42.3417, lon: 69.5901 },
  { id: "abay", lat: 50.4111, lon: 80.2275 },
  { id: "akmola", lat: 51.1322, lon: 69.393 },
  { id: "aktobe", lat: 50.2839, lon: 57.167 },
  { id: "almaty-obl", lat: 45.0015, lon: 78.3755 },
  { id: "atyrau", lat: 47.1164, lon: 51.9133 },
  { id: "east-kz", lat: 49.9483, lon: 82.6278 },
  { id: "zhambyl", lat: 42.9, lon: 71.3667 },
  { id: "zhetysu", lat: 45.0015, lon: 78.3755 },
  { id: "west-kz", lat: 51.2278, lon: 51.3864 },
  { id: "karaganda", lat: 49.8047, lon: 73.1094 },
  { id: "kostanay", lat: 53.2144, lon: 63.6246 },
  { id: "kyzylorda", lat: 44.8479, lon: 65.5093 },
  { id: "mangystau", lat: 43.6509, lon: 51.1722 },
  { id: "pavlodar", lat: 52.287, lon: 76.9733 },
  { id: "north-kz", lat: 54.8753, lon: 69.162 },
  { id: "turkestan", lat: 43.3017, lon: 68.2517 },
  { id: "ulytau", lat: 47.7997, lon: 67.7141 },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export const DEFAULT_REGION_ID: RegionId = "almaty";

export function weatherEmoji(code: number): string {
  if ([61, 63, 80, 81, 82].includes(code)) return "🌧";
  if ([71, 73, 75].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈";
  if ([45, 48].includes(code)) return "🌫";
  if ([2, 3].includes(code)) return "⛅";
  return "☀️";
}

async function fetchAt(
  lat: number,
  lon: number,
  label: string,
  locale: Locale
): Promise<WeatherSnapshot | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m` +
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
    windSpeed: Number(c.wind_speed_10m ?? 0),
    precipitationProb: precip,
    weatherCode: code,
    summary: getWeatherSummary(code, locale),
    advice: getWeatherAdvice(temp, precip, code, locale),
    locationLabel: label,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchWeatherByRegion(
  regionId: string,
  locale: Locale = "ru"
): Promise<WeatherSnapshot | null> {
  const region = REGIONS.find((r) => r.id === regionId) || REGIONS[0];
  const label = getRegionName(region.id, locale);
  return fetchAt(region.lat, region.lon, label, locale);
}

export async function fetchWeatherByGeolocation(
  locale: Locale = "ru"
): Promise<WeatherSnapshot | null> {
  if (typeof window === "undefined" || !navigator.geolocation) return null;

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
    });
  }).catch(() => null);

  if (!position) return null;
  const { latitude, longitude } = position.coords;
  return fetchAt(
    latitude,
    longitude,
    `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
    locale
  );
}

export function weatherPromptBlock(
  w: WeatherSnapshot | null,
  locale: Locale = "ru"
): string {
  if (!w) return "";
  const labels: Record<Locale, string> = {
    kk: "АЙМАҚТАҒЫ АУА РАЙЫ",
    ru: "ПОГОДА В РЕГИОНЕ",
    uz: "HUDUD OB-HAVOSI",
    ky: "АЙМАКТАГЫ АБА ЫРАЙЫ",
  };
  const header = labels[locale] ?? labels.ru;
  return `${header} (${w.locationLabel}):
Температура: ${w.temp}°C, влажность ${w.humidity}%, ветер ${w.windSpeed} км/ч, вероятность дождя ${w.precipitationProb}%, состояние: ${w.summary}.
Рекомендация: ${w.advice}`;
}

/** Re-localize cached weather without refetching API */
export function localizeWeather(
  w: WeatherSnapshot,
  locale: Locale,
  regionId: string
): WeatherSnapshot {
  return {
    ...w,
    locationLabel: getRegionName(regionId, locale),
    summary: getWeatherSummary(w.weatherCode, locale),
    advice: getWeatherAdvice(
      w.temp,
      w.precipitationProb,
      w.weatherCode,
      locale
    ),
  };
}
