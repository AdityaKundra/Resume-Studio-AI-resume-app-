import { buildCandidateLexiconContext } from "./candidate-lexicon";
import { extractKeywords, keywordsForAtsMatching } from "./keyword-extractor";
import { analyzeJobDescription } from "./jd-analyzer";
import { normalizeOptimizedResume, parseStructuredJson } from "./resume-json";
import {
  applyDeterministicResumeFixes,
  compressResumeIfNeeded,
  validateOptimizedResume,
} from "./resume-validation";
import type { AiProviderId, OptimizedResume } from "./types";

const JSON_SHAPE = `Exact JSON shape (no markdown, no extra keys):
{
  "name": string,
  "title": string,
  "summary": string,
  "skills": string[],
  "experience": [{ "company": string, "role": string, "duration": string, "points": string[] }],
  "projects": [{ "name": string, "description": string }]
}`;

const SYSTEM_RESUME = `You are an expert resume writer and ATS optimization specialist.
Output ONLY valid JSON. ${JSON_SHAPE}
All top-level keys must be present. Use [] for empty arrays.

Think step-by-step internally (planning, mapping JD → bullets). Do NOT output reasoning, explanations, or markdown — JSON only.

Anti-hallucination (CRITICAL): Do not introduce companies, tools, frameworks, or technologies that are not present in the candidate JSON or explicitly named in the job description. If unsure, omit. Prefer paraphrasing verified stack from the candidate.

Seniority: You will be given a detected seniority label from the posting — align tone:
- Junior / Entry: execution, learning speed, concrete implementation work.
- Mid-level: ownership of features, measurable impact, collaboration.
- Senior / Lead / Architect / Principal / Staff: systems design, scalability, reliability, mentoring, stakeholder leadership, cross-team alignment.

Keyword Optimization Rules (CRITICAL):
- You will receive extracted JD keywords (core skills, tools, soft skills, phrases) and a flat ATS keyword list.
- Aim for at least ~70% of the flat ATS keywords to appear somewhere in the resume using EXACT wording from the job description when those words appear in the JD (match phrasing, not synonyms), subject to anti-hallucination rules.
- Place keywords naturally in: (1) skills — mandatory coverage for major tools/tech from the JD that the candidate actually has, (2) experience bullets — important, (3) summary — optional.
- Group skills mentally as Frontend / Backend / DevOps / Cloud when it improves clarity (still output a flat string[] for "skills").
- Do NOT keyword-stuff; maintain readable prose.
- Each important term: at most 2 mentions total across summary + skills + all bullets unless it is a proper noun that must repeat.

Bullet quality (every experience bullet):
- Start with a strong action verb (Built, Led, Implemented, Designed, Optimized, Delivered, Scaled, …).
- Include at least one relevant technical keyword from the JD/candidate stack when possible without forcing.
- Clear action + outcome; avoid vague phrases like "worked on", "involved in", "responsible for", "helped with".
- Max 20 words per bullet.

General:
- Quantify only when supported by candidate data; do not invent metrics.
- Keep one-page density: concise summary, 8–14 skills when justified by JD fit (prioritize posting stack).
- If content would be too long: prioritize tightening experience bullets over projects; trim skills to the most relevant.
- Plain text only — no HTML or icons.
- Preserve candidate "name" exactly. Preserve employment facts (companies, dates) unless clearly wrong.
- Map experience[].responsibilities to points[]; flatten nested skills into skills[]; join project description arrays into one string.`;

const SYSTEM_RESUME_FIX = `You repair resume JSON to satisfy every validation issue. Output ONLY valid JSON matching this schema — no markdown, no commentary, no extra keys.
${JSON_SHAPE}

Rules: Use only employers, tools, and technologies from the original candidate data or explicitly in the job description; if unsure, remove. Preserve factual employment rows unless fixing an error.
Think step-by-step internally; output JSON only.`;

const SYSTEM_IMPROVE = `You are an expert resume editor for ATS and human readers.
Output ONLY valid JSON. ${JSON_SHAPE}
All top-level keys must be present. Use [] for empty arrays.

Think step-by-step internally; do NOT print reasoning — JSON only.

Anti-hallucination: Do not add companies, tools, or technologies absent from the candidate source data or JD text.

Seniority: Match tone to the provided seniority label (junior = execution; mid = ownership + impact; senior+ = systems, scale, leadership, cross-team).

Missing-keyword pass (CRITICAL):
- You receive missingKeywords from ATS analysis. Naturally insert each into skills and/or experience bullets first (summary only if it fits cleanly).
- Use EXACT JD phrasing for those terms when they appear verbatim in the job description.
- Each supplied keyword: at most two mentions total across the whole resume.
- Prefer weaving into bullets with strong action verbs; avoid lists of bare keywords.

Skills: ensure major JD tools/technologies that the candidate legitimately has appear in skills[]; group mentally as Frontend / Backend / DevOps / Cloud if helpful (output remains flat string[]).

Bullet quality: strong leading verb; include a technical keyword when possible; avoid "worked on" / "involved in"; max 20 words per bullet.

Skills array: unique entries (case-insensitive). Revise in place: same companies, roles, dates unless obviously wrong.
Plain text only — no HTML. Preserve "name" unless fixing a clear typo.

If length must shrink: cut project prose before removing strong experience bullets; cap skills at the most JD-relevant entries.`;

