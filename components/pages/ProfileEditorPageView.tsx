"use client";

import Link from "next/link";
import { ProfileEditor } from "@/components/ProfileEditor";
import { SectionShell } from "@/components/dashboard/SectionShell";
import { useAppStore } from "@/store/useAppStore";

export function ProfileEditorPageView() {
  const userProfile = useAppStore((s) => s.userProfile);
  const setUserProfile = useAppStore((s) => s.setUserProfile);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ca-muted">
          Changes save to this browser (and sync to the server when configured).
        </p>
        <Link
          href="/resume"
          className="font-label text-sm font-semibold text-ca-primary hover:underline"
        >
          ← Resume builder
        </Link>
      </div>
      <SectionShell
        eyebrow="Profile"
        title="Your profile"
        description="Structured data merged into generate, analyze, and PDF render requests."
      >
        <ProfileEditor profile={userProfile} onChange={setUserProfile} embedded />
      </SectionShell>
    </div>
  );
}
