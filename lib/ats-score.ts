import {
  extractKeywords,
  keywordsForAtsMatching,
} from "./keyword-extractor";
import type { AdvancedATSResult, ATSBreakdown, OptimizedResume } from "./types";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "our",
  "are",
  "this",
  "that",
  "from",
  "your",
  "will",
  "have",
  "has",
  "been",
  "was",
  "not",
  "all",
  "any",
  "can",
  "who",
  "what",
  "when",
  "how",
  "why",
  "into",
  "more",
  "than",
  "such",
  "also",
  "their",
  "they",
  "them",
  "work",
  "team",
  "role",
  "job",
  "description",
  "including",
  "other",
  "years",
  "year",
  "experience",
]);

function ollamaBaseUrl(): string {
  const u = process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
  return u.replace(/\/$/, "");
}

function embeddingModel(): string {
  return process.env.OLLAMA_EMBEDDING_MODEL?.trim() || "nomic-embed-text";
}

export function resumeToPlainText(resume: OptimizedResume): string {
  return [
    resume.name,
    resume.title,
    resume.summary,
    ...resume.skills,
    ...resume.experience.flatMap((e) => [
      e.company,
      e.role,
      e.duration,
      ...e.points,
    ]),
    ...resume.projects.flatMap((p) => [p.name, p.description]),
  ]
    .join(" ")
    .toLowerCase();
}

function skillsPlain(resume: OptimizedResume): string {
  return resume.skills.join(" ").toLowerCase();
}

function experiencePlain(resume: OptimizedResume): string {
  return resume.experience
    .flatMap((e) => [e.role, e.company, ...e.points])
    .join(" ")
    .toLowerCase();
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

async function ollamaEmbedding(prompt: string): Promise<number[] | null> {
  const url = `${ollamaBaseUrl()}/api/embeddings`;
  const timeoutMs = Math.min(
    Number(process.env.OLLAMA_TIMEOUT_MS) || 240_000,
    60_000
  );
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: embeddingModel(),
        prompt,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { embedding?: number[] };
    if (!Array.isArray(body.embedding) || body.embedding.length === 0) {
      return null;
    }
    return body.embedding;
  } catch {
    return null;
  }
}

function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      .match(/\b[a-z][a-z0-9+.#-]{2,}\b/g) ?? []
  ).filter((t) => !STOP.has(t));
}

function semanticTfIdfSimilarity(jobText: string, resumeText: string): number {
  const jobTok = tokenize(jobText);
  const resTok = tokenize(resumeText);
  if (jobTok.length === 0 || resTok.length === 0) return 0;

  const vocab = new Set<string>([...jobTok, ...resTok]);
  const df = new Map<string, number>();
  for (const t of vocab) {
    let d = 0;
    if (jobTok.includes(t)) d++;
    if (resTok.includes(t)) d++;
    df.set(t, d);
  }

  const tf = (tokens: string[]) => {
    const m = new Map<string, number>();
    for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  };
  const tfJob = tf(jobTok);
  const tfRes = tf(resTok);
  const nDocs = 2;

  const vec = (tfMap: Map<string, number>) => {
    const v = new Map<string, number>();
    for (const term of vocab) {
      const f = tfMap.get(term) ?? 0;
      if (f === 0) continue;
      const idf = Math.log((1 + nDocs) / (1 + (df.get(term) ?? 0))) + 1;
      v.set(term, (1 + Math.log(f)) * idf);
    }
    return v;
  };
  const vj = vec(tfJob);
  const vr = vec(tfRes);

  let dot = 0;
  let nj = 0;
  let nr = 0;
  for (const term of vocab) {
    const a = vj.get(term) ?? 0;
    const b = vr.get(term) ?? 0;
    dot += a * b;
    nj += a * a;
    nr += b * b;
  }
  const denom = Math.sqrt(nj) * Math.sqrt(nr);
  return denom === 0 ? 0 : dot / denom;
}

function shouldSkipEmbeddingsForSpeed(): boolean {
  const v = process.env.ATS_SKIP_EMBEDDINGS?.trim().toLowerCase();
  return v === "1" || v === "true";
}

