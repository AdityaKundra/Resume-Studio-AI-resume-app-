import type { CandidateLexiconContext } from "./candidate-lexicon";
import { isPhraseAllowed } from "./candidate-lexicon";
import { resumeToPlainText } from "./ats-score";
import type { OptimizedResume } from "./types";

const VAGUE_RE =
  /\b(worked on|involved in|helped with|responsible for|familiar with|assisted|participated in)\b/i;

const STRONG_VERB_RE =
  /^(built|designed|optimized|led|implemented|delivered|developed|architected|owned|drove|scaled|migrated|automated|reduced|improved|increased|decreased|established|streamlined|launched|shipped|refactored|integrated|deployed|mentored|coordinated|executed|engineered|created|accelerated|enhanced|spearheaded|negotiated|cut|expanded|hardened|secured|diagnosed|resolved|partnered|collaborated|directed|managed|oversaw|introduced|converted|migrated)/i;

const MAX_BULLET_WORDS = 20;
const MAX_SKILLS_COMPRESSED = 12;
const MIN_SKILLS_COMPRESSED = 8;
const COMPRESS_TEXT_THRESHOLD = 7200;

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function truncateBulletToWords(s: string, maxWords: number): string {
  const words = s.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return s.trim();
  return words.slice(0, maxWords).join(" ").replace(/[,;]$/, "") + "…";
}

