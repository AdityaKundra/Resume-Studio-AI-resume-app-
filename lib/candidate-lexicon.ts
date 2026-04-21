import { analyzeJobDescription } from "./jd-analyzer";
import type { StaticUserProfile } from "./static-profile";

/** Lowercased blob of candidate + JD text for substring plausibility checks. */
export type CandidateLexiconContext = {
  blob: string;
  jdBlob: string;
  jdSkillLabels: string[];
};

function safeJson(data: unknown): string {
  try {
    return typeof data === "string" ? data : JSON.stringify(data);
  } catch {
    return "";
  }
}

function asProfile(u: unknown): StaticUserProfile | undefined {
  if (!u || typeof u !== "object") return undefined;
  const o = u as Record<string, unknown>;
  return typeof o.name === "string" && o.experience ? (u as StaticUserProfile) : undefined;
}

/**
 * Build a searchable text corpus: full candidate JSON + JD + parsed JD skills/tools.
 */
export function buildCandidateLexiconContext(
  userData: unknown,
  jobDescription: string
): CandidateLexiconContext {
  const jd = jobDescription.trim();
  const userStr = safeJson(userData);
  const analysis = analyzeJobDescription(jd, asProfile(userData));
  const jdSkillLabels = [...new Set([...analysis.requiredSkills, ...analysis.tools])];
  const jdBlob = [
    jd.toLowerCase(),
    ...jdSkillLabels.map((s) => s.toLowerCase()),
    ...analysis.keyResponsibilities.map((r) => r.toLowerCase()),
  ].join(" ");

  return {
    blob: `${userStr}\n${jdBlob}`.toLowerCase(),
    jdBlob: jd.toLowerCase(),
    jdSkillLabels,
  };
}

const SOFT_SKILLS = new Set([
  "communication",
  "leadership",
  "teamwork",
  "collaboration",
  "mentoring",
  "problem solving",
  "time management",
]);

/** True if phrase plausibly comes from candidate data or JD (not a random invented stack). */
export function isPhraseAllowed(
  phrase: string,
  ctx: CandidateLexiconContext
): boolean {
  const p = phrase.trim().toLowerCase();
  if (p.length < 2) return true;
  if (SOFT_SKILLS.has(p)) return true;
  if (ctx.blob.includes(p)) return true;
  const parts = p.split(/[^a-z0-9+#.]+/).filter((w) => w.length > 2);
  if (parts.length === 0) return true;
  const hits = parts.filter(
    (w) => ctx.blob.includes(w) || ctx.jdBlob.includes(w)
  );
  return hits.length >= Math.max(1, Math.ceil(parts.length * 0.6));
}
