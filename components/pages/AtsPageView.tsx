"use client";

import { AtsDashboard } from "@/components/AtsDashboard";
import { SectionShell } from "@/components/dashboard/SectionShell";
import { JdAnalysisPanel } from "@/components/JdAnalysisPanel";
import { useResumeActions } from "@/hooks/useResumeActions";
import { useAppStore } from "@/store/useAppStore";

const primaryBtn =
  "inline-flex items-center justify-center rounded-ca bg-ca-primary-gradient px-4 py-2.5 text-sm font-semibold text-ca-on-primary shadow-ca-ambient transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50";

export function AtsPageView() {
  const jdAnalysis = useAppStore((s) => s.jdAnalysis);
  const analyzeLoading = useAppStore((s) => s.analyzeLoading);
  const analyzeError = useAppStore((s) => s.analyzeError);
  const result = useAppStore((s) => s.result);
  const { analyzeJd, improveResume } = useResumeActions();
  const improveLoading = useAppStore((s) => s.improveLoading);

  return (
    <div className="space-y-6">
      <SectionShell
        eyebrow="Analytics"
        title="Posting insights"
        description="Heuristic scan of the JD vs your saved profile. Run Analyze posting from the resume builder with a JD loaded, or switch there to paste a posting."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={analyzeJd} className={primaryBtn}>
            {analyzeLoading ? "Analyzing…" : "Analyze posting"}
          </button>
        </div>
        <JdAnalysisPanel
          analysis={jdAnalysis}
          loading={analyzeLoading}
          error={analyzeError}
        />
      </SectionShell>

      <SectionShell
        eyebrow="Analytics"
        title="ATS fit model"
        description="Weighted score after you generate a resume. Use Improve on the resume builder to iterate against missing keywords."
      >
        {result?.advancedAts ? (
          <AtsDashboard
            advanced={result.advancedAts}
            onBoost={improveResume}
            boostLoading={improveLoading}
          />
        ) : (
          <div className="rounded-ca bg-ca-low px-4 py-10 text-center outline outline-1 outline-dashed outline-ca-ink/15">
            <p className="text-sm font-medium text-ca-ink">Awaiting resume</p>
            <p className="mx-auto mt-2 max-w-[240px] text-xs leading-relaxed text-ca-muted">
              Generate a resume from the Resume builder to compute keyword,
              semantic, section, and formatting signals for this posting.
            </p>
            <a href="/resume" className={"mt-4 inline-block " + primaryBtn}>
              Go to resume builder
            </a>
          </div>
        )}
      </SectionShell>
    </div>
  );
}
