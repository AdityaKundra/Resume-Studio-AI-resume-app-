import type { StaticUserProfile } from "./static-profile";
import { tryParseUserProfile } from "./user-profile";

const STORAGE_KEY = "ai-resume-user-profile-v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/** Load validated profile from localStorage, or null if missing/invalid. */
export function loadStoredProfile(): StaticUserProfile | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const r = tryParseUserProfile(parsed);
    return r.ok ? r.profile : null;
  } catch {
    return null;
  }
}

export function saveStoredProfile(profile: StaticUserProfile): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // quota / private mode
  }
}

export function clearStoredProfile(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
