"use client";

import Link from "next/link";
import { SectionShell } from "@/components/dashboard/SectionShell";

export function VoiceInterviewView() {
  return (
    <SectionShell
      eyebrow="Voice"
      title="Voice interview practice"
      description="Speak answers aloud and get structured feedback — coming soon. Text-based prep is available on the Interview prep route."
    >
      <div className="rounded-ca bg-ca-low px-6 py-12 text-center">
        <p className="font-display text-base font-semibold text-ca-ink">
          Voice mode is not wired yet
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ca-muted">
          Use{" "}
          <Link href="/interview" className="font-semibold text-ca-primary hover:underline">
            Interview prep
          </Link>{" "}
          for STAR, technical, and resume deep-dive questions today.
        </p>
      </div>
    </SectionShell>
  );
}
