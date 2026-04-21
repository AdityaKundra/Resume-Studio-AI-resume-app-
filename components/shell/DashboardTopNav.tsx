"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const WORKFLOW: { href: string; label: string }[] = [
  { href: "/resume", label: "Resume" },
  { href: "/ats", label: "ATS" },
  { href: "/interview", label: "Interview" },
];

type Props = {
  statusBadges?: ReactNode;
};

export function DashboardTopNav({ statusBadges }: Props) {
  const pathname = usePathname() || "/";

  return (
    <header className="sticky top-0 z-30 border-b border-ca-ink/[0.04] bg-ca-surface/85 shadow-ca backdrop-blur-[24px] backdrop-saturate-150">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:gap-5 lg:px-10 lg:py-4">
        <div className="flex items-center justify-between gap-3 md:hidden">
          <div>
            <p className="font-label text-[9px] font-semibold uppercase tracking-[0.2em] text-ca-muted">
              Resume Studio
            </p>
            <p className="font-display text-base font-bold tracking-tight text-ca-ink">
              The Curated Architect
            </p>
          </div>
          <Link
            href="/about"
            className="font-label shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold text-ca-primary ring-1 ring-ca-primary/25 transition hover:bg-ca-primary-soft"
          >
            About
          </Link>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <label htmlFor="workspace-search" className="sr-only">
              Search workspace
            </label>
            <div className="relative max-w-lg flex-1">
              <span
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ca-muted/90"
                aria-hidden
              >
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </span>
              <input
                id="workspace-search"
                type="search"
                placeholder="Search workspace…"
                className="font-label w-full rounded-ca border-0 bg-ca-lowest py-2.5 pl-11 pr-4 text-sm text-ca-ink shadow-ca ring-1 ring-ca-ink/[0.07] transition-shadow placeholder:text-ca-muted/75 focus:outline-none focus:ring-2 focus:ring-ca-primary/30"
                readOnly
                tabIndex={-1}
                aria-readonly="true"
              />
            </div>
            {statusBadges ? (
              <div className="flex flex-wrap items-center gap-2">{statusBadges}</div>
            ) : null}
          </div>

          <div
            className="hidden shrink-0 items-center gap-0.5 sm:flex"
            aria-hidden="true"
          >
            <span className="rounded-ca p-2 text-ca-muted transition-colors hover:bg-ca-low hover:text-ca-ink">
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
            </span>
            <span className="rounded-ca p-2 text-ca-muted transition-colors hover:bg-ca-low hover:text-ca-ink">
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
            </span>
            <span className="rounded-ca p-2 text-ca-muted transition-colors hover:bg-ca-low hover:text-ca-ink">
              <svg
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.65.87.174.099.321.225.44.36.293.319.657.556 1.05.69.39.133.804.17 1.204.09l1.218-.256c.55-.116 1.08.208 1.25.71l.506 1.518c.17.502.05 1.06-.28 1.45l-.804.94c-.31.36-.47.83-.47 1.32 0 .49.16.96.47 1.32l.804.94c.33.39.45.948.28 1.45l-.506 1.518c-.17.502-.7.826-1.25.71l-1.218-.256c-.4-.08-.814-.043-1.204.09-.393.134-.757.371-1.05.69-.119.135-.266.261-.44.36-.337.184-.587.496-.65.87l-.213 1.281c-.09.542-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.65-.87-.174-.099-.321-.225-.44-.36-.293-.319-.657-.556-1.05-.69-.39-.133-.804-.17-1.204-.09l-1.218.256c-.55.116-1.08-.208-1.25-.71l-.506-1.518c-.17-.502-.05-1.06.28-1.45l.804-.94c.31-.36.47-.83.47-1.32 0-.49-.16-.96-.47-1.32l-.804-.94c-.33-.39-.45-.948-.28-1.45l.506-1.518c.17-.502.7-.826 1.25-.71l1.218.256c.4.08.814.043 1.204-.09.393-.134.757-.371 1.05-.69.119-.135.266-.261.44-.36.337-.184.587-.496.65-.87l.213-1.281z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </span>
          </div>
        </div>

        <nav className="flex w-full flex-col gap-2" aria-label="Workflow">
          <p className="font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-ca-muted/90 lg:hidden">
            Workflow
          </p>
          <div className="flex w-full justify-stretch sm:justify-start lg:justify-center">
            <div
              className="flex w-full max-w-3xl flex-wrap gap-1 rounded-full bg-ca-low/95 p-1.5 shadow-[inset_0_1px_2px_rgb(50_50_50_/0.04)] ring-1 ring-ca-ink/[0.06] sm:inline-flex sm:w-auto sm:flex-nowrap"
              role="tablist"
            >
              {WORKFLOW.map((tab) => {
                const active =
                  pathname === tab.href ||
                  (tab.href !== "/" && pathname.startsWith(tab.href + "/"));
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    role="tab"
                    aria-selected={active}
                    className={`font-label min-h-[2.5rem] flex-1 rounded-full px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide transition-all duration-200 sm:flex-initial sm:min-w-[7.5rem] sm:px-4 ${
                      active
                        ? "bg-ca-lowest text-ca-primary shadow-ca ring-1 ring-ca-ink/[0.05]"
                        : "text-ca-muted hover:bg-ca-highest/70 hover:text-ca-ink"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
