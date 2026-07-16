"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
  type Messages,
} from "@/lib/i18n/types";
import { getMessages } from "@/lib/i18n/messages";
import { loadUserProfile, saveUserProfile } from "@/lib/platform/user-profile";

const LOCALE_KEY = "agro-olam-locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
  locales: typeof LOCALES;
  ready: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocale(value: string | null | undefined): value is Locale {
  return value === "kk" || value === "ru" || value === "uz" || value === "ky";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const profile = loadUserProfile();
    const stored = localStorage.getItem(LOCALE_KEY);
    const initial = isLocale(profile.locale)
      ? profile.locale
      : isLocale(stored)
        ? stored
        : DEFAULT_LOCALE;
    setLocaleState(initial);
    document.documentElement.lang = initial;
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_KEY, next);
    saveUserProfile({ locale: next });
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: getMessages(locale),
      locales: LOCALES,
      ready,
    }),
    [locale, setLocale, ready]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function useT() {
  return useLocale().t;
}
