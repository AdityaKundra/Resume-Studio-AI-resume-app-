"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceQuestionItem } from "@/lib/interview-prep";
import type { AnswerEvaluationResult } from "@/lib/types";

const DEFAULT_QUESTIONS: VoiceQuestionItem[] = [
  {
    question:
      "Walk me through a technical project you owned end-to-end. What was the hardest problem and how did you solve it?",
    expectedTopics: ["ownership", "problem framing", "outcome"],
  },
  {
    question:
      "How do you approach debugging a production issue under time pressure?",
    expectedTopics: ["triage", "observability", "communication", "rollback"],
  },
  {
    question:
      "Explain how you would design a read-heavy API for scale. What trade-offs would you discuss?",
    expectedTopics: ["caching", "scaling", "consistency", "trade-offs"],
  },
  {
    question:
      "Tell me about a time you disagreed with a teammate on a technical approach. What happened?",
    expectedTopics: ["collaboration", "data-driven decision", "resolution"],
  },
  {
    question:
      "What steps do you take to keep code quality high when delivery pressure increases?",
    expectedTopics: ["testing", "review", "prioritization", "risk"],
  },
];

type Props = {
  jobDescription: string;
  /** From interview prep when available; otherwise built-in questions are used. */
  questionBank: VoiceQuestionItem[];
  disabled?: boolean;
};

type RecCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognitionCtor(): RecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: RecCtor;
    webkitSpeechRecognition?: RecCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function processRecognitionResult(ev: Event): {
  finals: string;
  interim: string;
} {
  const e = ev as unknown as {
    resultIndex: number;
    results: ArrayLike<{
      isFinal: boolean;
      0: { transcript: string };
    }>;
  };
  let finals = "";
  let interim = "";
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const r = e.results[i];
    if (!r?.[0]) continue;
    const piece = r[0].transcript;
    if (r.isFinal) finals += piece;
    else interim += piece;
  }
  return { finals: finals.trim(), interim: interim.trim() };
}