const SYSTEM_IMPROVE_FIX = `You fix resume JSON to satisfy validation issues. Output ONLY valid JSON. ${JSON_SHAPE}
No markdown or explanation. Only use tools/tech from the original candidate data or job description.`;

function ollamaBaseUrl(): string {
  const u = process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
  return u.replace(/\/$/, "");
}

const DEFAULT_OLLAMA_MODEL = "llama3.2";

function ollamaModel(): string {
  return process.env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;
}

function timeoutMs(): number {
  const n = Number(process.env.OLLAMA_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 240_000;
}

export function resolveAiProvider(): AiProviderId {
  const p = (process.env.AI_PROVIDER || "ollama").trim().toLowerCase();
  if (p === "openai" || p === "gemini" || p === "ollama") return p;
  return "ollama";
}

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

async function ollamaChatJson(
  system: string,
  user: string,
  numPredict = 4096
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${ollamaBaseUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel(),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: false,
        format: "json",
        options: {
          temperature: 0.4,
          num_predict: numPredict,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs()),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      throw new Error(
        "Ollama request timed out. Try a smaller/faster model, or increase OLLAMA_TIMEOUT_MS."
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (
      /fetch failed|ECONNREFUSED|ENOTFOUND|could not connect to ollama/i.test(
        msg
      )
    ) {
      throw new Error(
        [
          `Cannot reach Ollama at ${ollamaBaseUrl()} (nothing listening).`,
          "",
          "Start the server, then try again:",
          "• macOS: open the **Ollama** app from Applications, or run in a terminal: `ollama serve`",
          "• Linux: `ollama serve` (or enable the ollama systemd service)",
          "• Remote/custom URL: set `OLLAMA_BASE_URL` in `.env.local`",
          "",
          "Check it is up: `curl http://127.0.0.1:11434/api/tags`",
        ].join("\n")
      );
    }
    throw new Error(`Ollama request failed: ${msg}`);
  }

  const text = await res.text();
  let body: OllamaChatResponse = {};
  try {
    body = JSON.parse(text) as OllamaChatResponse;
  } catch {
    if (!res.ok) {
      throw new Error(text.slice(0, 300) || `Ollama HTTP ${res.status}`);
    }
    throw new Error("Invalid JSON from Ollama");
  }

  if (!res.ok) {
    const detail = body.error || text || res.statusText;
    if (res.status === 404 || /not found/i.test(detail)) {
      const m = ollamaModel();
      throw new Error(
        `Ollama model not found. Run \`ollama pull ${m}\` or set OLLAMA_MODEL to an installed model (\`ollama list\`).`
      );
    }
    throw new Error(detail || `Ollama returned HTTP ${res.status}`);
  }

  if (body.error) {
    throw new Error(body.error);
  }

  const raw = body.message?.content;
  if (raw == null || String(raw).trim() === "") {
    throw new Error("Empty response from Ollama");
  }
  return typeof raw === "string" ? raw : JSON.stringify(raw);
}

function openaiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

async function openaiChatJson(
  system: string,
  user: string,
  maxTokens?: number
): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai");
  }
  const payload: Record<string, unknown> = {
    model: openaiModel(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  };
  if (maxTokens != null) payload.max_tokens = maxTokens;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs()),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      text.slice(0, 400) || `OpenAI HTTP ${res.status}`
    );
  }
  const parsed = JSON.parse(text) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = parsed.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error("Empty response from OpenAI");
  return content;
}

function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

async function geminiChatJson(
  system: string,
  user: string,
  maxOutputTokens?: number
): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini");
  }
  const model = geminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const gen: Record<string, unknown> = {
    temperature: 0.4,
    responseMimeType: "application/json",
  };
  if (maxOutputTokens != null) gen.maxOutputTokens = maxOutputTokens;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: gen,
    }),
    signal: AbortSignal.timeout(timeoutMs()),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      text.slice(0, 400) || `Gemini HTTP ${res.status}`
    );
  }
  const body = JSON.parse(text) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (body.error?.message) throw new Error(body.error.message);
  const part = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!part?.trim()) throw new Error("Empty response from Gemini");
  return part;
}