/** Dedupe skills case-insensitively, preserve first-seen casing. */
export function dedupeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of skills) {
    const t = s.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export function applyDeterministicResumeFixes(
  resume: OptimizedResume
): OptimizedResume {
  const skills = dedupeSkills(resume.skills);
  const experience = resume.experience.map((e) => ({
    ...e,
    points: e.points.map((p) => truncateBulletToWords(p, MAX_BULLET_WORDS)),
  }));
  return { ...resume, skills, experience };
}

function plainResumeLength(resume: OptimizedResume): number {
  return resumeToPlainText(resume).length;
}

/**
 * If output is very long, keep experience bullets, trim skills to 8–12, shorten projects.
 */
export function compressResumeIfNeeded(resume: OptimizedResume): OptimizedResume {
  if (plainResumeLength(resume) <= COMPRESS_TEXT_THRESHOLD) {
    return resume;
  }
  const skills = dedupeSkills(resume.skills).slice(0, MAX_SKILLS_COMPRESSED);
  const padded =
    skills.length < MIN_SKILLS_COMPRESSED
      ? dedupeSkills(resume.skills).slice(0, MIN_SKILLS_COMPRESSED)
      : skills;
  const projects = resume.projects.map((p) => ({
    ...p,
    description:
      p.description.length > 280
        ? `${p.description.slice(0, 277).trim()}…`
        : p.description,
  }));
  return { ...resume, skills: padded, projects };
}

function extractJdKeywordsForFrequency(jd: string): string[] {
  const words =
    jd
      .toLowerCase()
      .match(/\b[a-z][a-z0-9+.#-]{2,}\b/g) ?? [];
  const stop = new Set([
    "the", "and", "for", "with", "you", "our", "are", "this", "that", "from",
    "your", "will", "have", "has", "been", "was", "not", "all", "any", "can",
    "who", "what", "when", "how", "why", "into", "more", "than", "such", "also",
    "their", "they", "them", "work", "team", "role", "job", "description",
    "including", "other", "years", "year", "experience", "strong", "looking",
  ]);
  return [...new Set(words.filter((w) => !stop.has(w)))].slice(0, 60);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle || needle.length < 3) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let i = 0;
  let c = 0;
  while (true) {
    const j = h.indexOf(n, i);
    if (j === -1) break;
    c++;
    i = j + Math.max(1, n.length);
  }
  return c;
}

export type ResumeValidationContext = {
  lexicon: CandidateLexiconContext;
  jobDescription: string;
};

/**
 * Returns human-readable issues for the model to fix on retry.
 */
export function validateOptimizedResume(
  resume: OptimizedResume,
  ctx: ResumeValidationContext
): { ok: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!resume.name?.trim()) issues.push('Required field "name" is empty.');
  if (!resume.title?.trim()) issues.push('Required field "title" is empty.');
  if (!resume.summary?.trim()) issues.push('Required field "summary" is empty.');

  if (!Array.isArray(resume.skills) || resume.skills.length === 0) {
    issues.push('"skills" must be a non-empty array.');
  }

  const skillSet = new Set<string>();
  for (const s of resume.skills) {
    const k = s.trim().toLowerCase();
    if (!s.trim()) {
      issues.push("Remove empty skill entries.");
      continue;
    }
    if (skillSet.has(k)) {
      issues.push(`Duplicate skill (case-insensitive): "${s}".`);
    }
    skillSet.add(k);
    if (!isPhraseAllowed(s, ctx.lexicon)) {
      issues.push(
        `Skill "${s}" does not appear to come from candidate data or the job description — remove it or only use tools/tech explicitly present in the inputs.`
      );
    }
  }

  if (!resume.experience?.length) {
    issues.push('"experience" must have at least one role.');
  }

  for (let i = 0; i < resume.experience.length; i++) {
    const e = resume.experience[i]!;
    const label = `experience[${i}] (${e.company || "?"} / ${e.role || "?"})`;
    if (!e.company?.trim()) issues.push(`${label}: "company" is empty.`);
    if (!e.role?.trim()) issues.push(`${label}: "role" is empty.`);
    if (!e.duration?.trim()) issues.push(`${label}: "duration" is empty.`);
    if (!e.points?.length) {
      issues.push(`${label}: add at least one bullet in "points".`);
    }
    for (const p of e.points) {
      if (!p.trim()) {
        issues.push(`${label}: remove empty bullet strings.`);
        continue;
      }
      const wc = wordCount(p);
      if (wc > MAX_BULLET_WORDS) {
        issues.push(
          `${label}: bullet exceeds ${MAX_BULLET_WORDS} words (has ${wc}) — shorten: "${p.slice(0, 80)}…"`
        );
      }
      if (VAGUE_RE.test(p)) {
        issues.push(
          `${label}: replace vague phrasing ("worked on", "involved in", etc.) with action + outcome: "${p.slice(0, 100)}"`
        );
      }
      if (!STRONG_VERB_RE.test(p.trim())) {
        issues.push(
          `${label}: bullet should start with a strong action verb (Built, Led, Implemented, …): "${p.slice(0, 100)}"`
        );
      }
    }
  }

  for (let i = 0; i < resume.projects.length; i++) {
    const p = resume.projects[i]!;
    if (!p.name?.trim() && !p.description?.trim()) continue;
    if (!p.name?.trim()) issues.push(`projects[${i}]: "name" is empty.`);
    if (!p.description?.trim()) {
      issues.push(`projects[${i}]: "description" is empty.`);
    }
  }

  const fullText = [
    resume.summary,
    ...resume.skills,
    ...resume.experience.flatMap((e) => e.points),
    ...resume.projects.map((p) => p.description),
  ]
    .join(" ")
    .toLowerCase();

  const importantKw = [
    ...new Set([
      ...ctx.lexicon.jdSkillLabels.map((s) => s.toLowerCase()),
      ...extractJdKeywordsForFrequency(ctx.jobDescription).filter((k) => k.length >= 5),
    ]),
  ].slice(0, 36);

  let keywordIssueCount = 0;
  for (const k of importantKw) {
    if (k.length < 4) continue;
    const n = countOccurrences(fullText, k);
    if (n > 2 && keywordIssueCount < 10) {
      keywordIssueCount++;
      issues.push(
        `Keyword "${k}" appears more than twice — use at most twice, in meaningful context (prefer experience bullets over skills-only).`
      );
    }
  }

  return { ok: issues.length === 0, issues };
}
