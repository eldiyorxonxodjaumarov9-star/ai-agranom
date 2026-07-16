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
  /** Localized product name — always from locales/*.json */
  appName: string;
  metaTitle: string;
  metaDescription: string;
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
    welcome: string;
    ariaLabel: string;
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
    heroBlurb: string;
    askCta: string;
    talkAria: string;
    footerBlurb: string;
    helpLink: string;
    catalogNote: string;
  };
  ui: {
    footerBlurb: string;
    copyright: string;
    featuresTitle: string;
    featuresSubtitle: string;
    voiceFeature: string;
    quickActionsHint: string;
    pdfReportTitle: string;
    pdfAnalysis: string;
  };
  theme: {
    label: string;
    light: string;
    dark: string;
    system: string;
  };
}
