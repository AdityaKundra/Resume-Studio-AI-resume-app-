import { completeJsonPrompt } from "./ai-provider";
import { analyzeJobDescription } from "./jd-analyzer";
import { parseStructuredJson } from "./resume-json";
import type {
  InterviewPrepPlanDay,
  InterviewPrepQuestions,
  InterviewPrepResponse,
  InterviewPrepResult,
  InterviewPrepTopics,
  InterviewQuestionItem,
  JobDescriptionAnalysis,
  OptimizedResume,
} from "./types";

function resumePlainText(resume: OptimizedResume): string {
  return [
    resume.title,
    resume.summary,
    ...resume.skills,
    ...resume.experience.flatMap((e) => [e.role, e.company, ...e.points]),
    ...resume.projects.flatMap((p) => [p.name, p.description]),
  ]
    .join(" ")
    .toLowerCase();
}

function skillMentionedInResume(resumeText: string, skill: string): boolean {
  const s = skill.toLowerCase();
  if (resumeText.includes(s)) return true;
  const parts = s.split(/[^a-z0-9+]+/).filter((p) => p.length > 2);
  return parts.length > 0 && parts.every((p) => resumeText.includes(p));
}

/** JD skills/tools that do not clearly appear in the resume text. */
export function heuristicResumeGaps(
  analysis: JobDescriptionAnalysis,
  resumeText: string
): string[] {
  const need = [...new Set([...analysis.requiredSkills, ...analysis.tools])];
  return need.filter((skill) => !skillMentionedInResume(resumeText, skill));
}

function jdDigest(
  jd: string,
  analysis: JobDescriptionAnalysis,
  heuristicGaps: string[]
): string {
  const lines = [
    `Seniority (detected): ${analysis.seniorityLevel}`,
    `Required skills (detected): ${analysis.requiredSkills.join(", ") || "—"}`,
    `Tools/platforms (detected): ${analysis.tools.join(", ") || "—"}`,
    `Key responsibilities (parsed from JD — questions MUST reference these themes):`,
    ...analysis.keyResponsibilities.map((r, i) => `  ${i + 1}. ${r}`),
    `Stack/tools weak or missing on resume vs JD: ${heuristicGaps.join(", ") || "none flagged"}`,
    `JD excerpt (first 1200 chars for tone/domain):\n${jd.slice(0, 1200)}${jd.length > 1200 ? "…" : ""}`,
  ];
  return lines.join("\n");
}

const QUESTION_ITEM_SHAPE = `{ "question": string, "expectedTopics": string[] }`;

const SYSTEM_INTERVIEW = `You are a principal engineer and hiring manager who designs interview loops.
Output ONLY valid JSON. No markdown, no extra keys. All arrays must exist (use [] if empty).

Think step-by-step internally (plan JD alignment, gap coverage, question mix). Do NOT output reasoning — JSON only.

CRITICAL: Every question and prep task must be obviously tied to THIS job description. Avoid generic trivia.

Anti-hallucination: Do NOT name companies, tools, or technologies that are absent from the candidate resume JSON and not clearly implied by the job description. If unsure, omit the proper noun.

Consistency (CRITICAL):
- Interview study topics must cover skills and themes that appear on the resume AND the JD (cross-link domains).
- "gaps" must explicitly call out JD expectations vs resume (include stack/tools weak on the resume vs posting).
- systemDesign prompts must map to responsibilities or scale signals from the JD (same product/domain language where possible).

Question counts (minimum targets — exceed if JD is rich):
- behavioral: at least 5 (STAR-style; JD themes: collaboration, deadlines, conflict, ambiguity, mentoring, on-call, quality).
- resumeDeepDive: at least 4 (reference real employers/projects/bullets from the resume + JD requirements).
- easy: at least 5 (JD stack fundamentals).
- medium: at least 6 (applied scenarios tied to responsibilities).
- hard: at least 4 (trade-offs, failure modes, security, consistency — match seniority).

Stress coverage: At least 30% of ALL questions combined (behavioral + resumeDeepDive + easy + medium + hard) must clearly mention scale (e.g. high throughput, many users), failure handling (outages, retries, degradation), OR explicit trade-offs. Spread across categories.

Each question object MUST include "expectedTopics": 2–6 short strings (topics a strong answer should hit — not chain-of-thought, just anchors like "rate limiting", "caching").

prepPlan: exactly 7 days. Each day: non-empty "focus" tied to the JD; "topics" 3–5 items.
Each day MUST include, as separate bullets:
- one revision task (re-read notes, flashcards, JD mapping),
- one practice task (mock / timed verbal / whiteboard),
- one output task (write or speak a complete answer / recording).

Use time-box labels (e.g. "25m:", "40m:") on most tasks.`;

