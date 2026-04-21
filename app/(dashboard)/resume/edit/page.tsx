"use client";

import Link from "next/link";
import { EditableResume } from "@/components/EditableResume";
import { SectionShell } from "@/components/dashboard/SectionShell";
import { EMPTY_OPTIMIZED_RESUME } from "@/lib/empty-resume";
import { useAppStore } from "@/store/useAppStore";

export default function EditableResumePage() {
  const result = useAppStore((s) => s.result);
  const jobDescription = useAppStore((s) => s.jobDescription);
  const seed = result?.resume ?? EMPTY_OPTIMIZED_RESUME;

  return (
    <div className="space-y-6">
      <SectionShell
        eyebrow="Editor"
        title="Editable resume builder"
        description="Edit generated content with a live A4 preview. Use Improve on bullets with a job description in the workspace. Download PDF uses your edits."
      >
        {!result?.resume && (
          <p className="mb-4 rounded-ca bg-ca-warning-soft/40 px-3 py-2 text-sm text-ca-ink ring-1 ring-ca-warning/20">
            No generated resume yet —{" "}
            <Link href="/resume" className="font-semibold text-ca-primary underline">
              generate one first
            </Link>{" "}
            to pre-fill from AI, or start from scratch.
          </p>
        )}
        {!jobDescription.trim() && (
          <p className="mb-4 text-sm text-ca-muted">
            Add a job description on the{" "}
            <Link href="/resume" className="font-semibold text-ca-primary underline">
              resume builder
            </Link>{" "}
            so bullet Improve calls have posting context.
          </p>
        )}
        <EditableResume seedResume={seed} jobDescription={jobDescription} />
      </SectionShell>
    </div>
  );
}
