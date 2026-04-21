import type { OptimizedResume } from "@/lib/types";

const STORAGE_KEY = "editable-resume-builder-v1";

export type EditableResumePersisted = {
  resume: OptimizedResume;
  jobDescription: string;
  savedAt: number;
};

export function loadEditableResumeFromStorage(): EditableResumePersisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    if (!o.resume || typeof o.resume !== "object") return null;
    return {
      resume: o.resume as OptimizedResume,
      jobDescription: typeof o.jobDescription === "string" ? o.jobDescription : "",
      savedAt: typeof o.savedAt === "number" ? o.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveEditableResumeToStorage(payload: EditableResumePersisted): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota or private mode */
  }
}

export function clearEditableResumeStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
