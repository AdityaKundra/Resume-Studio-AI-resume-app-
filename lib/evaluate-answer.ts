import { completeJsonPrompt } from "./ai-provider";
import { parseStructuredJson } from "./resume-json";
import type { AnswerEvaluationResult } from "./types";

const EVAL_JSON_SHAPE = `Exact JSON shape (no markdown, no extra keys):
{
  "score": number,
  "strengths": string[],
  "improvements": string[],
  "suggestedAnswer": string
}`;

const SYSTEM_EVALUATE = `You are a senior hiring manager and staff engineer evaluating a candidate's spoken interview answer.
Output ONLY valid JSON. ${EVAL_JSON_SHAPE}

Score "score" from 0–10 (decimals allowed, e.g. 7.5) using this rubric:
- Technical accuracy (correct concepts for the question)
- Depth (detail, trade-offs, specifics vs hand-waving)
- Clarity (structured, easy to follow)
- Relevance to the job description (alignment with role responsibilities and stack implied by the JD)

"strengths": 2–5 short bullet strings (what they did well).
"improvements": 2–5 actionable bullet strings (what to add or fix).
"suggestedAnswer": one concise model answer (plain text, 80–200 words) the candidate could learn from — do not quote them verbatim.

Think step-by-step internally; output JSON only. Be fair and constructive.`;

export type EvaluateAnswerInput = {
  question: string;
  answer: string;
  jobDescription: string;
};

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean).slice(0, 8);
}

function normalizeEvaluation(data: unknown): AnswerEvaluationResult {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid evaluation payload");
  }
  const o = data as Record<string, unknown>;
  let score = Number(o.score);
  if (!Number.isFinite(score)) score = 5;
  score = Math.min(10, Math.max(0, score));
  return {
    score: Math.round(score * 10) / 10,
    strengths: normalizeStringArray(o.strengths),
    improvements: normalizeStringArray(o.improvements),
    suggestedAnswer: String(o.suggestedAnswer ?? "").trim() || "—",
  };
}

const JD_EVAL_SLICE = 4500;

/**
 * Evaluate a candidate answer against the question and job description.
 */
export async function evaluateInterviewAnswer(
  input: EvaluateAnswerInput
): Promise<AnswerEvaluationResult> {
  const q = input.question.trim();
  const a = input.answer.trim();
  const jd = input.jobDescription.trim();
  if (!q) throw new Error("question is required");
  if (!a) throw new Error("answer is required");
  if (!jd) throw new Error("jobDescription is required");

  const user = [
    `Job description (for relevance):\n---\n${jd.slice(0, JD_EVAL_SLICE)}${jd.length > JD_EVAL_SLICE ? "\n…" : ""}\n---`,
    `Interview question:\n${q}`,
    `Candidate answer (may be from speech-to-text):\n${a}`,
  ].join("\n\n");

  const raw = await completeJsonPrompt(SYSTEM_EVALUATE, user, { compact: true });
  let parsed: unknown;
  try {
    parsed = parseStructuredJson(raw);
  } catch {
    throw new Error("Model returned invalid evaluation JSON");
  }
  return normalizeEvaluation(parsed);
}
