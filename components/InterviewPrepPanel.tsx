"use client";

import { useEffect, useMemo, useState } from "react";
import { VoiceInterview } from "@/components/VoiceInterview";
import { jobDescriptionLengthError } from "@/lib/job-description";
import {
  loadCachedInterviewPrep,
  persistInterviewPrep,
} from "@/lib/persistence";
import { voiceQuestionBankFromPrep } from "@/lib/interview-prep";
import type {
  InterviewPrepResponse,
  InterviewQuestionItem,
  OptimizedResume,
} from "@/lib/types";

function QuestionList({ items }: { items: InterviewQuestionItem[] }) {
  if (items.length === 0) return null;
  return (
    <ol className="mt-3 list-decimal space-y-3 pl-4 text-xs leading-relaxed text-ca-ink">
      {items.map((item, i) => (
        <li key={i} className="pl-1">
          <span>{item.question}</span>
          {item.expectedTopics.length > 0 && (
            <p className="mt-1.5 text-[11px] leading-snug text-ca-muted">
              <span className="font-semibold text-ca-ink/80">
                Answer should cover:{" "}
              </span>
              {item.expectedTopics.join(" · ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

type TabId = "topics" | "questions" | "systemDesign" | "prepPlan";

const TABS: { id: TabId; label: string }[] = [
  { id: "topics", label: "Topics" },
  { id: "questions", label: "Questions" },
  { id: "systemDesign", label: "System design" },
  { id: "prepPlan", label: "Prep plan" },
];

type Props = {
  jobDescription: string;
  resumeJson: OptimizedResume;
  disabled?: boolean;
  /** Omit outer card chrome when nested inside output panel */
  embedded?: boolean;
};

export function InterviewPrepPanel({
  jobDescription,
  resumeJson,
  disabled,
  embedded,
}: Props) {
  const [tab, setTab] = useState<TabId>("topics");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prep, setPrep] = useState<InterviewPrepResponse | null>(null);
  /** Fingerprint of JD + resume when prep was last generated successfully */
  const [prepSourceSig, setPrepSourceSig] = useState<string | null>(null);

  const prepContextSig = useMemo(
    () =>
      JSON.stringify({
        jd: jobDescription.trim(),
        resume: resumeJson,
      }),
    [jobDescription, resumeJson]
  );

  const prepStale =
    Boolean(prep && prepSourceSig != null && prepSourceSig !== prepContextSig);

  useEffect(() => {
    if (prep) return;
    let cancelled = false;
    void loadCachedInterviewPrep(prepContextSig).then((cached) => {
      if (!cancelled && cached) {
        setPrep(cached);
        setPrepSourceSig(prepContextSig);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [prepContextSig, prep]);

  const run = async () => {
    const jd = jobDescription.trim();
    if (!jd) {
      setError("Add a job description first.");
      return;
    }
    const lenErr = jobDescriptionLengthError(jd);
    if (lenErr) {
      setError(lenErr);
      return;
    }
    setError(null);
    setLoading(true);
    const sourceSnapshot = JSON.stringify({ jd, resume: resumeJson });
    try {
      const res = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jd,
          resumeData: resumeJson,
        }),
      });
      const data = (await res.json()) as
        | InterviewPrepResponse
        | { error?: string };
      if (!res.ok) {
        setError(
          "error" in data && data.error
            ? data.error
            : `Request failed (${res.status})`
        );
        return;
      }
      if (!("role" in data) || !("topics" in data)) {
        setError("Unexpected response from server.");
        return;
      }
      setPrep(data);
      setPrepSourceSig(sourceSnapshot);
      void persistInterviewPrep(sourceSnapshot, data);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const topicBlocks: {
    key: keyof InterviewPrepResponse["topics"];
    label: string;
    weakHint: RegExp;
  }[] = [
    { key: "frontend", label: "Frontend", weakHint: /frontend|ui|react|css/i },
    { key: "backend", label: "Backend", weakHint: /backend|api|database|node|sql/i },
    { key: "devops", label: "DevOps", weakHint: /devops|cloud|docker|aws|ci/i },
    {
      key: "systemDesign",
      label: "System design",
      weakHint: /system design|scalab|distributed/i,
    },
    { key: "ai", label: "AI / ML", weakHint: /ai|ml|llm|machine learning/i },
  ];

  const isDomainWeak = (hint: RegExp) =>
    prep?.weakAreas.some((w) => hint.test(w)) ?? false;

  const jdHeadline =
    jobDescription
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0)
      ?.slice(0, 140) ?? "";

  const rootClass = embedded
    ? "space-y-4"
    : "space-y-4 rounded-ca bg-ca-lowest p-6 shadow-ca-ambient ring-1 ring-ca-ink/[0.06]";

  return (
    <section className={rootClass}>
      {!embedded && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-ca-ink">
              Interview prep
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ca-muted">
              Topics, leveled questions, system design prompts, and a 7-day plan
              tailored to this posting and your resume.
            </p>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={loading || disabled}
            className="shrink-0 rounded-ca bg-ca-primary-gradient px-4 py-2 text-sm font-semibold text-ca-on-primary shadow-ca-ambient hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Generating…" : prep ? "Regenerate" : "Generate prep"}
          </button>
        </div>
      )}

      {embedded && (
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ca-muted">
              Interview preparation
            </p>
            <p className="mt-0.5 text-xs text-ca-muted">
              Questions and study plan aligned to this JD and draft resume.
            </p>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={loading || disabled}
            className="shrink-0 rounded-ca bg-ca-primary-gradient px-4 py-2 text-sm font-semibold text-ca-on-primary shadow-ca-ambient hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Generating…" : prep ? "Regenerate" : "Generate prep"}
          </button>
        </div>
      )}

      {error && (
        <p
          className="rounded-lg border border-red-200/80 bg-ca-danger-soft px-3 py-2 text-sm text-ca-danger"
          role="alert"
        >
          {error}
        </p>
      )}

      {prepStale && prep && (
        <p
          className="rounded-lg border border-ca-warning/40 bg-ca-warning-soft px-3 py-2 text-xs leading-relaxed text-ca-ink"
          role="status"
        >
          <span className="font-semibold text-ca-warning">Heads up: </span>
          The job description or resume changed since this prep was generated.
          Use <strong className="font-semibold">Regenerate</strong> when you want
          prep aligned to the latest draft.
        </p>
      )}

      {prep && (
        <>
          {prep.weakAreas.length > 0 && (
            <div className="rounded-lg border border-ca-warning/35 bg-ca-warning-soft px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ca-warning">
                Focus areas
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ca-ink">
                {prep.weakAreas.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-ca-ink">
            <span className="font-semibold">Target role:</span> {prep.role}
          </p>

          <div
            className="flex flex-wrap gap-1 pb-3"
            role="tablist"
            aria-label="Interview prep sections"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-ca px-3 py-1.5 text-xs font-semibold transition ${
                  tab === t.id
                    ? "bg-ca-primary text-ca-on-primary shadow-ca"
                    : "text-ca-muted hover:bg-ca-low"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="min-h-[10rem] text-sm text-ca-ink">
            {tab === "topics" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {topicBlocks.map(({ key, label, weakHint }) => {
                  const items = prep.topics[key];
                  const weak = isDomainWeak(weakHint);
                  return (
                    <div
                      key={key}
                      className={`rounded-lg border p-3 ${
                        weak
                          ? "border-ca-warning/50 bg-ca-warning-soft/60"
                          : "border-ca-ink/[0.08] bg-ca-low/50"
                      }`}
                    >
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-ca-muted">
                        {label}
                        {weak && (
                          <span className="ml-2 font-normal normal-case text-ca-warning">
                            · prioritize
                          </span>
                        )}
                      </h3>
                      {items.length === 0 ? (
                        <p className="mt-2 text-xs text-ca-muted">—</p>
                      ) : (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
                          {items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "questions" && (
              <div className="space-y-6">
                {jdHeadline && (
                  <div className="rounded-lg border border-ca-primary/25 bg-ca-primary-soft/40 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ca-primary-ink">
                      Anchored to this posting
                    </p>
                    <p className="mt-1 text-xs leading-snug text-ca-ink">
                      {jdHeadline}
                      {jobDescription.trim().length > jdHeadline.length ? "…" : ""}
                    </p>
                  </div>
                )}

                <section>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-ca-muted">
                      Behavioral (STAR)
                    </h3>
                    <span className="rounded bg-ca-low px-1.5 py-0.5 text-[10px] font-medium text-ca-muted">
                      JD themes
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ca-muted">
                    Practice stories that match responsibilities and culture signals
                    in the job text — not generic “tell me about a time.”
                  </p>
                  {prep.questions.behavioral.length === 0 ? (
                    <p className="mt-2 text-xs italic text-ca-muted">
                      None returned — regenerate, or use Topics + Prep plan tasks.
                    </p>
                  ) : (
                    <QuestionList items={prep.questions.behavioral} />
                  )}
                </section>

                <section>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-ca-muted">
                      Resume deep-dive
                    </h3>
                    <span className="rounded bg-ca-low px-1.5 py-0.5 text-[10px] font-medium text-ca-muted">
                      Your CV ↔ this role
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ca-muted">
                    Interviewers connect your past work to what this JD asks for —
                    rehearse these out loud.
                  </p>
                  {prep.questions.resumeDeepDive.length === 0 ? (
                    <p className="mt-2 text-xs italic text-ca-muted">
                      None returned — regenerate with a fuller resume draft.
                    </p>
                  ) : (
                    <QuestionList items={prep.questions.resumeDeepDive} />
                  )}
                </section>

                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-ca-muted">
                    Technical ladder
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-ca-muted">
                    Fundamentals → applied scenarios → trade-offs and scale. Difficulty
                    should reflect the seniority implied in the posting.
                  </p>
                  <div className="mt-6 space-y-6 pt-2">
                    {(
                      [
                        ["Easy", prep.questions.easy, "baselines & definitions"],
                        ["Medium", prep.questions.medium, "how you’d build or debug"],
                        ["Hard", prep.questions.hard, "scale, failure, consistency"],
                      ] as const
                    ).map(([label, list, hint]) => (
                      <div key={label}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-ca-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ca-on-primary">
                            {label}
                          </span>
                          <span className="text-[10px] text-ca-muted">{hint}</span>
                        </div>
                        {list.length === 0 ? (
                          <p className="mt-2 text-xs text-ca-muted">—</p>
                        ) : (
                          <QuestionList items={list} />
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {tab === "systemDesign" && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-ca-muted">
                  Prompts
                </h3>
                <ol className="mt-2 list-decimal space-y-2 pl-4 text-xs leading-relaxed">
                  {prep.systemDesign.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
                {prep.systemDesign.length === 0 && (
                  <p className="mt-2 text-xs text-ca-muted">No prompts returned.</p>
                )}
              </div>
            )}

            {tab === "prepPlan" && (
              <div className="space-y-6">
                <div className="rounded-lg border border-ca-ink/[0.08] bg-ca-low/50 px-3 py-2.5">
                  <p className="text-xs font-medium text-ca-ink">
                    7-day sprint for{" "}
                    <span className="text-ca-primary-ink">{prep.role}</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ca-muted">
                    Each day has a <strong className="font-semibold text-ca-ink">focus</strong>{" "}
                    tied to the posting, then concrete tasks. Prefer mornings for
                    deep work; adjust blocks to your schedule.
                  </p>
                </div>

                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-ca-muted">
                    Gaps to close (JD vs you)
                  </h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-ca-ink">
                    {prep.gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-ca-muted">
                    Daily plan
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {prep.prepPlan.map((d) => (
                      <li
                        key={d.day}
                        className="overflow-hidden rounded-lg border border-ca-ink/[0.08] bg-ca-lowest shadow-sm"
                      >
                        <div className="border-l-4 border-ca-primary bg-ca-primary-soft/30 px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-ca-primary-ink">
                            Day {d.day}
                          </p>
                          <p className="mt-1 text-sm font-semibold leading-snug text-ca-ink">
                            {d.focus}
                          </p>
                        </div>
                        <ul className="space-y-2 border-t border-ca-ink/[0.08] px-3 py-3 text-xs leading-relaxed text-ca-ink">
                          {d.topics.map((t, i) => (
                            <li key={i} className="flex gap-2">
                              <span
                                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ca-primary"
                                aria-hidden
                              />
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!prep && !loading && (
        <p className="text-xs leading-relaxed text-ca-muted">
          Generate prep to see topics, interview questions, and a one-week study
          schedule. You can regenerate any time the JD or resume changes.
        </p>
      )}

      {jobDescription.trim() && (
        <div className="mt-8 pt-2">
          <VoiceInterview
            jobDescription={jobDescription}
            questionBank={voiceQuestionBankFromPrep(prep?.questions)}
            disabled={disabled}
          />
        </div>
      )}
    </section>
  );
}