async function semanticScorePercent(
  jobDescription: string,
  resumePlain: string
): Promise<number> {
  const truncatedJob = jobDescription.slice(0, 8000);
  const truncatedResume = resumePlain.slice(0, 8000);

  if (shouldSkipEmbeddingsForSpeed()) {
    const sim = semanticTfIdfSimilarity(truncatedJob, truncatedResume);
    return Math.round(Math.max(0, Math.min(1, sim)) * 100);
  }

  const [ej, er] = await Promise.all([
    ollamaEmbedding(truncatedJob),
    ollamaEmbedding(truncatedResume),
  ]);

  if (ej && er && ej.length === er.length) {
    const cos = cosineSimilarity(ej, er);
    return Math.round(Math.max(0, Math.min(1, cos)) * 100);
  }

  const sim = semanticTfIdfSimilarity(truncatedJob, truncatedResume);
  return Math.round(Math.max(0, Math.min(1, sim)) * 100);
}

/** Per-term match weight: exact > partial > semantic proxy. */
function termMatchWeight(term: string, resumeLower: string): number {
  const t = term.trim().toLowerCase();
  if (t.length < 2) return 0;
  if (resumeLower.includes(t)) return 1;

  const parts = t.split(/\s+/).filter((p) => p.length > 1);
  if (parts.length > 1) {
    const all = parts.every((p) => resumeLower.includes(p));
    if (all) return 0.72;
    const some = parts.filter((p) => resumeLower.includes(p)).length;
    if (some >= Math.ceil(parts.length * 0.6)) return 0.55;
  }

  const sim = semanticTfIdfSimilarity(t, resumeLower);
  return Math.max(0, Math.min(1, sim)) * 0.42;
}

async function keywordMatchDetails(
  terms: string[],
  resumeLower: string
): Promise<{
  score: number;
  matched: string[];
  missing: string[];
}> {
  const matched: string[] = [];
  const missing: string[] = [];
  let sum = 0;

  for (const term of terms) {
    const w = termMatchWeight(term, resumeLower);
    sum += w;
    if (w >= 0.5) matched.push(term);
    else missing.push(term);
  }

  const n = Math.max(1, terms.length);
  const score = Math.round(Math.min(100, (sum / n) * 100));
  return { score, matched, missing };
}

function skillsCoveragePercent(
  jdTechTerms: string[],
  resume: OptimizedResume
): number {
  const skillsLower = skillsPlain(resume);
  if (jdTechTerms.length === 0) return 70;
  let hit = 0;
  for (const term of jdTechTerms) {
    const t = term.toLowerCase();
    const inSkills = resume.skills.some(
      (s) =>
        s.toLowerCase().includes(t) ||
        t.includes(s.toLowerCase()) ||
        skillsLower.includes(t)
    );
    if (inSkills) hit++;
  }
  return Math.round((hit / jdTechTerms.length) * 100);
}

function sectionCompletenessPercent(resume: OptimizedResume): number {
  let pts = 0;
  const max = 4;

  if (resume.summary.trim().length >= 60) pts++;
  if (resume.skills.length >= 4) pts++;
  else if (resume.skills.length >= 2) pts += 0.5;

  const expBullets = resume.experience.reduce(
    (n, e) => n + e.points.filter((p) => p.trim().length > 0).length,
    0
  );
  if (expBullets >= 4) pts++;
  else if (expBullets >= 2) pts += 0.5;

  if (resume.projects.length >= 1) pts++;
  else if (resume.experience.length >= 2) pts += 0.25;

  return Math.min(100, Math.round((pts / max) * 100));
}

