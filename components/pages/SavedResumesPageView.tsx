"use client";

import { useRouter } from "next/navigation";
import { SavedResumesPanel } from "@/components/SavedResumesPanel";
import { SectionShell } from "@/components/dashboard/SectionShell";
import { useResumeActions } from "@/hooks/useResumeActions";
import { useAppStore } from "@/store/useAppStore";
import type { SavedResumeVersion } from "@/lib/types";

export function SavedResumesPageView() {
  const bumpVersions = useAppStore((s) => s.bumpVersions);
  const versionTick = useAppStore((s) => s.versionTick);
  const { loadVersion } = useResumeActions();
  const router = useRouter();

  const onSelect = async (v: SavedResumeVersion) => {
    await loadVersion(v);
    router.push(`/resume?resumeId=${encodeURIComponent(v.id)}`);
  };

  return (
    <SectionShell
      eyebrow="Library"
      title="Saved resumes"
      description="Auto-saved drafts in this browser. Load one to restore JD, resume, and scores — you will jump to the resume builder with that version."
    >
      <SavedResumesPanel
        onSelect={onSelect}
        refreshToken={versionTick}
        onImported={bumpVersions}
      />
      <p className="mt-6 text-center text-xs text-ca-muted">
        Deep link: append{" "}
        <code className="rounded bg-ca-low px-1.5 py-0.5 text-[11px]">
          ?resumeId=&lt;id&gt;
        </code>{" "}
        to <span className="font-medium text-ca-ink">/resume</span> to load a version.
      </p>
    </SectionShell>
  );
}
