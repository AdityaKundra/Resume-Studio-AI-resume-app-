"use client";

import dynamic from "next/dynamic";
import { SectionShell } from "@/components/dashboard/SectionShell";
import { useAppStore } from "@/store/useAppStore";

const InterviewPrepPanel = dynamic(
  () =>
    import("@/components/InterviewPrepPanel").then((m) => m.InterviewPrepPanel),
  {
    loading: () => (
      <p className="rounded-ca bg-ca-low px-4 py-8 text-center text-sm text-ca-muted">
        Loading interview prep…
      </p>
    ),
    ssr: false,
  }
);

export function InterviewPageView() {
  const jobDescription = useAppStore((s) => s.jobDescription);
  const result = useAppStore((s) => s.result);

  if (!result) {
    return (
      <SectionShell
        eyebrow="Prep"
        title="Interview prep"
        description="Generate a resume first to unlock questions tailored to this posting."
      >
        <div className="rounded-ca bg-ca-low px-4 py-10 text-center">
          <p className="text-sm font-medium text-ca-ink">Resume required</p>
          <p className="mx-auto mt-2 max-w-[260px] text-xs text-ca-muted">
            Complete{" "}
            <a
              href="/resume"
              className="font-semibold text-ca-primary hover:underline"
            >
              Generate resume
            </a>{" "}
            to enable interview prep for this job.
          </p>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      eyebrow="Prep"
      title="Interview prep"
      description="Questions and study plan aligned with your current JD and generated resume."
    >
      <InterviewPrepPanel
        embedded
        jobDescription={jobDescription}
        resumeJson={result.resume}
        disabled={!jobDescription.trim()}
      />
    </SectionShell>
  );
}