const SHAPE = `Exact JSON shape:
{
  "role": string,
  "topics": {
    "frontend": string[],
    "backend": string[],
    "devops": string[],
    "systemDesign": string[],
    "ai": string[]
  },
  "questions": {
    "behavioral": [${QUESTION_ITEM_SHAPE}],
    "resumeDeepDive": [${QUESTION_ITEM_SHAPE}],
    "easy": [${QUESTION_ITEM_SHAPE}],
    "medium": [${QUESTION_ITEM_SHAPE}],
    "hard": [${QUESTION_ITEM_SHAPE}]
  },
  "systemDesign": string[],
  "gaps": string[],
  "prepPlan": [{ "day": number, "focus": string, "topics": string[] }]
}`;

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [
    ...new Set(
      v.map((x) => String(x).trim()).filter((s) => s.length > 0)
    ),
  ];
}

function normalizeTopics(v: unknown): InterviewPrepTopics {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return {
    frontend: normalizeStringArray(o.frontend),
    backend: normalizeStringArray(o.backend),
    devops: normalizeStringArray(o.devops),
    systemDesign: normalizeStringArray(o.systemDesign),
    ai: normalizeStringArray(o.ai),
  };
}

function normalizeQuestionItem(x: unknown): InterviewQuestionItem | null {
  if (typeof x === "string") {
    const q = x.trim();
    return q ? { question: q, expectedTopics: [] } : null;
  }
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const rawQ = o.question ?? o.q ?? o.text ?? o.prompt;
  const q = String(rawQ ?? "").trim();
  const rawTop = o.expectedTopics ?? o.answerHints ?? o.hints;
  const expectedTopics = Array.isArray(rawTop)
    ? [...new Set(rawTop.map((t) => String(t).trim()).filter(Boolean))].slice(0, 8)
    : [];
  if (!q) return null;
  return { question: q, expectedTopics };
}

function normalizeQuestionArray(v: unknown): InterviewQuestionItem[] {
  if (!Array.isArray(v)) return [];
  const out: InterviewQuestionItem[] = [];
  for (const x of v) {
    const item = normalizeQuestionItem(x);
    if (item) out.push(item);
  }
  return out;
}

function normalizeQuestions(v: unknown): InterviewPrepQuestions {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return {
    behavioral: normalizeQuestionArray(o.behavioral),
    resumeDeepDive: normalizeQuestionArray(o.resumeDeepDive),
    easy: normalizeQuestionArray(o.easy),
    medium: normalizeQuestionArray(o.medium),
    hard: normalizeQuestionArray(o.hard),
  };
}

const STRESS_RE =
  /\b(scale|scaling|millions?|billions?|throughput|latency|rps|qps|traffic|spike|high[\s-]load|failure|outage|down\b|retry|timeout|circuit|trade-?off|tradeoffs?|consistency|availability|partition|backpressure|dead[\s-]?letter|reliability|resilien|degradation|rollback|disaster|mttr|sla|slo)\b/i;

function allQuestionsFlat(q: InterviewPrepQuestions): InterviewQuestionItem[] {
  return [
    ...q.behavioral,
    ...q.resumeDeepDive,
    ...q.easy,
    ...q.medium,
    ...q.hard,
  ];
}