export type JsonPromptOptions = {
  /** Larger model output for big JSON (interview prep, etc.). */
  largePayload?: boolean;
  /** Smaller token budget for brief JSON (e.g. answer scoring). */
  compact?: boolean;
};

async function completeJson(
  system: string,
  user: string,
  opts?: JsonPromptOptions
): Promise<string> {
  const large = Boolean(opts?.largePayload);
  const compact = Boolean(opts?.compact);
  const provider = resolveAiProvider();
  switch (provider) {
    case "openai":
      return openaiChatJson(
        system,
        user,
        large ? 8192 : compact ? 900 : undefined
      );
    case "gemini":
      return geminiChatJson(
        system,
        user,
        large ? 8192 : compact ? 900 : undefined
      );
    default:
      return ollamaChatJson(
        system,
        user,
        large ? 8192 : compact ? 1024 : ollamaResumeNumPredict()
      );
  }
}

/** Shared JSON-mode completion for feature modules (e.g. interview prep). */
export async function completeJsonPrompt(
  system: string,
  user: string,
  opts?: JsonPromptOptions
): Promise<string> {
  return completeJson(system, user, opts);
}

function parseResumeJson(raw: string): OptimizedResume {
  let parsed: unknown;
  try {
    parsed = parseStructuredJson(raw);
  } catch {
    throw new Error(
      "Model returned invalid JSON. Try a stronger model or re-pull / check API keys."
    );
  }
  return normalizeOptimizedResume(parsed);
}

function maxResumeValidationAttempts(): number {
  const n = Number(process.env.RESUME_MAX_ATTEMPTS);
  if (Number.isFinite(n) && n >= 1 && n <= 5) return Math.floor(n);
  return 3;
}

/** Max new tokens for resume JSON from Ollama; lower = faster (risk of truncated JSON + retries). */
function ollamaResumeNumPredict(): number {
  const n = Number(process.env.OLLAMA_NUM_PREDICT);
  if (Number.isFinite(n) && n >= 1024 && n <= 8192) return Math.floor(n);
  return 4096;
}

function seniorityBlock(analysis: ReturnType<typeof analyzeJobDescription>): string {
  return `Detected seniority from posting: "${analysis.seniorityLevel}".
Align resume tone with this level (see system rules for Junior vs Mid vs Senior+).`;
}

export type GenerateResumeInput = {
  userData: unknown;
  jobDescription: string;
};

/**
 * Generate an optimized resume JSON from user profile + job description.
 * Validates output; on failure, asks the model to repair (no exposed chain-of-thought).
 */
export async function generateResume(
  input: GenerateResumeInput
): Promise<OptimizedResume> {
  const jobDescription = input.jobDescription.trim();
  const analysis = analyzeJobDescription(jobDescription);
  const extracted = extractKeywords(jobDescription);
  const atsFlat = keywordsForAtsMatching(extracted, jobDescription);
  const lexCtx = buildCandidateLexiconContext(input.userData, jobDescription);
  const userJson =
    typeof input.userData === "string"
      ? input.userData
      : JSON.stringify(input.userData, null, 2);
  const keywordBlock = `Extracted JD keywords (use exact JD wording; only facts supported by candidate data):\n${JSON.stringify(extracted, null, 2)}\n\nFlat ATS keyword list (prioritize coverage in resume — target ~70%+):\n${JSON.stringify(atsFlat, null, 2)}`;

  const userBase = `${seniorityBlock(analysis)}\n\n${keywordBlock}\n\nJob description:\n---\n${jobDescription}\n---\n\nCandidate data (JSON):\n${userJson}`;

  let lastResume: OptimizedResume | null = null;
  let lastIssues: string[] = [];

  const maxAttempts = maxResumeValidationAttempts();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const system = attempt === 0 ? SYSTEM_RESUME : SYSTEM_RESUME_FIX;
    const user =
      attempt === 0
        ? userBase
        : `${userBase}\n\n---\nVALIDATION FAILED. Fix every numbered issue. Output the full corrected JSON only.\n${lastIssues.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\nPrevious JSON to correct:\n${JSON.stringify(lastResume, null, 2)}`;

    const raw = await completeJson(system, user);
    let resume = parseResumeJson(raw);
    resume = applyDeterministicResumeFixes(resume);
    resume = compressResumeIfNeeded(resume);

    const v = validateOptimizedResume(resume, {
      lexicon: lexCtx,
      jobDescription,
    });
    if (v.ok) return resume;
    lastIssues = v.issues;
    lastResume = resume;
  }

  return lastResume!;
}

