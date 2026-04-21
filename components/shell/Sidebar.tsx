import Link from "next/link";
import type { AppStage, JdSidebarFocus, SidebarNavId } from "./types";

type Props = {
  userName: string;
  stage: AppStage;
  /** When on the job-description stage, which sidebar row is active: Workspace vs Saved. */
  jdFocus: JdSidebarFocus;
  onGo: (nav: SidebarNavId) => void;
};

const items: { id: SidebarNavId; label: string; description: string }[] = [
  {
    id: "workspace",
    label: "Workspace",
    description: "Job description & generate",
  },
  { id: "ats", label: "ATS", description: "Insights & fit" },
  { id: "interview", label: "Interview prep", description: "Practice & voice" },
  { id: "saved", label: "Saved resumes", description: "Library" },
];

function isActive(
  id: SidebarNavId,
  stage: AppStage,
  jdFocus: JdSidebarFocus
): boolean {
  if (id === "workspace") return stage === "jd" && jdFocus === "workspace";
  if (id === "saved") return stage === "jd" && jdFocus === "saved";
  if (id === "ats") return stage === "ats";
  if (id === "interview") return stage === "interview";
  return false;
}

export function Sidebar({ userName, stage, jdFocus, onGo }: Props) {
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
          const active = isActive(item.id, stage, jdFocus);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onGo(item.id)}
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
            </button>
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
