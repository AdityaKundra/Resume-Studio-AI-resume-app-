import { create } from "zustand";
import type { StaticUserProfile } from "@/lib/static-profile";
import { STATIC_USER_PROFILE } from "@/lib/static-profile";
import type {
  GenerateResumeResponseBody,
  InterviewPrepResponse,
  JobDescriptionAnalysis,
  OptimizedResume,
} from "@/lib/types";

export type AppStoreState = {
  userProfile: StaticUserProfile;
  jobDescription: string;
  jobUrl: string;
  /** Tailored resume JSON (mirrors `result?.resume`). */
  resume: OptimizedResume | null;
  /** Overall ATS score after generate/improve (mirrors `result?.atsMatchScore`). */
  atsScore: number | null;
  /** Full generate/improve payload including PDF + advanced ATS. */
  result: GenerateResumeResponseBody | null;
  jdAnalysis: JobDescriptionAnalysis | null;
  interviewData: InterviewPrepResponse | null;
  loading: boolean;
  improveLoading: boolean;
  analyzeLoading: boolean;
  pdfLoading: boolean;
  fetchJdLoading: boolean;
  error: string | null;
  analyzeError: string | null;
  fetchJdError: string | null;
  toast: string | null;
  skipPdf: boolean;
  skipAdvancedAts: boolean;
  generateStatus: string;
  versionTick: number;
  setUserProfile: (p: StaticUserProfile | ((prev: StaticUserProfile) => StaticUserProfile)) => void;
  setJobDescription: (v: string) => void;
  setJobUrl: (v: string) => void;
  setResult: (r: GenerateResumeResponseBody | null) => void;
  setJdAnalysis: (a: JobDescriptionAnalysis | null) => void;
  setInterviewData: (d: InterviewPrepResponse | null) => void;
  setLoading: (v: boolean) => void;
  setImproveLoading: (v: boolean) => void;
  setAnalyzeLoading: (v: boolean) => void;
  setPdfLoading: (v: boolean) => void;
  setFetchJdLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setAnalyzeError: (e: string | null) => void;
  setFetchJdError: (e: string | null) => void;
  setToast: (t: string | null) => void;
  setSkipPdf: (v: boolean) => void;
  setSkipAdvancedAts: (v: boolean) => void;
  setGenerateStatus: (s: string) => void;
  bumpVersions: () => void;
};

function syncFromResult(
  r: GenerateResumeResponseBody | null
): Pick<AppStoreState, "result" | "resume" | "atsScore"> {
  return {
    result: r,
    resume: r?.resume ?? null,
    atsScore: r != null ? r.atsMatchScore : null,
  };
}

export const useAppStore = create<AppStoreState>((set) => ({
  userProfile: STATIC_USER_PROFILE,
  jobDescription: "",
  jobUrl: "",
  resume: null,
  atsScore: null,
  result: null,
  jdAnalysis: null,
  interviewData: null,
  loading: false,
  improveLoading: false,
  analyzeLoading: false,
  pdfLoading: false,
  fetchJdLoading: false,
  error: null,
  analyzeError: null,
  fetchJdError: null,
  toast: null,
  skipPdf: false,
  skipAdvancedAts: false,
  generateStatus: "",
  versionTick: 0,
  setUserProfile: (p) =>
    set((s) => ({
      userProfile: typeof p === "function" ? p(s.userProfile) : p,
    })),
  setJobDescription: (jobDescription) => set({ jobDescription }),
  setJobUrl: (jobUrl) => set({ jobUrl }),
  setResult: (result) => set(() => syncFromResult(result)),
  setJdAnalysis: (jdAnalysis) => set({ jdAnalysis }),
  setInterviewData: (interviewData) => set({ interviewData }),
  setLoading: (loading) => set({ loading }),
  setImproveLoading: (improveLoading) => set({ improveLoading }),
  setAnalyzeLoading: (analyzeLoading) => set({ analyzeLoading }),
  setPdfLoading: (pdfLoading) => set({ pdfLoading }),
  setFetchJdLoading: (fetchJdLoading) => set({ fetchJdLoading }),
  setError: (error) => set({ error }),
  setAnalyzeError: (analyzeError) => set({ analyzeError }),
  setFetchJdError: (fetchJdError) => set({ fetchJdError }),
  setToast: (toast) => set({ toast }),
  setSkipPdf: (skipPdf) => set({ skipPdf }),
  setSkipAdvancedAts: (skipAdvancedAts) => set({ skipAdvancedAts }),
  setGenerateStatus: (generateStatus) => set({ generateStatus }),
  bumpVersions: () => set((s) => ({ versionTick: s.versionTick + 1 })),
}));