function stressTaggedCount(items: InterviewQuestionItem[]): number {
  return items.filter((i) => STRESS_RE.test(i.question)).length;
}

const STRESS_TEMPLATES: ((
  hook: string
) => InterviewQuestionItem)[] = [
  (hook) => ({
    question: `Walk through how you would handle a sudden 10× traffic spike for work related to: ${hook}. What fails first, and what mitigations (queues, autoscaling, caching) would you consider — including trade-offs?`,
    expectedTopics: ["load spikes", "bottlenecks", "caching", "trade-offs", "autoscaling"],
  }),
  (hook) => ({
    question: `Describe a production incident-style scenario for "${hook.slice(0, 80)}": how do you detect, contain, communicate, and prevent recurrence?`,
    expectedTopics: ["failure handling", "observability", "postmortem", "SLAs"],
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature matches other templates
  (hook) => ({
    question: `Compare two design options for the same JD responsibility (latency vs cost vs operational complexity). What trade-offs would you present to stakeholders?`,
    expectedTopics: ["trade-offs", "stakeholders", "cost", "latency"],
  }),
];

/** Ensure ≥30% of all questions mention scale, failure, or trade-offs. */
function augmentStressCoverage(
  questions: InterviewPrepQuestions,
  analysis: JobDescriptionAnalysis,
  jd: string
): InterviewPrepQuestions {
  const hook =
    analysis.keyResponsibilities[0]?.slice(0, 100) ||
    jd.split(/\r?\n/).find((l) => l.trim().length > 20)?.slice(0, 100) ||
    "the core product";

  const out: InterviewPrepQuestions = {
    behavioral: [...questions.behavioral],
    resumeDeepDive: [...questions.resumeDeepDive],
    easy: [...questions.easy],
    medium: [...questions.medium],
    hard: [...questions.hard],
  };

  for (let iter = 0; iter < 8; iter++) {
    const flat = allQuestionsFlat(out);
    const n = flat.length;
    if (n === 0) return out;
    const tagged = stressTaggedCount(flat);
    if (tagged / n >= 0.3) return out;

    const shortfall = 0.3 * n - tagged;
    const k = Math.max(1, Math.ceil(shortfall / 0.7));
    for (let j = 0; j < k; j++) {
      const item = STRESS_TEMPLATES[j % STRESS_TEMPLATES.length]!(hook);
      if (j % 2 === 0) out.medium.push(item);
      else out.hard.push(item);
    }
  }

  return out;
}

const REV_RE = /\b(revision|re-?read|review notes|flashcard|revisit|skim)\b/i;
const PRA_RE = /\b(practice|mock|timed|whiteboard|drill|verbal(ize)?|answer aloud)\b/i;
const OUT_RE = /\b(write|speak|record|outline|output|deliverable|journal)\b/i;

function ensurePrepPlanDailyMix(plan: InterviewPrepPlanDay[]): InterviewPrepPlanDay[] {
  return plan.map((d) => {
    const topics = [...d.topics];
    if (!topics.some((t) => REV_RE.test(t))) {
      topics.push(
        `20m: Revision — re-read one parsed JD responsibility and the matching resume bullet`
      );
    }
    if (!topics.some((t) => PRA_RE.test(t))) {
      topics.push(
        `35m: Practice — pick 2 questions from the Questions tab; answer out loud with a timer`
      );
    }
    if (!topics.some((t) => OUT_RE.test(t))) {
      topics.push(
        `25m: Output — write or record a complete answer to one medium/hard question; self-grade against expectedTopics`
      );
    }
    return { ...d, topics: topics.slice(0, 6) };
  });
}

function jdKeywordBlob(analysis: JobDescriptionAnalysis): string {
  return [
    ...analysis.requiredSkills,
    ...analysis.tools,
    ...analysis.keyResponsibilities,
  ]
    .join(" ")
    .toLowerCase();
}

function overlapsJd(text: string, analysis: JobDescriptionAnalysis): boolean {
  const t = text.toLowerCase();
  const tokens = jdKeywordBlob(analysis)
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 3);
  return tokens.some((w) => t.includes(w));
}

function anchorSystemDesignPrompts(
  prompts: string[],
  analysis: JobDescriptionAnalysis
): string[] {
  if (prompts.length === 0 || analysis.keyResponsibilities.length === 0) {
    return prompts;
  }
  const anchor = analysis.keyResponsibilities[0]!.slice(0, 120);
  return prompts.map((p) => {
    if (overlapsJd(p, analysis)) return p;
    return `Given responsibilities like "${anchor}", ${p.charAt(0).toLowerCase()}${p.slice(1)}`;
  });
}

function alignTopicsToResumeSkills(
  topics: InterviewPrepTopics,
  resume: OptimizedResume,
  analysis: JobDescriptionAnalysis
): InterviewPrepTopics {
  const respHint = analysis.keyResponsibilities[0]?.slice(0, 70) || "this role";
  const addUnique = (arr: string[], line: string) => {
    const L = line.toLowerCase();
    if (arr.some((x) => x.toLowerCase() === L)) return;
    arr.push(line);
  };

  const out: InterviewPrepTopics = {
    frontend: [...topics.frontend],
    backend: [...topics.backend],
    devops: [...topics.devops],
    systemDesign: [...topics.systemDesign],
    ai: [...topics.ai],
  };

  for (const sk of resume.skills.slice(0, 18)) {
    const sl = sk.toLowerCase();
    if (
      /react|vue|angular|next\.?js|svelte|css|tailwind|html|frontend|ui\b|webpack|vite/.test(
        sl
      )
    ) {
      addUnique(
        out.frontend,
        `Connect "${sk}" on your resume to ${respHint} — practice one deep-dive answer`
      );
    } else if (
      /node|python|java|go\b|rust|php|ruby|api|graphql|sql|mongo|postgres|mysql|redis|kafka|backend|express/.test(
        sl
      )
    ) {
      addUnique(
        out.backend,
        `Drill "${sk}" with failure modes and data consistency angles from the JD`
      );
    } else if (
      /aws|gcp|azure|docker|kubernetes|k8s|terraform|ci|cd|devops|jenkins|helm/.test(sl)
    ) {
      addUnique(
        out.devops,
        `Map "${sk}" to deploy/observability paths implied by the posting`
      );
    } else if (/llm|openai|ml\b|pytorch|tensorflow|model|embedding/.test(sl)) {
      addUnique(out.ai, `Tie "${sk}" to product constraints and evaluation from the JD`);
    }
  }

  return out;
}

function gapSentencesForKeywords(keys: string[]): string[] {
  return keys.map(
    (k) =>
      `Resume light on "${k}" vs posting — add proof or prepare a honest learning plan for interviews`
  );
}

function normalizePrepPlanRaw(v: unknown): InterviewPrepPlanDay[] {
  if (!Array.isArray(v)) return [];
  const out: InterviewPrepPlanDay[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const d = rec.day;
    const dayNum =
      typeof d === "number" && Number.isFinite(d)
        ? Math.min(7, Math.max(1, Math.round(d)))
        : out.length + 1;
    const focus = String(rec.focus ?? "").trim();
    out.push({
      day: dayNum,
      focus,
      topics: normalizeStringArray(rec.topics),
    });
  }
  return out;
}

function defaultFocusForDay(
  day: number,
  role: string,
  analysis: JobDescriptionAnalysis,
  heuristicGaps: string[]
): string {
  const gapHint =
    heuristicGaps.length > 0
      ? heuristicGaps.slice(0, 3).join(", ")
      : "core JD requirements";
  const resp = analysis.keyResponsibilities[0]?.slice(0, 80) ?? "";

  const map: Record<number, string> = {
    1: `Decode the posting: ${role}${resp ? ` — anchor on "${resp}${resp.length >= 80 ? "…" : ""}"` : ""}`,
    2: `Close resume ↔ JD gaps: ${gapHint}`,
    3: `Deep dive JD stack & tools (${analysis.requiredSkills.slice(0, 4).join(", ") || "stack from posting"})`,
    4: `Practice stories for parsed responsibilities + metrics`,
    5: `System design & scalability angles from this role`,
    6: `Behavioral + leadership signals for ${analysis.seniorityLevel} level`,
    7: `Mock interview + weak-area review (${gapHint})`,
  };
  return map[day] ?? `Day ${day}: ${role} prep`;
}

function defaultTopicsForDay(
  day: number,
  topics: InterviewPrepTopics,
  analysis: JobDescriptionAnalysis,
  heuristicGaps: string[],
  role: string
): string[] {
  const g = heuristicGaps[0];
  const skill = analysis.requiredSkills[0];
  const tool = analysis.tools[0];
  const resp = analysis.keyResponsibilities;

  const pools: Record<number, string[]> = {
    1: [
      `30m: List every must-have from the JD; highlight 5 you will emphasize in interviews`,
      `20m: Match each top responsibility to one bullet you can speak to for 2 minutes`,
      `25m: Write 3 "Why this company/role" angles using the posting language`,
    ],
    2: [
      g
        ? `45m: Study ${g} — official docs + one tutorial; note 3 talking points`
        : `40m: Rank JD skills by weight; drill the top 2 you are weakest on`,
      `30m: For each gap, draft one honest story: how you'd learn or how you've used something adjacent`,
      `20m: Compare JD tools (${tool || "from posting"}) to your last project stack`,
    ],
    3: [
      skill
        ? `50m: ${skill} fundamentals + one "gotcha" interview question you'd ask a candidate`
        : `45m: Core technical concepts implied by the JD`,
      `30m: Trace a request/data path for a system like the one in the posting`,
      topics.backend.length
        ? `25m: Whiteboard: ${topics.backend[0]}`
        : `25m: Explain trade-offs for the main datastore/API style in the JD`,
    ],
    4: [
      resp.length > 0
        ? `40m: STAR story for: "${resp[0]!.slice(0, 100)}${resp[0]!.length > 100 ? "…" : ""}"`
        : `40m: STAR story for the hardest project on your resume`,
      `30m: Second story tied to collaboration or cross-team work from the JD`,
      `20m: Quantify outcomes for 3 resume bullets (even ranges if exact numbers are private)`,
    ],
    5: [
      `45m: Pick one system-design prompt below; sketch API, data, and scaling`,
      `30m: List failure modes (latency, partial outage, duplicate writes) for that design`,
      `15m: How would observability look for this service?`,
    ],
    6: [
      `35m: Behavioral: conflict, missed deadline, technical disagreement — one story each`,
      `25m: ${analysis.seniorityLevel.includes("Senior") || analysis.seniorityLevel.includes("Lead") ? "Mentoring, roadmap, or stakeholder pushback story" : "Learning fast and asking good questions"}`,
      `20m: "Tell me about yourself" in 90s ending with why this ${role}`,
    ],
    7: [
      `60m: Timed mock: 2 behavioral + 3 technical drawn from this JD`,
      `20m: Re-read gaps (${heuristicGaps.slice(0, 4).join(", ") || "JD keywords"}) and one-liner answers`,
      `15m: Sleep, logistics, questions YOU will ask the panel`,
    ],
  };

  return pools[day] ?? [
    `40m: Review ${role} and JD keywords`,
    `30m: One mock question block`,
    `20m: Note 5 questions to ask the interviewer`,
  ];
}

function ensureSevenDayPlan(
  plan: InterviewPrepPlanDay[],
  topics: InterviewPrepTopics,
  role: string,
  analysis: JobDescriptionAnalysis,
  heuristicGaps: string[]
): InterviewPrepPlanDay[] {
  const byDay = new Map<number, InterviewPrepPlanDay>();
  for (const p of plan) {
    const day = Math.min(7, Math.max(1, Math.round(p.day)));
    const existing = byDay.get(day);
    if (!existing) {
      byDay.set(day, { ...p, day, topics: [...p.topics] });
    } else {
      const mergedFocus =
        existing.focus && p.focus && existing.focus !== p.focus
          ? `${existing.focus} · ${p.focus}`
          : existing.focus || p.focus;
      byDay.set(day, {
        day,
        focus: mergedFocus,
        topics: [...existing.topics, ...p.topics],
      });
    }
  }

  const result: InterviewPrepPlanDay[] = [];
  for (let day = 1; day <= 7; day++) {
    const cur = byDay.get(day);
    const focus =
      cur?.focus && cur.focus.length > 0
        ? cur.focus
        : defaultFocusForDay(day, role, analysis, heuristicGaps);
    let taskList = (cur?.topics ?? []).filter(Boolean);
    if (taskList.length < 3) {
      const defaults = defaultTopicsForDay(
        day,
        topics,
        analysis,
        heuristicGaps,
        role
      );
      taskList = [...new Set([...taskList, ...defaults])].slice(0, 5);
    } else {
      taskList = taskList.slice(0, 5);
    }
    result.push({ day, focus, topics: taskList });
  }
  return result;
}

function normalizeInterviewPrepPayload(
  data: unknown,
  analysis: JobDescriptionAnalysis,
  heuristicGaps: string[]
): InterviewPrepResult {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid interview prep payload");
  }
  const o = data as Record<string, unknown>;
  const role = String(o.role ?? "Target role").slice(0, 220);
  const topics = normalizeTopics(o.topics);
  const questions = normalizeQuestions(o.questions);
  const systemDesign = normalizeStringArray(o.systemDesign);
  const gaps = normalizeStringArray(o.gaps);
  const rawPlan = normalizePrepPlanRaw(o.prepPlan);
  const prepPlan = ensureSevenDayPlan(
    rawPlan,
    topics,
    role,
    analysis,
    heuristicGaps
  );

  return {
    role,
    topics,
    questions,
    systemDesign,
    gaps,
    prepPlan,
  };
}

