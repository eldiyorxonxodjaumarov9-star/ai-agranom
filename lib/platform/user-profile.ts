import type { Locale } from "@/lib/i18n/types";

export interface UserProfile {
  locale?: Locale;
  regionId?: string;
  updatedAt: string;
}

const PROFILE_KEY = "agro-olam-user-profile";

export function loadUserProfile(): UserProfile {
  if (typeof window === "undefined") {
    return { updatedAt: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { updatedAt: new Date().toISOString() };
    return JSON.parse(raw) as UserProfile;
  } catch {
    return { updatedAt: new Date().toISOString() };
  }
}

export function saveUserProfile(patch: Partial<UserProfile>): UserProfile {
  const current = loadUserProfile();
  const next: UserProfile = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }
  return next;
}
