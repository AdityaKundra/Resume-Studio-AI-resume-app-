import type { SavedResumeVersion } from "./types";

const STORAGE_KEY = "ai-resume-platform-versions-v1";
const MAX_VERSIONS = 40;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadSavedVersions(): SavedResumeVersion[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is SavedResumeVersion =>
        v != null &&
        typeof v === "object" &&
        typeof (v as SavedResumeVersion).id === "string" &&
        typeof (v as SavedResumeVersion).timestamp === "number" &&
        (v as SavedResumeVersion).resumeData != null
    );
  } catch {
    return [];
  }
}

function persist(list: SavedResumeVersion[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota or private mode
  }
}

export function saveResumeVersion(entry: Omit<SavedResumeVersion, "id" | "timestamp"> & { id?: string; timestamp?: number }): SavedResumeVersion {
  const id = entry.id ?? crypto.randomUUID();
  const timestamp = entry.timestamp ?? Date.now();
  const full: SavedResumeVersion = {
    id,
    timestamp,
    jobTitle: entry.jobTitle,
    resumeData: entry.resumeData,
    atsScore: entry.atsScore,
    advancedAts: entry.advancedAts,
    jobDescription: entry.jobDescription,
  };
  const list = loadSavedVersions().filter((v) => v.id !== id);
  list.unshift(full);
  persist(list.slice(0, MAX_VERSIONS));
  return full;
}

export function deleteResumeVersion(id: string): void {
  const list = loadSavedVersions().filter((v) => v.id !== id);
  persist(list);
}

export function clearResumeVersions(): void {
  persist([]);
}

export const VERSIONS_EXPORT_SCHEMA = "ai-resume-platform-versions-v1";

function isValidSavedVersion(v: unknown): v is SavedResumeVersion {
  return (
    v != null &&
    typeof v === "object" &&
    typeof (v as SavedResumeVersion).id === "string" &&
    typeof (v as SavedResumeVersion).timestamp === "number" &&
    (v as SavedResumeVersion).resumeData != null
  );
}

export function exportVersionsJson(): string {
  return JSON.stringify(
    {
      schema: VERSIONS_EXPORT_SCHEMA,
      exportedAt: new Date().toISOString(),
      versions: loadSavedVersions(),
    },
    null,
    2
  );
}

export type ImportVersionsResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

/**
 * Import versions from JSON (array or `{ schema, versions }`). Caps at MAX_VERSIONS.
 */
export function importResumeVersionsFromJson(
  json: string,
  mode: "replace" | "merge"
): ImportVersionsResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }

  let rawList: unknown[] | null = null;
  if (Array.isArray(data)) {
    rawList = data;
  } else if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.versions)) rawList = o.versions;
  }
  if (!rawList) {
    return {
      ok: false,
      error: "Expected a JSON array of versions or an object with a versions array.",
    };
  }

  const versions = rawList.filter(isValidSavedVersion);
  if (versions.length === 0) {
    return { ok: false, error: "No valid resume versions found in file." };
  }

  if (mode === "replace") {
    persist(versions.slice(0, MAX_VERSIONS));
    return { ok: true, count: Math.min(versions.length, MAX_VERSIONS) };
  }

  const existing = loadSavedVersions();
  const byId = new Map<string, SavedResumeVersion>();
  for (const v of existing) byId.set(v.id, v);
  for (const v of versions) {
    const cur = byId.get(v.id);
    if (!cur || v.timestamp >= cur.timestamp) byId.set(v.id, v);
  }
  const merged = [...byId.values()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_VERSIONS);
  persist(merged);
  return { ok: true, count: versions.length };
}

/** First meaningful line of JD, trimmed for display. */
export function deriveJobTitle(jobDescription: string): string {
  const line =
    jobDescription
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "Untitled role";
  return line.length > 72 ? `${line.slice(0, 69)}…` : line;
}
