/** Agro Olam AI Agronom platform domain types */

export type CropId =
  | "pomidor"
  | "bodring"
  | "kartoshka"
  | "bugdoy"
  | "olma"
  | "uzum"
  | "other";

export interface CropAdviceEntry {
  id: string;
  type: "advice" | "disease" | "irrigation" | "fertilizer" | "chat";
  title: string;
  content: string;
  createdAt: string;
}

export interface CropImageEntry {
  id: string;
  dataUrl: string;
  note?: string;
  weekLabel?: string;
  createdAt: string;
}

export interface CropRecord {
  id: CropId | string;
  name: string;
  advice: CropAdviceEntry[];
  diseases: CropAdviceEntry[];
  irrigation: CropAdviceEntry[];
  fertilizers: CropAdviceEntry[];
  images: CropImageEntry[];
  chats: { role: "user" | "assistant"; content: string; at: string }[];
  healthScore: number;
  healthPros: string[];
  healthCons: string[];
  updatedAt: string;
}

export interface CalendarTask {
  id: string;
  cropId: string;
  cropName: string;
  title: string;
  dueDate: string; // ISO date
  done: boolean;
  sourceMessageId?: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  at: string; // ISO datetime
  cropName?: string;
  notified: boolean;
  createdAt: string;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  category: string;
  price: string;
  description: string;
  keywords: string[];
  href: string;
}

export interface AgentMeta {
  products?: string[];
  calendar?: { title: string; daysFromNow: number; crop?: string }[];
  health?: {
    crop: string;
    score: number;
    pros: string[];
    cons: string[];
  };
  reminders?: { title: string; hoursFromNow: number }[];
  imageAnalysis?: {
    index: number;
    status: "healthy" | "disease" | "deficiency" | "pest" | "burn" | "other";
    label: string;
    advice: string;
  }[];
}

export interface WeatherSnapshot {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitationProb: number;
  weatherCode: number;
  summary: string;
  advice: string;
  locationLabel: string;
  fetchedAt: string;
}
