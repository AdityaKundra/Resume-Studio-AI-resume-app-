"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { SectionShell } from "@/components/dashboard/SectionShell";
import { ResumePreview } from "@/components/ResumePreview";
import { useResumeActions } from "@/hooks/useResumeActions";
import {
  JOB_DESCRIPTION_MAX_LENGTH,
  jobDescriptionLengthError,
} from "@/lib/job-description";
import { useAppStore } from "@/store/useAppStore";
import { ResumeQuerySync } from "./ResumeQuerySync";

const primaryBtn =
  "inline-flex items-center justify-center rounded-ca bg-ca-primary-gradient px-4 py-2.5 text-sm font-semibold text-ca-on-primary shadow-ca-ambient transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
  "inline-flex items-center justify-center rounded-ca bg-ca-highest px-4 py-2.5 text-sm font-semibold text-ca-ink shadow-ca transition hover:bg-ca-container disabled:opacity-50";
const fieldClass =
  "w-full rounded-ca border-0 bg-ca-lowest px-3 py-2.5 text-sm text-ca-ink shadow-ca ring-1 ring-ca-ink/[0.08] placeholder:text-ca-muted focus:outline-none focus:ring-2 focus:ring-ca-primary/25";

export function ResumeBuilderView() {
  const jobDescription = useAppStore((s) => s.jobDescription);
  const setJobDescription = useAppStore((s) => s.setJobDescription);
  const jobUrl = useAppStore((s) => s.jobUrl);
  const setJobUrl = useAppStore((s) => s.setJobUrl);
  const userProfile = useAppStore((s) => s.userProfile);
  const loading = useAppStore((s) => s.loading);
  const improveLoading = useAppStore((s) => s.improveLoading);
  const error = useAppStore((s) => s.error);
  const result = useAppStore((s) => s.result);
  const pdfLoading = useAppStore((s) => s.pdfLoading);
  const skipPdf = useAppStore((s) => s.skipPdf);
  const setSkipPdf = useAppStore((s) => s.setSkipPdf);
  const skipAdvancedAts = useAppStore((s) => s.skipAdvancedAts);
  const setSkipAdvancedAts = useAppStore((s) => s.setSkipAdvancedAts);
  const generateStatus = useAppStore((s) => s.generateStatus);
  const setGenerateStatus = useAppStore((s) => s.setGenerateStatus);
  const fetchJdLoading = useAppStore((s) => s.fetchJdLoading);
  const fetchJdError = useAppStore((s) => s.fetchJdError);
  const setFetchJdError = useAppStore((s) => s.setFetchJdError);
  const setJdAnalysis = useAppStore((s) => s.setJdAnalysis);
  const setAnalyzeError = useAppStore((s) => s.setAnalyzeError);

  const analyzeLoading = useAppStore((s) => s.analyzeLoading);

  const {
    fetchJobFromUrl,
    analyzeJd,
    handleGenerate,
    improveResume,
    downloadPdf,
    clearGenerateTimers,
    generateTimersRef,
  } = useResumeActions();

  useEffect(() => {
    if (!loading) {
      clearGenerateTimers();
      setGenerateStatus("");
      return;
    }
    setGenerateStatus("Calling AI model…");
    const timers: number[] = [];
    if (!skipPdf || !skipAdvancedAts) {
      timers.push(
        window.setTimeout(() => {
          if (!skipPdf) setGenerateStatus("Rendering PDF…");
        }, 6000)
      );
    }
    if (!skipAdvancedAts) {
      timers.push(
        window.setTimeout(() => {
          setGenerateStatus("Computing ATS fit…");
        }, 12000)
      );
    }
    generateTimersRef.current = timers;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [loading, skipPdf, skipAdvancedAts, clearGenerateTimers, generateTimersRef, setGenerateStatus]);

  const jdTrimmed = jobDescription.trim();
  const jdLengthHint = jobDescriptionLengthError(jdTrimmed);
  const jdChars = jobDescription.length;

  const inputDescription =
    "Paste the full posting. Analyze extracts signals; Generate produces your tailored resume and unlocks ATS + interview tools.";

  return (
    <div className="space-y-10">
      <Suspense fallback={null}>
        <ResumeQuerySync />
      </Suspense>

      <SectionShell
        eyebrow="Input"
        title="Job description"
        description={inputDescription}
      >
        <form className="space-y-5" onSubmit={handleGenerate}>
          <div className="rounded-ca bg-ca-low px-3 py-3 sm:px-4 sm:py-4">
            <label
              htmlFor="job-url"
              className="font-label mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ca-muted"
            >
              Paste job URL
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                id="job-url"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://…"
                value={jobUrl}
                onChange={(e) => {
                  setJobUrl(e.target.value);
                  setFetchJdError(null);
                }}
                aria-describedby="job-fetch-hint"
                className={`min-w-0 flex-1 ${fieldClass}`}
              />
              <button
                type="button"
                onClick={() => void fetchJobFromUrl()}
                disabled={fetchJdLoading || loading}
                className={primaryBtn + " shrink-0"}
              >
                {fetchJdLoading ? "Fetching…" : "Fetch JD"}
              </button>
            </div>
            <p
              id="job-fetch-hint"
              className="mt-2 text-[11px] leading-relaxed text-ca-muted"
            >
              LinkedIn and other sites often block bots — if fetch fails, paste the
              job description manually below.
            </p>
            {fetchJdError && (
              <p
                className="mt-2 rounded-ca bg-ca-danger-soft px-2.5 py-2 text-[11px] text-ca-danger ring-1 ring-ca-danger/20"
                role="alert"
              >
                {fetchJdError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="job"
              className="font-label mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ca-muted"
            >
              Posting text
            </label>
            <textarea
              id="job"
              required
              rows={10}
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                setJdAnalysis(null);
                setAnalyzeError(null);
              }}
              placeholder="Paste the full job posting here…"
              aria-invalid={Boolean(jdLengthHint)}
              aria-describedby="job-fetch-hint job-desc-hint"
              className={`min-h-[200px] resize-y ${fieldClass}`}
            />
            <p
              id="job-desc-hint"
              className={`mt-1.5 text-[11px] ${jdLengthHint ? "text-ca-danger" : "text-ca-muted"}`}
            >
              {jdLengthHint ??
                `Up to ${JOB_DESCRIPTION_MAX_LENGTH.toLocaleString()} characters (${jdChars.toLocaleString()} used).`}
            </p>
          </div>

          <div className="rounded-ca bg-ca-low px-3 py-3 sm:px-4 sm:py-4">
            <p className="font-label text-[10px] font-semibold uppercase tracking-wide text-ca-muted">
              Faster run (optional)
            </p>
            <div className="mt-2 space-y-2.5">
              <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-snug text-ca-ink">
                <input
                  type="checkbox"
                  checked={skipPdf}
                  onChange={(e) => setSkipPdf(e.target.checked)}
                  className="mt-0.5 rounded border-ca-ink/20 text-ca-primary focus:ring-ca-primary"
                />
                <span>
                  <span className="font-medium">Skip PDF</span>
                  <span className="mt-0.5 block text-[11px] text-ca-muted">
                    Render when you download
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-snug text-ca-ink">
                <input
                  type="checkbox"
                  checked={skipAdvancedAts}
                  onChange={(e) => setSkipAdvancedAts(e.target.checked)}
                  className="mt-0.5 rounded border-ca-ink/20 text-ca-primary focus:ring-ca-primary"
                />
                <span>
                  <span className="font-medium">Skip ATS scoring</span>
                  <span className="mt-0.5 block text-[11px] text-ca-muted">
                    Saves time on long postings
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <button
              type="button"
              onClick={() => void analyzeJd()}
              disabled={analyzeLoading || loading}
              className={secondaryBtn + " sm:flex-1"}
            >
              {analyzeLoading ? "Analyzing…" : "Analyze posting"}
            </button>
          </div>

          {error && (
            <p
              className="rounded-ca bg-ca-danger-soft px-3 py-2.5 text-sm text-ca-danger ring-1 ring-ca-danger/20"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={primaryBtn + " w-full py-3.5"}
          >
            {loading ? generateStatus || "Generating resume…" : "Generate resume"}
          </button>
        </form>
      </SectionShell>

      <SectionShell
        eyebrow="Output"
        title="Tailored resume"
        description="Preview improves after generate. Use Improve to iterate, then download PDF or open ATS for the full breakdown."
      >
        {!result ? (
          <div className="flex flex-col items-center justify-center rounded-ca bg-ca-low px-6 py-14 text-center sm:py-20">
            <div
              className="mb-4 flex size-14 items-center justify-center rounded-ca-xl bg-ca-primary-soft text-ca-primary-ink shadow-ca ring-1 ring-ca-primary/15"
              aria-hidden
            >
              <svg
                className="size-7 opacity-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <p className="font-display text-base font-semibold text-ca-ink">
              Nothing to show yet
            </p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-ca-muted sm:text-[13px]">
              Paste a posting above and run{" "}
              <strong className="font-semibold text-ca-ink/90">Generate resume</strong>.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={improveResume}
                  disabled={improveLoading || loading || pdfLoading}
                  className={primaryBtn}
                >
                  {improveLoading ? "Improving…" : "Improve resume"}
                </button>
                <button
                  type="button"
                  onClick={() => void downloadPdf()}
                  disabled={pdfLoading}
                  className={secondaryBtn}
                >
                  {pdfLoading
                    ? "Preparing PDF…"
                    : result.pdfBase64
                      ? "Download PDF"
                      : "Build & download PDF"}
                </button>
              </div>
              {pdfLoading && (
                <p className="text-xs text-ca-muted sm:text-right">Rendering PDF…</p>
              )}
            </div>
            <div className="rounded-ca bg-ca-warning-soft/50 px-3 py-2 text-[11px] leading-relaxed text-ca-ink/90 ring-1 ring-ca-warning/15">
              <span className="font-semibold text-ca-warning">ATS note: </span>
              Scores are heuristic estimates only — not a pass/fail from a real
              applicant tracking system.
            </div>
            <div id="resume-preview" className="rounded-ca-xl bg-ca-dim p-4 sm:p-8 sm:py-10">
              <ResumePreview
                resume={result.resume}
                contact={userProfile.contact}
                education={userProfile.education}
                className="shadow-ca-paper"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/resume/edit"
                className={secondaryBtn + " inline-flex"}
              >
                Editable resume builder
              </Link>
            </div>
          </>
        )}
      </SectionShell>

      <SectionShell
        eyebrow="Profile"
        title="Your profile"
        description="Experience, projects, and skills are edited on a dedicated page and sent with every generate, analyze, and PDF request."
      >
        <div className="rounded-ca bg-ca-low px-4 py-5 sm:px-6">
          <p className="text-sm leading-relaxed text-ca-ink">
            Manage your structured profile separately so the builder stays focused on the
            job posting and resume output.
          </p>
          <Link
            href="/profile"
            className={
              primaryBtn + " mt-4 inline-flex w-full justify-center sm:w-auto"
            }
          >
            Open profile editor
          </Link>
        </div>
      </SectionShell>
    </div>
  );
}