function formattingScorePercent(resume: OptimizedResume): number {
  const text = resumeToPlainText(resume);
  const len = text.length;
  let score = 100;

  if (len > 9000) score -= 25;
  else if (len > 7000) score -= 15;
  else if (len > 5500) score -= 8;

  const bulletAvg =
    resume.experience.reduce((n, e) => n + e.points.length, 0) /
    Math.max(1, resume.experience.length);
  if (bulletAvg > 8) score -= 10;
  if (bulletAvg < 2 && resume.experience.length > 0) score -= 15;

  if (/[^\w\s.,|%+\-()/&]/.test(text)) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function placementBonusPoints(
  matchedTerms: string[],
  resume: OptimizedResume
): number {
  const sk = skillsPlain(resume);
  const ex = experiencePlain(resume);
  let both = 0;
  for (const term of matchedTerms) {
    const t = term.toLowerCase();
    if (t.length < 3) continue;
    if (sk.includes(t) && ex.includes(t)) both++;
  }
  return Math.min(5, Math.round(both * 1.2));
}

function buildSuggestions(
  missing: string[],
  breakdown: ATSBreakdown,
  placementBonus: number,
  matchedCount: number
): string[] {
  const s: string[] = [];
  const topMissing = missing.slice(0, 15);

  for (const kw of topMissing.slice(0, 6)) {
    const low = kw.toLowerCase();
    if (/docker|kubernetes|k8s|container/i.test(kw)) {
      s.push(`Add ${kw} to skills and one experience bullet if you have that experience.`);
    } else if (/ci|cd|pipeline|github actions|jenkins/i.test(low)) {
      s.push(
        "Mention CI/CD pipelines explicitly in experience or projects when accurate."
      );
    } else {
      s.push(
        `Weave “${kw}” into skills or a bullet using the same wording as the posting where truthful.`
      );
    }
  }

  if (breakdown.keywordMatch < 65) {
    s.push(
      "Mirror exact phrases from the job description in your summary and bullets (without stuffing)."
    );
  }
  if (breakdown.skills < 60) {
    s.push(
      "Expand the skills list to cover the posting’s core tools and stack — group Frontend / Backend / DevOps / Cloud when it helps."
    );
  }
  if (breakdown.sections < 70) {
    s.push(
      "Ensure summary, skills, experience bullets, and at least one project are filled with concrete outcomes."
    );
  }
  if (breakdown.formatting < 70) {
    s.push(
      "Tighten length for one page: shorten summary and keep the strongest bullets only."
    );
  }
  if (placementBonus < 3 && matchedCount >= 3) {
    s.push(
      "Place key terms in both the skills section and experience for stronger ATS signals."
    );
  }

  const dedup = [...new Set(s)];
  if (dedup.length === 0) {
    return ["Resume aligns well with this posting — minor polish only."];
  }
  return dedup.slice(0, 12);
}

const WEIGHT_KEYWORD = 0.4;
const WEIGHT_SEMANTIC = 0.25;
const WEIGHT_SKILLS = 0.2;
const WEIGHT_SECTION = 0.1;
const WEIGHT_FORMAT = 0.05;

function shouldLogAtsDebug(): boolean {
  return (
    process.env.ATS_DEBUG === "1" ||
    process.env.ATS_DEBUG === "true" ||
    process.env.NODE_ENV === "development"
  );
}

/**
 * Weighted ATS: 40% keyword alignment, 25% semantic, 20% skills coverage,
 * 10% section completeness, 5% formatting. Plus small placement bonus.
 */
export async function calculateAdvancedATSScore(
  resumeData: OptimizedResume,
  jobDescription: string
): Promise<AdvancedATSResult> {
  const jd = jobDescription.trim();
  const extracted = extractKeywords(jd);
  const flatTerms = keywordsForAtsMatching(extracted, jd);
  const jdTechForSkills = [
    ...extracted.tools,
    ...extracted.coreSkills,
  ].slice(0, 24);

  const resumeText = resumeToPlainText(resumeData);

  const { score: kwScore, matched, missing } = await keywordMatchDetails(
    flatTerms,
    resumeText
  );

  const [semScore, skillsCov, secScore, fmtScore] = await Promise.all([
    semanticScorePercent(jd, resumeText),
    Promise.resolve(skillsCoveragePercent(jdTechForSkills, resumeData)),
    Promise.resolve(sectionCompletenessPercent(resumeData)),
    Promise.resolve(formattingScorePercent(resumeData)),
  ]);

  const placement = placementBonusPoints(matched, resumeData);

  const breakdown: ATSBreakdown = {
    keywordMatch: kwScore,
    semantic: semScore,
    skills: skillsCov,
    sections: secScore,
    formatting: fmtScore,
  };

  let score = Math.round(
    WEIGHT_KEYWORD * kwScore +
      WEIGHT_SEMANTIC * semScore +
      WEIGHT_SKILLS * skillsCov +
      WEIGHT_SECTION * secScore +
      WEIGHT_FORMAT * fmtScore
  );
  score = Math.min(100, score + placement);

  const suggestions = buildSuggestions(
    missing,
    breakdown,
    placement,
    matched.length
  );

  if (shouldLogAtsDebug()) {
    console.log("[ATS]", {
      extractedKeywords: flatTerms,
      extractedStructure: extracted,
      matched,
      missing: missing.slice(0, 20),
      scoreBreakdown: breakdown,
      placementBonus: placement,
      composite: score,
    });
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown,
    keywordScore: kwScore,
    semanticScore: semScore,
    skillsScore: skillsCov,
    sectionScore: secScore,
    formattingScore: fmtScore,
    matchedKeywords: matched,
    missingKeywords: missing,
    suggestions,
    placementBonus: placement,
  };
}

export async function computeAtsMatchScore(
  jobDescription: string,
  resume: OptimizedResume
): Promise<number> {
  return (await calculateAdvancedATSScore(resume, jobDescription)).score;
}