export type ImproveResumeInput = {
  resumeData: OptimizedResume;
  jobDescription: string;
  missingKeywords: string[];
  /** Full static profile (or source JSON) for anti-hallucination checks; defaults to resumeData. */
  userDataForLexicon?: unknown;
};

/**
 * Iteratively improve an existing resume toward the job description.
 */
export async function improveResume(
  input: ImproveResumeInput
): Promise<OptimizedResume> {
  const jobDescription = input.jobDescription.trim();
  const analysis = analyzeJobDescription(jobDescription);
  const lexCtx = buildCandidateLexiconContext(
    input.userDataForLexicon ?? input.resumeData,
    jobDescription
  );
  const missing = input.missingKeywords.slice(0, 40);
  const extracted = extractKeywords(jobDescription);
  const atsFlat = keywordsForAtsMatching(extracted, jobDescription);
  const resumeJson = JSON.stringify(input.resumeData, null, 2);
  const keywordBlock = `Extracted JD keywords (reference only; only add what matches candidate data):\n${JSON.stringify(extracted, null, 2)}\n\nFlat ATS keyword list:\n${JSON.stringify(atsFlat, null, 2)}`;

  const userBase = `${seniorityBlock(analysis)}\n\n${keywordBlock}\n\nJob description:\n---\n${jobDescription}\n---\n\nmissingKeywords from ATS (incorporate each naturally in skills and/or bullets; max 2 mentions each):\n${JSON.stringify(missing)}\n\nCurrent resume JSON to improve:\n${resumeJson}`;

  let lastResume: OptimizedResume | null = null;
  let lastIssues: string[] = [];

  const maxAttempts = maxResumeValidationAttempts();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const system = attempt === 0 ? SYSTEM_IMPROVE : SYSTEM_IMPROVE_FIX;
    const user =
      attempt === 0
        ? userBase
        : `${userBase}\n\n---\nVALIDATION FAILED. Fix every issue; output full JSON only.\n${lastIssues.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\nPrevious JSON:\n${JSON.stringify(lastResume, null, 2)}`;

    const raw = await completeJson(system, user);
    let resume = parseResumeJson(raw);
    resume = applyDeterministicResumeFixes(resume);
    resume = compressResumeIfNeeded(resume);

    const v = validateOptimizedResume(resume, {
      lexicon: lexCtx,
      jobDescription,
    });
    if (v.ok) return resume;
    lastIssues = v.issues;
    lastResume = resume;
  }

  return lastResume!;
}

/** @deprecated Use \`generateResume\` — alias for backward compatibility. */
export async function generateOptimizedResume(
  userData: unknown,
  jobDescription: string
): Promise<OptimizedResume> {
  return generateResume({ userData, jobDescription });
}

const SYSTEM_IMPROVE_BULLET = `You rewrite a single resume bullet for clarity and ATS fit.
Output ONLY valid JSON with this exact shape (no markdown, no extra keys):
{"bullet":"..."}

Rules:
- Plain text only — no HTML, no markdown, no bullet symbols at the start.
- Strong action verb; max 22 words.
- Align with the job description when it fits facts implied by the original bullet; do not invent companies, tools, metrics, or responsibilities.
- If the bullet is empty or unusable, return a concise professional line grounded only in what the original could reasonably mean.`;

export type ImproveBulletInput = {
  bullet: string;
  jobDescription: string;
};

/**
 * Improve one experience bullet using JD context (for inline editor).
 */
export async function improveResumeBullet(
  input: ImproveBulletInput
): Promise<string> {
  const bullet = input.bullet.trim();
  const jobDescription = input.jobDescription.trim();
  if (!bullet) {
    throw new Error("bullet is required");
  }
  if (!jobDescription) {
    throw new Error("jobDescription is required");
  }

  const jd =
    jobDescription.length > 12_000
      ? `${jobDescription.slice(0, 12_000)}\n\n[truncated]`
      : jobDescription;

  const user = `Job description (context):\n---\n${jd}\n---\n\nBullet to improve:\n${bullet}`;

  const raw = await completeJson(SYSTEM_IMPROVE_BULLET, user, { compact: true });
  let parsed: unknown;
  try {
    parsed = parseStructuredJson(raw);
  } catch {
    throw new Error("Model returned invalid JSON for bullet improvement");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid bullet response");
  }
  const b = (parsed as { bullet?: unknown }).bullet;
  const out = typeof b === "string" ? b.trim() : "";
  if (!out) {
    throw new Error("Empty bullet in model response");
  }
  return out.replace(/[<>]/g, "");
}
