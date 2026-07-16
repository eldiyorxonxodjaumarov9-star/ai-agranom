export type Locale = "kk" | "ru" | "uz" | "ky";

export const LOCALES: {
  code: Locale;
  flag: string;
  label: string;
}[] = [
  { code: "kk", flag: "🇰🇿", label: "Қазақша" },
  { code: "ru", flag: "🇷🇺", label: "Русский" },
  { code: "uz", flag: "🇺🇿", label: "Oʻzbekcha" },
  { code: "ky", flag: "🇰🇬", label: "Кыргызча" },
];

export const DEFAULT_LOCALE: Locale = "ru";

export interface Messages {
  nav: {
    region: string;
    weather: string;
    brand: string;
  };
  weather: {
    temperature: string;
    humidity: string;
    wind: string;
    rain: string;
    windUnit: string;
  };
  hero: {
    title: string;
    subtitle: string;
    description: string;
  };
  actions: {
    disease: { title: string; subtitle: string; prompt: string };
    diagnosis: { title: string; subtitle: string; prompt: string };
    ask: { title: string; subtitle: string };
    voice: { title: string; subtitle: string };
  };
  chat: {
    newChat: string;
    chats: string;
    rename: string;
    pin: string;
    unpin: string;
    delete: string;
    deleteTitle: string;
    deleteBody: string;
    deleteCannotUndo: string;
    deleteConfirm: string;
    cancel: string;
    close: string;
    send: string;
    placeholder: string;
    emptyHint: string;
    error: string;
    voiceUnsupported: string;
    analyzeImages: string;
    file: string;
    photo: string;
    voice: string;
    examples: string[];
  };
  bottomNav: {
    home: string;
    ai: string;
    market: string;
    fav: string;
    profile: string;
    settings: string;
  };
  marketplace: {
    note: string;
  };
}
