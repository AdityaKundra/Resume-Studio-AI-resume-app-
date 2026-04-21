"use client";

import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";

const cards: {
  href: string;
  title: string;
  body: string;
}[] = [
  {
    href: "/resume",
    title: "Resume builder",
    body: "Paste a JD, generate a tailored resume, and iterate with Improve.",
  },
  {
    href: "/resume/edit",
    title: "Edit resume",
    body: "Manual edits, live A4 preview, PDF, and AI bullet improvements.",
  },
  {
    href: "/profile",
    title: "Profile",
    body: "Edit the structured profile used for every AI request.",
  },
  {
    href: "/ats",
    title: "ATS dashboard",
    body: "Posting insights and multi-factor fit after you generate.",
  },
  {
    href: "/interview",
    title: "Interview prep",
    body: "Behavioral, technical, and resume deep-dive questions.",
  },
  {
    href: "/interview/voice",
    title: "Voice interview",
    body: "Placeholder for upcoming voice practice.",
  },
  {
    href: "/saved",
    title: "Saved resumes",
    body: "Load prior versions or export your library.",
  },
];

export function DashboardOverview() {
  const jobDescription = useAppStore((s) => s.jobDescription);
  const result = useAppStore((s) => s.result);
  const jdChars = jobDescription.trim().length;
  const hasResume = Boolean(result);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-ca-muted">
          Overview
        </p>
        <h1 className="font-display mt-2 text-2xl font-bold tracking-tight text-ca-ink sm:text-3xl">
          Workspace
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ca-muted">
          Pick a workflow below. Your posting and generated resume stay in sync across
          routes via the shared workspace state.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-ca bg-ca-low px-4 py-3 ring-1 ring-ca-ink/[0.06]">
          <p className="font-label text-[10px] uppercase tracking-wide text-ca-muted">
            Posting
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-ca-ink">
            {jdChars ? `${jdChars} chars` : "—"}
          </p>
        </div>
        <div className="rounded-ca bg-ca-low px-4 py-3 ring-1 ring-ca-ink/[0.06]">
          <p className="font-label text-[10px] uppercase tracking-wide text-ca-muted">
            Resume
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-ca-ink">
            {hasResume ? `ATS ${result!.atsMatchScore}` : "—"}
          </p>
        </div>
        <div className="rounded-ca bg-ca-low px-4 py-3 ring-1 ring-ca-ink/[0.06]">
          <p className="font-label text-[10px] uppercase tracking-wide text-ca-muted">
            Routes
          </p>
          <p className="mt-1 text-sm font-medium text-ca-ink">10 pages</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-ca border border-ca-ink/[0.06] bg-ca-lowest/80 p-5 shadow-ca transition hover:border-ca-primary/25 hover:shadow-ca-ambient"
          >
            <p className="font-display text-base font-semibold text-ca-ink group-hover:text-ca-primary">
              {c.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ca-muted">{c.body}</p>
            <p className="mt-4 font-label text-[11px] font-semibold uppercase tracking-wide text-ca-primary">
              Open →
            </p>
          </Link>
        ))}
      </div>

      <p className="text-center text-xs text-ca-muted">
        <Link href="/about" className="font-medium text-ca-primary hover:underline">
          Platform overview
        </Link>
      </p>
    </div>
  );
}