function mergeUnique(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

function deriveWeakAreas(
  prep: InterviewPrepResult,
  heuristicGaps: string[],
  analysis: JobDescriptionAnalysis
): string[] {
  const areas: string[] = [];
  if (heuristicGaps.length >= 3) {
    areas.push(
      `Several JD technologies are light on your resume (${heuristicGaps.slice(0, 5).join(", ")}…) — drill these first`
    );
  } else if (heuristicGaps.length > 0) {
    areas.push(
      `Brush up on: ${heuristicGaps.slice(0, 6).join(", ")}`
    );
  }

  const jdBlob =
    `${analysis.requiredSkills.join(" ")} ${analysis.tools.join(" ")}`.toLowerCase();

  if (/react|vue|angular|next|frontend|css|ui\b/.test(jdBlob)) {
    if (prep.topics.frontend.length < 3) {
      areas.push("Frontend depth — components, state, performance, accessibility");
    }
  }
  if (/node|python|java|backend|api|graphql|sql|database|microservice/.test(jdBlob)) {
    if (prep.topics.backend.length < 3) {
      areas.push("Backend — APIs, persistence, consistency, failure modes");
    }
  }
  if (/aws|gcp|azure|docker|kubernetes|ci\b|devops|terraform/.test(jdBlob)) {
    if (prep.topics.devops.length < 2) {
      areas.push("DevOps / cloud — deploy paths, observability, security basics");
    }
  }
  if (/scale|distributed|latency|traffic|million|billion|reliability/.test(jdBlob)) {
    if (prep.systemDesign.length < 3) {
      areas.push("System design — capacity, bottlenecks, sharding, caching");
    }
  }
  if (/\b(ml|ai|llm|machine learning|genai)\b/.test(jdBlob)) {
    if (prep.topics.ai.length < 2) {
      areas.push("AI/ML — evaluation, cost, safety, product fit");
    }
  }

  if (prep.questions.behavioral.length < 3) {
    areas.push("Add more behavioral practice — use JD themes (pace, quality, teamwork)");
  }
  if (prep.questions.resumeDeepDive.length < 2) {
    areas.push("Prepare explicit walkthroughs of resume projects vs this JD");
  }

  return [...new Set(areas)].slice(0, 12);
}

/**
 * Build interview prep: JD analysis + resume comparison + AI-generated plan/questions.
 */
export async function generateInterviewPrep(
  jobDescription: string,
  resumeData: OptimizedResume
): Promise<InterviewPrepResponse> {
  const jd = jobDescription.trim();
  if (!jd) {
    throw new Error("jobDescription is required");
  }

  const analysis = analyzeJobDescription(jd);
  const resumeText = resumePlainText(resumeData);
  const heuristicGaps = heuristicResumeGaps(analysis, resumeText);
  const digest = jdDigest(jd, analysis, heuristicGaps);

  const user = [
    `=== JOB CONTEXT (use verbatim themes in questions & prep tasks) ===\n${digest}`,
    `=== CANDIDATE RESUME (JSON) ===\n${JSON.stringify(resumeData, null, 2)}`,
    `
Deliver JSON only.

1) role: exact or near-exact title from the JD opening lines.

2) topics: study topics per domain; MUST reflect skills on the resume + JD (cross-link). Empty arrays only if irrelevant.

3) questions.* : each entry is { "question", "expectedTopics" } with 2–6 hint strings per question (answer anchors, not reasoning).

4) questions.behavioral: STAR prompts tied ONLY to THIS posting.

5) questions.resumeDeepDive: reference real employers/projects/bullets from the resume + JD tools/responsibilities.

6) questions.easy / medium / hard: technical; depth matches seniority "${analysis.seniorityLevel}". ≥half of medium/hard must name a concrete JD responsibility or stack item.

7) Combined question pool: ≥30% must reference scale, failure handling, or trade-offs (spread across buckets).

8) systemDesign: 4–7 prompts anchored to JD responsibilities/domain (scale, SLAs, multi-tenant when relevant).

9) gaps: JD expectations vs this resume; include weak/missing stack vs posting.

10) prepPlan: 7 days — each day include revision + practice + output tasks (separate bullets), mostly time-boxed.
`.trim(),
  ].join("\n\n");

  const raw = await completeJsonPrompt(
    `${SYSTEM_INTERVIEW}\n\n${SHAPE}`,
    user,
    { largePayload: true }
  );

  let parsed: unknown;
  try {
    parsed = parseStructuredJson(raw);
  } catch {
    throw new Error("Model returned invalid JSON for interview prep");
  }

  const base = normalizeInterviewPrepPayload(
    parsed,
    analysis,
    heuristicGaps
  );
  base.topics = alignTopicsToResumeSkills(base.topics, resumeData, analysis);
  base.systemDesign = anchorSystemDesignPrompts(base.systemDesign, analysis);
  base.questions = augmentStressCoverage(base.questions, analysis, jd);
  base.prepPlan = ensurePrepPlanDailyMix(base.prepPlan);
  base.gaps = mergeUnique(
    base.gaps,
    gapSentencesForKeywords(heuristicGaps)
  ).slice(0, 28);

  const weakAreas = deriveWeakAreas(base, heuristicGaps, analysis);

  return { ...base, weakAreas };
}

/** Flattened questions for voice mock interview (after prep is generated). */
export type VoiceQuestionItem = {
  question: string;
  expectedTopics: string[];
};

export function voiceQuestionBankFromPrep(
  questions: InterviewPrepQuestions | null | undefined
): VoiceQuestionItem[] {
  if (!questions) return [];
  const buckets: InterviewQuestionItem[][] = [
    questions.behavioral,
    questions.resumeDeepDive,
    questions.easy,
    questions.medium,
    questions.hard,
  ];
  const out: VoiceQuestionItem[] = [];
  for (const bucket of buckets) {
    for (const item of bucket) {
      out.push({
        question: item.question,
        expectedTopics: item.expectedTopics,
      });
    }
  }
  return out;
}
