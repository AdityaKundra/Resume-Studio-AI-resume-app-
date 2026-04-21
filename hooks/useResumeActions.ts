"use client";

import { useCallback, useRef } from "react";
import {
  jobDescriptionLengthError,
} from "@/lib/job-description";
import { loadUserVersions, saveUserVersion } from "@/lib/persistence";
import { deriveJobTitle } from "@/lib/resume-versions";
import { useAppStore } from "@/store/useAppStore";
import type {
  GenerateResumeResponseBody,
  ImproveResumeResponseBody,
  JobDescriptionAnalysis,
  SavedResumeVersion,
} from "@/lib/types";

export function useResumeActions() {
  const bumpVersions = useAppStore((s) => s.bumpVersions);
  const generateTimersRef = useRef<number[]>([]);

  const clearGenerateTimers = useCallback(() => {
    generateTimersRef.current.forEach(clearTimeout);
    generateTimersRef.current = [];
  }, []);

  const fetchJobFromUrl = useCallback(async () => {
    const s = useAppStore.getState();
    const u = s.jobUrl.trim();
    if (!u) {
      s.setFetchJdError("Enter a job posting URL first.");
      return;
    }
    s.setFetchJdError(null);
    s.setFetchJdLoading(true);
    try {
      const res = await fetch("/api/fetch-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const data = (await res.json()) as
        | { jobDescription: string }
        | { error?: string };
      if (!res.ok) {
        useAppStore.getState().setFetchJdError(
          "error" in data && data.error
            ? data.error
            : `Fetch failed (${res.status}). Paste the JD manually if extraction fails.`
        );
        return;
      }
      if (!("jobDescription" in data) || typeof data.jobDescription !== "string") {
        useAppStore.getState().setFetchJdError(
          "Unexpected response. Paste the job description manually."
        );
        return;
      }
      const st = useAppStore.getState();
      st.setJobDescription(data.jobDescription);
      st.setJdAnalysis(null);
      st.setAnalyzeError(null);
      st.setToast("Job description loaded from URL — review and edit if needed.");
    } catch {
      useAppStore.getState().setFetchJdError(
        "Network error. Paste the job description manually if extraction fails."
      );
    } finally {
      useAppStore.getState().setFetchJdLoading(false);
    }
  }, []);

  const analyzeJd = useCallback(async () => {
    const s = useAppStore.getState();
    const jd = s.jobDescription.trim();
    if (!jd) {
      s.setAnalyzeError("Paste a job description first.");
      return;
    }
    const lenErr = jobDescriptionLengthError(jd);
    if (lenErr) {
      s.setAnalyzeError(lenErr);
      return;
    }
    s.setAnalyzeError(null);
    s.setAnalyzeLoading(true);
    s.setJdAnalysis(null);
    try {
      const res = await fetch("/api/analyze-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jd,
          userProfile: s.userProfile,
        }),
      });
      const data = (await res.json()) as
        | JobDescriptionAnalysis
        | { error?: string };
      if (!res.ok) {
        useAppStore.getState().setAnalyzeError(
          "error" in data && data.error
            ? data.error
            : `Analysis failed (${res.status})`
        );
        return;
      }
      if ("requiredSkills" in data) {
        useAppStore.getState().setJdAnalysis(data);
        useAppStore.getState().setToast(
          "Posting insights updated — open the ATS dashboard to review."
        );
      } else {
        useAppStore.getState().setAnalyzeError("Unexpected analysis response.");
      }
    } catch {
      useAppStore.getState().setAnalyzeError("Network error during analysis.");
    } finally {
      useAppStore.getState().setAnalyzeLoading(false);
    }
  }, []);

  const handleGenerate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const st = useAppStore.getState();
      st.setError(null);

      const jd = st.jobDescription.trim();
      const lenErr = jobDescriptionLengthError(jd);
      if (lenErr) {
        st.setError(lenErr);
        return;
      }

      st.setLoading(true);
      try {
        const cur = useAppStore.getState();
        const res = await fetch("/api/generate-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobDescription: cur.jobDescription,
            userProfile: cur.userProfile,
            skipPdf: cur.skipPdf,
            skipAdvancedAts: cur.skipAdvancedAts,
          }),
        });
        const data = (await res.json()) as
          | GenerateResumeResponseBody
          | { error?: string };

        if (!res.ok) {
          useAppStore.getState().setError(
            "error" in data && data.error
              ? data.error
              : `Request failed (${res.status})`
          );
          return;
        }

        if (!("resume" in data) || !("advancedAts" in data)) {
          useAppStore.getState().setError("Unexpected response from server.");
          return;
        }

        useAppStore.getState().setResult({
          ...data,
          pdfBase64:
            "pdfBase64" in data && typeof data.pdfBase64 === "string"
              ? data.pdfBase64
              : "",
        });
        const snap = useAppStore.getState();
        void saveUserVersion({
          jobTitle: deriveJobTitle(snap.jobDescription),
          resumeData: data.resume,
          atsScore: data.atsMatchScore,
          advancedAts: data.advancedAts,
          jobDescription: snap.jobDescription.trim(),
        });
        bumpVersions();
        useAppStore.getState().setToast(
          snap.skipAdvancedAts
            ? "Resume generated — ATS scoring was skipped; see the ATS dashboard."
            : "Resume generated — review the builder and ATS dashboard."
        );
      } catch {
        useAppStore.getState().setError("Network error. Is the dev server running?");
      } finally {
        useAppStore.getState().setLoading(false);
      }
    },
    [bumpVersions]
  );

  const improveResume = useCallback(async () => {
    const s = useAppStore.getState();
    if (!s.result) return;
    const jd = s.jobDescription.trim();
    if (!jd) {
      s.setError("Job description is required to improve the resume.");
      return;
    }
    const lenErr = jobDescriptionLengthError(jd);
    if (lenErr) {
      s.setError(lenErr);
      return;
    }
    s.setError(null);
    s.setImproveLoading(true);
    try {
      const cur = useAppStore.getState();
      if (!cur.result) return;
      const res = await fetch("/api/improve-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData: cur.result.resume,
          jobDescription: jd,
          missingKeywords: cur.result.advancedAts.missingKeywords,
          userProfile: cur.userProfile,
        }),
      });
      const data = (await res.json()) as
        | ImproveResumeResponseBody
        | { error?: string };

      if (!res.ok) {
        useAppStore.getState().setError(
          "error" in data && data.error
            ? data.error
            : `Improve failed (${res.status})`
        );
        return;
      }

      if (!("resume" in data) || !("advancedAts" in data)) {
        useAppStore.getState().setError("Unexpected improve response.");
        return;
      }

      const next: GenerateResumeResponseBody = {
        resume: data.resume,
        pdfBase64: data.pdfBase64,
        atsMatchScore: data.atsMatchScore,
        advancedAts: data.advancedAts,
      };
      useAppStore.getState().setResult(next);
      void saveUserVersion({
        jobTitle: `${deriveJobTitle(useAppStore.getState().jobDescription)} (improved)`,
        resumeData: next.resume,
        atsScore: next.atsMatchScore,
        advancedAts: next.advancedAts,
        jobDescription: jd,
      });
      bumpVersions();
      useAppStore.getState().setToast("Resume improved — ATS scores refreshed.");
    } catch {
      useAppStore.getState().setError("Network error while improving resume.");
    } finally {
      useAppStore.getState().setImproveLoading(false);
    }
  }, [bumpVersions]);

  const downloadPdf = useCallback(async () => {
    const s = useAppStore.getState();
    if (!s.result) return;
    let b64 = s.result.pdfBase64;
    if (!b64) {
      s.setPdfLoading(true);
      try {
        const cur = useAppStore.getState();
        const res = await fetch("/api/render-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeData: cur.result!.resume,
            userProfile: cur.userProfile,
          }),
        });
        const data = (await res.json()) as {
          pdfBase64?: string;
          error?: string;
        };
        if (!res.ok || !data.pdfBase64) {
          useAppStore.getState().setError(data.error ?? "Could not render PDF.");
          return;
        }
        b64 = data.pdfBase64;
        const prev = useAppStore.getState().result;
        if (prev) {
          useAppStore.getState().setResult({ ...prev, pdfBase64: b64 });
        }
      } catch {
        useAppStore.getState().setError("Network error while rendering PDF.");
        return;
      } finally {
        useAppStore.getState().setPdfLoading(false);
      }
    }
    const r = useAppStore.getState().result!;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.resume.name.replace(/\s+/g, "_") || "resume"}_resume.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    useAppStore.getState().setToast("PDF download started.");
  }, []);

  const fallbackAts = (score: number) => ({
    score,
    breakdown: {
      keywordMatch: score,
      semantic: score,
      skills: score,
      sections: score,
      formatting: score,
    },
    keywordScore: score,
    semanticScore: score,
    skillsScore: score,
    sectionScore: score,
    formattingScore: score,
    matchedKeywords: [] as string[],
    missingKeywords: [] as string[],
    suggestions: [
      "Re-run Analyze posting or Generate Resume to refresh the full ATS breakdown for this JD.",
    ],
  });

  const loadVersion = useCallback(async (v: SavedResumeVersion) => {
    useAppStore.getState().setError(null);
    if (v.jobDescription) useAppStore.getState().setJobDescription(v.jobDescription);
    useAppStore.getState().setResult({
      resume: v.resumeData,
      pdfBase64: "",
      atsMatchScore: v.atsScore,
      advancedAts: v.advancedAts ?? fallbackAts(v.atsScore),
    });
    useAppStore.getState().setPdfLoading(true);
    try {
      const cur = useAppStore.getState();
      const res = await fetch("/api/render-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData: v.resumeData,
          userProfile: cur.userProfile,
        }),
      });
      const data = (await res.json()) as { pdfBase64?: string; error?: string };
      if (!res.ok || !data.pdfBase64) {
        useAppStore.getState().setError(
          data.error ?? "Could not rebuild PDF for this version."
        );
        return;
      }
      const prev = useAppStore.getState().result;
      if (prev) {
        useAppStore.getState().setResult({
          ...prev,
          pdfBase64: data.pdfBase64 as string,
        });
      }
      useAppStore.getState().setToast("Saved version loaded with fresh PDF.");
    } catch {
      useAppStore.getState().setError("Network error while rebuilding PDF.");
    } finally {
      useAppStore.getState().setPdfLoading(false);
    }
  }, []);

  const loadVersionById = useCallback(async (resumeId: string) => {
    const versions = await loadUserVersions();
    const v = versions.find((x) => x.id === resumeId);
    if (v) await loadVersion(v);
    else useAppStore.getState().setToast("Saved resume not found — it may have been removed.");
  }, [loadVersion]);

  return {
    fetchJobFromUrl,
    analyzeJd,
    handleGenerate,
    improveResume,
    downloadPdf,
    loadVersion,
    loadVersionById,
    clearGenerateTimers,
    generateTimersRef,
  };
}

export async function hydrateUserProfileIntoStore(): Promise<void> {
  const { loadUserProfile } = await import("@/lib/persistence");
  const stored = await loadUserProfile();
  if (stored) useAppStore.getState().setUserProfile(stored);
}
