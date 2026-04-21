import { sha256Hex } from "@/lib/hash-sig";
import {
  clearStoredProfile,
  loadStoredProfile,
  saveStoredProfile,
} from "@/lib/profile-storage";
import { tryParseUserProfile } from "@/lib/user-profile";
import {
  clearResumeVersions,
  deleteResumeVersion as deleteLocalVersion,
  importResumeVersionsFromJson,
  loadSavedVersions,
  saveResumeVersion as saveLocalVersion,
  VERSIONS_EXPORT_SCHEMA,
} from "@/lib/resume-versions";
import type { StaticUserProfile } from "@/lib/static-profile";
import type { InterviewPrepResponse, SavedResumeVersion } from "@/lib/types";

let dbEnabledCache: boolean | null = null;

async function fetchDbEnabled(): Promise<boolean> {
  if (dbEnabledCache !== null) return dbEnabledCache;
  try {
    const res = await fetch("/api/db/status", { credentials: "include" });
    if (!res.ok) {
      dbEnabledCache = false;
      return false;
    }
    const data = (await res.json()) as { enabled?: boolean };
    dbEnabledCache = data.enabled === true;
    return dbEnabledCache;
  } catch {
    dbEnabledCache = false;
    return false;
  }
}

/** Invalidate after tests or env change (not normally needed). */
export function resetDbEnabledCache(): void {
  dbEnabledCache = null;
}

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(input, { ...init, credentials: "include" });
  let data: T = {} as T;
  try {
    data = (await res.json()) as T;
  } catch {
    /* empty */
  }
  return { ok: res.ok, status: res.status, data };
}

export async function loadUserProfile(): Promise<StaticUserProfile | null> {
  const useDb = await fetchDbEnabled();
  if (useDb) {
    const { ok, status, data } = await fetchJson<{ profile: unknown | null }>(
      "/api/db/profile"
    );
    if (ok && status === 200) {
      if (data.profile != null && typeof data.profile === "object") {
        const parsed = tryParseUserProfile(data.profile);
        if (parsed.ok) {
          saveStoredProfile(parsed.profile);
          return parsed.profile;
        }
      }
      const local = loadStoredProfile();
      return local;
    }
  }
  return loadStoredProfile();
}

export async function saveUserProfile(profile: StaticUserProfile): Promise<void> {
  saveStoredProfile(profile);
  const useDb = await fetchDbEnabled();
  if (!useDb) return;
  const { ok } = await fetchJson("/api/db/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!ok) {
    dbEnabledCache = null;
  }
}

export async function clearUserProfile(): Promise<void> {
  clearStoredProfile();
  const useDb = await fetchDbEnabled();
  if (!useDb) return;
  const { ok } = await fetchJson("/api/db/profile", { method: "DELETE" });
  if (!ok) {
    dbEnabledCache = null;
  }
}

export async function loadUserVersions(): Promise<SavedResumeVersion[]> {
  const useDb = await fetchDbEnabled();
  if (useDb) {
    const { ok, data } = await fetchJson<{ versions?: SavedResumeVersion[] }>(
      "/api/db/resume-versions"
    );
    if (ok && Array.isArray(data.versions)) {
      return data.versions;
    }
  }
  return loadSavedVersions();
}

export async function saveUserVersion(
  entry: Omit<SavedResumeVersion, "id" | "timestamp"> & {
    id?: string;
    timestamp?: number;
  }
): Promise<SavedResumeVersion> {
  const local = saveLocalVersion(entry);
  const useDb = await fetchDbEnabled();
  if (!useDb) return local;
  const { ok } = await fetchJson("/api/db/resume-versions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(local),
  });
  if (!ok) {
    dbEnabledCache = null;
  }
  return local;
}

export async function deleteUserVersion(id: string): Promise<void> {
  deleteLocalVersion(id);
  const useDb = await fetchDbEnabled();
  if (!useDb) return;
  const { ok } = await fetchJson(`/api/db/resume-versions?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!ok) {
    dbEnabledCache = null;
  }
}

export async function clearUserVersions(): Promise<void> {
  clearResumeVersions();
  const useDb = await fetchDbEnabled();
  if (!useDb) return;
  const { ok } = await fetchJson("/api/db/resume-versions?all=1", {
    method: "DELETE",
  });
  if (!ok) {
    dbEnabledCache = null;
  }
}

export async function importUserVersionsFromJson(
  json: string,
  mode: "replace" | "merge"
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const local = importResumeVersionsFromJson(json, mode);
  if (!local.ok) return local;
  const useDb = await fetchDbEnabled();
  if (!useDb) return local;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return local;
  }
  let versionsRaw: unknown[] | null = null;
  if (Array.isArray(parsed)) {
    versionsRaw = parsed;
  } else if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as Record<string, unknown>).versions)
  ) {
    versionsRaw = (parsed as { versions: unknown[] }).versions;
  }
  if (!versionsRaw) return local;
  const { ok } = await fetchJson("/api/db/resume-versions/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, versions: versionsRaw }),
  });
  if (!ok) {
    dbEnabledCache = null;
  }
  return local;
}

export async function exportUserVersionsJson(): Promise<string> {
  const versions = await loadUserVersions();
  return JSON.stringify(
    {
      schema: VERSIONS_EXPORT_SCHEMA,
      exportedAt: new Date().toISOString(),
      versions,
    },
    null,
    2
  );
}

export async function loadCachedInterviewPrep(
  prepContextSig: string
): Promise<InterviewPrepResponse | null> {
  const useDb = await fetchDbEnabled();
  if (!useDb) return null;
  const sig = await sha256Hex(prepContextSig);
  const { ok, data } = await fetchJson<{ prep: InterviewPrepResponse | null }>(
    `/api/db/interview-prep?sig=${encodeURIComponent(sig)}`
  );
  if (!ok || !data.prep) return null;
  return data.prep;
}

export async function persistInterviewPrep(
  prepContextSig: string,
  prep: InterviewPrepResponse
): Promise<void> {
  const useDb = await fetchDbEnabled();
  if (!useDb) return;
  const sourceSig = await sha256Hex(prepContextSig);
  const { ok } = await fetchJson("/api/db/interview-prep", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceSig, prep }),
  });
  if (!ok) {
    dbEnabledCache = null;
  }
}
