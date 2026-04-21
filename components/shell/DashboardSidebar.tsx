"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

const items: { href: string; label: string; description: string }[] = [
  { href: "/", label: "Dashboard", description: "Overview" },
  { href: "/resume", label: "Resume Builder", description: "JD & generate" },
  { href: "/resume/edit", label: "Edit resume", description: "Manual + AI bullets" },
  { href: "/profile", label: "Profile", description: "Skills & experience" },
  { href: "/ats", label: "ATS Dashboard", description: "Insights & fit" },
  { href: "/interview", label: "Interview Prep", description: "Questions & plan" },
  { href: "/interview/voice", label: "Voice Interview", description: "Practice" },
  { href: "/saved", label: "Saved Resumes", description: "Library" },
];

function linkActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/profile") return pathname === "/profile";
  if (href === "/resume") return pathname === "/resume";
  if (href === "/resume/edit") return pathname === "/resume/edit";
  if (href === "/interview") return pathname === "/interview";
  if (href === "/interview/voice") return pathname === "/interview/voice";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar() {
  const pathname = usePathname() || "/";
  const userName = useAppStore((s) => s.userProfile.name);
  const initial = userName.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <aside className="sticky top-0 z-40 hidden min-h-0 w-[min(100%,17rem)] shrink-0 flex-col bg-ca-low md:flex md:h-full lg:w-56">
      <div className="shrink-0 bg-ca-surface px-5 pb-5 pt-6">
        <p className="font-label text-[10px] font-semibold uppercase tracking-[0.22em] text-ca-muted">
          Resume Studio
        </p>
        <p className="font-display mt-1.5 text-xs font-semibold leading-snug tracking-tight text-ca-ink">
          The Curated Architect
        </p>
      </div>

      <nav
        className="ca-rail-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-2"
        aria-label="Primary"
      >
        {items.map((item) => {
          const active = linkActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-ca border-l-[3px] text-left transition-all duration-200 ease-out ${
                active
                  ? "border-l-ca-primary bg-ca-lowest shadow-ca-ambient"
                  : "border-l-transparent hover:border-l-ca-ink/[0.08] hover:bg-ca-highest/50"
              }`}
            >
              <span className="block px-3 py-2.5">
                <span
                  className={`font-display block text-sm font-semibold transition-colors ${
                    active ? "text-ca-ink" : "text-ca-ink/85"
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`font-label mt-0.5 block text-[11px] transition-colors ${
                    active ? "text-ca-muted" : "text-ca-muted/90"
                  }`}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}

        <div className="mt-auto shrink-0 pt-4">
          <Link
            href="/about"
            className="font-label block rounded-ca px-3 py-2.5 text-xs font-medium text-ca-muted transition-colors hover:bg-ca-surface/90 hover:text-ca-ink"
          >
            Platform overview
          </Link>
        </div>
      </nav>

      <div className="shrink-0 bg-ca-surface/80 px-4 py-4">
        <div className="flex items-center gap-3 rounded-ca bg-ca-lowest/90 px-3 py-2.5 shadow-ca ring-1 ring-ca-ink/[0.05]">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-ca bg-ca-primary-soft text-sm font-bold text-ca-primary-ink shadow-inner"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-label truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-ca-muted">
              Active profile
            </p>
            <p className="truncate text-sm font-semibold text-ca-ink">{userName}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
