"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { DashboardSidebar } from "@/components/shell/DashboardSidebar";
import { DashboardTopNav } from "@/components/shell/DashboardTopNav";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { hydrateUserProfileIntoStore } from "@/hooks/useResumeActions";
import { useAppStore } from "@/store/useAppStore";

type Props = {
  children: ReactNode;
};

export function DashboardShell({ children }: Props) {
  const toast = useAppStore((s) => s.toast);
  const setToast = useAppStore((s) => s.setToast);
  const jobDescription = useAppStore((s) => s.jobDescription);
  const jdAnalysis = useAppStore((s) => s.jdAnalysis);
  const analyzeLoading = useAppStore((s) => s.analyzeLoading);
  const result = useAppStore((s) => s.result);
  const pdfLoading = useAppStore((s) => s.pdfLoading);

  const jdChars = jobDescription.length;
  const analyzeReady = Boolean(jdAnalysis) && !analyzeLoading;
  const resumeReady = Boolean(result);

  useEffect(() => {
    void hydrateUserProfileIntoStore();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast, setToast]);

  return (
    <div className="ca-canvas-bg min-h-0 text-ca-ink">
      {toast && (
        <div
          className="ca-animate-in fixed bottom-4 left-1/2 z-50 max-w-[min(100vw-2rem,28rem)] -translate-x-1/2 rounded-ca bg-ca-lowest/95 px-4 py-3.5 text-sm font-medium text-ca-ink shadow-ca-ambient ring-1 ring-ca-primary/20 backdrop-blur-md sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      <AppShell
        sidebar={<DashboardSidebar />}
        topNav={
          <DashboardTopNav
            statusBadges={
              <>
                <StatusBadge
                  label="Posting"
                  value={jdChars ? `${jdChars} chars` : "Empty"}
                  active={jdChars > 80}
                />
                <StatusBadge
                  label="Insights"
                  value={analyzeReady ? "Ready" : analyzeLoading ? "…" : "—"}
                  active={analyzeReady}
                  variant={analyzeReady ? "success" : "default"}
                />
                <StatusBadge
                  label="Resume"
                  value={
                    result
                      ? `ATS ${result.atsMatchScore}`
                      : pdfLoading
                        ? "PDF…"
                        : "—"
                  }
                  active={resumeReady}
                  variant={resumeReady ? "success" : "default"}
                />
              </>
            }
          />
        }
        footer={
          <footer className="border-t border-ca-ink/[0.05] bg-gradient-to-t from-ca-surface to-ca-low/30 py-5 text-center">
            <p className="font-label text-[10px] uppercase tracking-[0.28em] text-ca-muted/90">
              Built with the Curated Architect engine
            </p>
          </footer>
        }
      >
        <div className="relative z-[1] mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
          {children}
        </div>
      </AppShell>
    </div>
  );
}
