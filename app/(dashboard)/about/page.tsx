import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Platform overview",
  description:
    "AI Resume Platform / Resume Studio — what it is, core value, flow, and design highlights.",
};

export default function AboutPage() {
  return (
    <div className="text-ca-ink">
      <main className="mx-auto max-w-3xl pb-8 lg:px-0">
        <Link
          href="/"
          className="text-sm font-semibold text-ca-primary hover:text-ca-primary-dim"
        >
          ← Back to dashboard
        </Link>
        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-ca-muted">
          Documentation
        </p>
        <h1 className="font-display mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          AI Resume Platform / Resume Studio
        </h1>
        <p className="mt-2 text-sm text-ca-muted">
          Product overview — value, flow, architecture, and roadmap ideas.
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-ca-ink">
              What it is
            </h2>
            <p>
              An AI-powered, local-first career platform that helps candidates
              tailor resumes, analyze job descriptions, and prepare for
              interviews — all within a single system.
            </p>
            <p>
              Unlike typical resume builders, this platform combines resume
              generation, ATS-style evaluation, and interview preparation into a
              unified workflow, with optional fully offline execution using local
              LLMs (Ollama).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-ca-ink">
              Core value
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-ca-ink">
              <li>
                Reduces time to create job-specific resumes from hours → minutes
              </li>
              <li>
                Bridges the gap between resume writing and interview preparation
              </li>
              <li>
                Provides actionable insights (ATS score, gaps, prep plan)
              </li>
              <li>
                Works locally without relying on external APIs (privacy + cost
                advantage)
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-ca-ink">
              Who it is for
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Engineers applying to multiple roles requiring tailored resumes
              </li>
              <li>Candidates preparing for technical interviews</li>
              <li>Developers exploring local AI-first applications</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-ca-ink">
              End-to-end flow
            </h2>
            <ol className="list-decimal space-y-4 pl-5 marker:font-semibold">
              <li>
                <span className="font-semibold">Profile ingestion</span>
                <ul className="mt-2 list-disc space-y-1 pl-5 font-normal text-ca-muted">
                  <li>
                    User defines structured profile (skills, experience,
                    projects)
                  </li>
                  <li>Stored locally (no backend dependency)</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">Job description processing</span>
                <ul className="mt-2 list-disc space-y-1 pl-5 font-normal text-ca-muted">
                  <li>Accepts raw text or attempts URL extraction</li>
                  <li>
                    Performs heuristic analysis (skills, seniority,
                    responsibilities)
                  </li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">
                  AI-powered resume generation
                </span>
                <ul className="mt-2 list-disc space-y-1 pl-5 font-normal text-ca-muted">
                  <li>Converts profile + JD into structured JSON resume</li>
                  <li>
                    Enforces ATS-friendly formatting and keyword alignment
                  </li>
                  <li>
                    Uses pluggable AI provider (Ollama / OpenAI / Gemini)
                  </li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">Rendering + PDF pipeline</span>
                <ul className="mt-2 list-disc space-y-1 pl-5 font-normal text-ca-muted">
                  <li>Resume JSON → HTML template → A4 PDF (Puppeteer)</li>
                  <li>Ensures print-ready output</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">ATS-style scoring engine</span>
                <ul className="mt-2 list-disc space-y-1 pl-5 font-normal text-ca-muted">
                  <li>
                    Multi-factor scoring: keyword match, semantic similarity
                    (embeddings / TF–IDF), section completeness, formatting
                    heuristics
                  </li>
                  <li>Produces actionable gaps and suggestions</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">
                  Iterative improvement loop
                </span>
                <ul className="mt-2 list-disc space-y-1 pl-5 font-normal text-ca-muted">
                  <li>AI refines resume using missing keywords</li>
                  <li>
                    Maintains factual integrity while improving phrasing
                  </li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">
                  Interview preparation engine
                </span>
                <ul className="mt-2 list-disc space-y-1 pl-5 font-normal text-ca-muted">
                  <li>
                    Role-specific questions: behavioral (STAR), technical (easy →
                    hard), system design
                  </li>
                  <li>7-day structured preparation plan</li>
                  <li>Aligned with both JD and candidate resume</li>
                </ul>
              </li>
              <li>
                <span className="font-semibold">Local storage + versioning</span>
                <ul className="mt-2 list-disc space-y-1 pl-5 font-normal text-ca-muted">
                  <li>Saves generated resumes in browser storage</li>
                  <li>Export/import for portability</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-ca-ink">
              System design highlights
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Modular AI provider layer (pluggable LLM backends)</li>
              <li>Structured JSON contracts for deterministic outputs</li>
              <li>Prompt engineering with strict schema enforcement</li>
              <li>Fallback mechanisms (embeddings → TF–IDF)</li>
              <li>Local-first architecture (no mandatory backend services)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-ca-ink">
              What makes it unique
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Combines resume generation, ATS scoring, and interview prep in
                one pipeline
              </li>
              <li>Supports fully offline AI workflows using Ollama</li>
              <li>Uses structured outputs instead of free-text generation</li>
              <li>Designed as an extensible system, not a single-purpose tool</li>
            </ul>
          </section>

          <section className="space-y-3 rounded-ca bg-ca-warning-soft/40 px-4 py-4 shadow-ca">
            <h2 className="font-display text-lg font-semibold text-ca-ink">
              Limitations
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-ca-ink">
              <li>
                ATS score is heuristic, not equivalent to real ATS systems
              </li>
              <li>
                Job URL extraction may fail on protected sites (e.g. LinkedIn)
              </li>
              <li>
                Not production-hardened for multi-user SaaS (no auth, rate
                limits)
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-ca-ink">
              Future extensions
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-ca-muted">
              <li>Voice-based mock interviews with real-time evaluation</li>
              <li>JD → system design scenario generator</li>
              <li>Skill gap tracking across multiple applications</li>
              <li>Chrome extension for job auto-import</li>
              <li>Multi-candidate recruiter dashboard</li>
            </ul>
          </section>

          <p className="pt-10 text-xs text-ca-muted">
            Markdown source:{" "}
            <code className="rounded bg-ca-low px-1.5 py-0.5 text-[11px]">
              docs/RESUME_STUDIO_OVERVIEW.md
            </code>
          </p>
        </div>
      </main>
    </div>
  );
}

