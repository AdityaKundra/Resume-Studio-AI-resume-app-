import type { OptimizedResume } from "./types";

/** Parse model text; tolerate whitespace and stray markdown fences. */
export function parseStructuredJson(raw: string): unknown {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/u, "");
  }
  return JSON.parse(t.trim());
}

export function normalizeOptimizedResume(data: unknown): OptimizedResume {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid resume payload");
  }
  const o = data as Record<string, unknown>;

  const experienceRaw = Array.isArray(o.experience) ? o.experience : [];
  const projectsRaw = Array.isArray(o.projects) ? o.projects : [];

  return {
    name: String(o.name ?? ""),
    title: String(o.title ?? ""),
    summary: String(o.summary ?? ""),
    skills: Array.isArray(o.skills)
      ? o.skills.map((s) => String(s))
      : [],
    experience: experienceRaw.map((e) => {
      const ex = (e ?? {}) as Record<string, unknown>;
      const points = Array.isArray(ex.points)
        ? ex.points.map((p) => String(p))
        : [];
      return {
        company: String(ex.company ?? ""),
        role: String(ex.role ?? ""),
        duration: String(ex.duration ?? ""),
        points,
      };
    }),
    projects: projectsRaw.map((p) => {
      const pr = (p ?? {}) as Record<string, unknown>;
      return {
        name: String(pr.name ?? ""),
        description: String(pr.description ?? ""),
      };
    }),
  };
}