export function VoiceInterview({
  jobDescription,
  questionBank,
  disabled,
}: Props) {
  const bank =
    questionBank.length > 0 ? questionBank : DEFAULT_QUESTIONS;

  const [started, setStarted] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [liveLine, setLiveLine] = useState("");
  const [listening, setListening] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerEvaluationResult | null>(null);

  const recRef = useRef<InstanceType<RecCtor> | null>(null);

  useEffect(() => {
    setSpeechOk(Boolean(getRecognitionCtor()));
  }, []);

  const tearDownRecognition = useCallback(() => {
    const r = recRef.current;
    if (r) {
      try {
        r.abort();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }
    setListening(false);
    setLiveLine("");
  }, []);

  useEffect(() => () => tearDownRecognition(), [tearDownRecognition]);

  const startInterview = () => {
    setStarted(true);
    setQIndex(0);
    setTranscript("");
    setFeedback(null);
    setEvalError(null);
    tearDownRecognition();
  };

  const current = bank[qIndex] ?? bank[0]!;

  const toggleMic = () => {
    if (disabled || !speechOk) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }

    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    tearDownRecognition();
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (ev: Event) => {
      const { finals, interim } = processRecognitionResult(ev);
      if (finals) {
        setTranscript((prev) =>
          prev ? `${prev.trimEnd()} ${finals}` : finals
        );
      }
      setLiveLine(interim);
    };

    rec.onerror = () => {
      setListening(false);
      setLiveLine("");
    };

    rec.onend = () => {
      setListening(false);
      setLiveLine("");
      recRef.current = null;
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const submitEvaluation = async () => {
    const jd = jobDescription.trim();
    const ans = transcript.trim();
    if (!jd || !ans) return;
    setEvalLoading(true);
    setEvalError(null);
    try {
      const res = await fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: current.question,
          answer: ans,
          jobDescription: jd,
        }),
      });
      const data = (await res.json()) as
        | AnswerEvaluationResult
        | { error?: string };
      if (!res.ok) {
        setEvalError(
          "error" in data && data.error
            ? data.error
            : `Evaluation failed (${res.status})`
        );
        return;
      }
      if (!("score" in data)) {
        setEvalError("Unexpected response.");
        return;
      }
      setFeedback(data);
    } catch {
      setEvalError("Network error.");
    } finally {
      setEvalLoading(false);
    }
  };

  const nextQuestion = () => {
    setQIndex((i) => (i + 1) % bank.length);
    setTranscript("");
    setFeedback(null);
    setEvalError(null);
    tearDownRecognition();
  };

  if (!jobDescription.trim()) {
    return null;
  }

  return (
    <div className="rounded-ca bg-ca-lowest/90 p-4 shadow-ca ring-1 ring-ca-ink/[0.06] sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold text-ca-ink">
            Voice mock interview
          </h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ca-muted">
            Answer aloud or type. Your prep questions are used when available;
            otherwise we rotate a short practice set.
          </p>
        </div>
        {!started ? (
          <button
            type="button"
            disabled={Boolean(disabled)}
            onClick={startInterview}
            className="mt-2 shrink-0 rounded-ca bg-ca-primary-gradient px-4 py-2 text-xs font-semibold text-ca-on-primary shadow-ca-ambient hover:opacity-95 disabled:opacity-50 sm:mt-0"
          >
            Start interview
          </button>
        ) : null}
      </div>

      {!speechOk && (
        <p className="mt-3 rounded-lg border border-ca-warning/35 bg-ca-warning-soft/50 px-3 py-2 text-[11px] text-ca-ink">
          Speech-to-text is not available in this browser. Use Chrome or Edge,
          or type your answer in the box below.
        </p>
      )}

      {started && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-ca-ink/[0.08] bg-ca-low/40 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ca-muted">
              Question {qIndex + 1} / {bank.length}
            </p>
            <p className="mt-2 text-sm font-medium leading-snug text-ca-ink">
              {current.question}
            </p>
            {current.expectedTopics.length > 0 && (
              <p className="mt-2 text-[11px] text-ca-muted">
                <span className="font-semibold text-ca-ink/80">Hints: </span>
                {current.expectedTopics.join(" · ")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!speechOk || Boolean(disabled)}
              onClick={toggleMic}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition ${
                listening
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "border border-ca-ink/[0.15] bg-ca-lowest text-ca-ink hover:bg-ca-low"
              } disabled:opacity-50`}
              aria-pressed={listening}
            >
              <span className="inline-block size-2 rounded-full bg-current opacity-90" />
              {listening ? "Stop recording" : "Start microphone"}
            </button>
            {listening && (
              <span className="text-[11px] font-medium text-ca-primary-ink">
                Listening…
              </span>
            )}
          </div>

          {liveLine ? (
            <p className="text-[11px] italic text-ca-muted">
              Live: {liveLine}
            </p>
          ) : null}

          <div>
            <label
              htmlFor="voice-interview-transcript"
              className="text-[10px] font-bold uppercase tracking-wider text-ca-muted"
            >
              Your answer (edit before submit)
            </label>
            <textarea
              id="voice-interview-transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={5}
              placeholder="Speak using the mic, or type here…"
              className="mt-1.5 w-full resize-y rounded-lg border border-ca-ink/[0.08] bg-ca-lowest px-3 py-2 text-sm text-ca-ink placeholder:text-ca-muted/70 focus:border-ca-primary focus:outline-none focus:ring-1 focus:ring-ca-primary"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                evalLoading || !transcript.trim() || Boolean(disabled)
              }
              onClick={() => void submitEvaluation()}
              className="rounded-ca bg-ca-primary-gradient px-4 py-2 text-xs font-semibold text-ca-on-primary shadow-ca-ambient hover:opacity-95 disabled:opacity-50"
            >
              {evalLoading ? "Evaluating…" : "Get feedback"}
            </button>
            {feedback && (
              <button
                type="button"
                disabled={
                  evalLoading || !transcript.trim() || Boolean(disabled)
                }
                onClick={() => void submitEvaluation()}
                className="rounded-lg border border-ca-ink/[0.08] bg-transparent px-4 py-2 text-xs font-semibold text-ca-ink hover:bg-ca-low disabled:opacity-50"
                title="Re-run AI on this answer"
              >
                Retry feedback
              </button>
            )}
            <button
              type="button"
              disabled={Boolean(disabled)}
              onClick={nextQuestion}
              className="rounded-lg border border-ca-ink/[0.15] bg-ca-lowest px-4 py-2 text-xs font-semibold text-ca-ink hover:bg-ca-low disabled:opacity-50"
            >
              Next question
            </button>
          </div>

          {evalError && (
            <p
              className="rounded-lg border border-red-200/80 bg-ca-danger-soft px-3 py-2 text-xs text-ca-danger"
              role="alert"
            >
              {evalError}
            </p>
          )}

          {feedback && (
            <div className="space-y-3 rounded-lg border border-ca-primary/25 bg-ca-primary-soft/35 px-3 py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ca-muted">
                  Score
                </span>
                <span className="font-display text-2xl font-bold text-ca-primary-ink">
                  {feedback.score}
                  <span className="text-sm font-semibold text-ca-muted">
                    /10
                  </span>
                </span>
              </div>
              {feedback.strengths.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-ca-muted">
                    Strengths
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-ca-ink">
                    {feedback.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.improvements.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-ca-muted">
                    Improvements
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-ca-ink">
                    {feedback.improvements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase text-ca-muted">
                  Suggested answer
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ca-ink">
                  {feedback.suggestedAnswer}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
