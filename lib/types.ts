export interface ResumeExperience {
  company: string;
  role: string;
  duration: string;
  points: string[];
}

export interface ResumeProject {
  name: string;
  description: string;
}

export interface OptimizedResume {
  name: string;
  title: string;
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
}

/** Raw sub-scores (0–100 each) before weighting into the composite. */
export interface ATSBreakdown {
  keywordMatch: number;
  semantic: number;
  skills: number;
  sections: number;
  formatting: number;
}

/** Multi-dimensional ATS breakdown (0–100 overall). */
export interface AdvancedATSResult {
  score: number;
  breakdown: ATSBreakdown;
  keywordScore: number;
  semanticScore: number;
  /** JD tools/core coverage in the skills section (0–100). */
  skillsScore: number;
  sectionScore: number;
  formattingScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  /** Extra points when keywords appear in both skills and experience (0–5). */
  placementBonus?: number;
}

export interface GenerateResumeResponseBody {
  resume: OptimizedResume;
  pdfBase64: string;
  /** Overall ATS score; same as `advancedAts.score` for backward compatibility. */
  atsMatchScore: number;
  advancedAts: AdvancedATSResult;
}

export interface ImproveResumeResponseBody {
  resume: OptimizedResume;
  pdfBase64: string;
  atsMatchScore: number;
  advancedAts: AdvancedATSResult;
}

export interface JobDescriptionAnalysis {
  requiredSkills: string[];
  tools: string[];
  seniorityLevel: string;
  keyResponsibilities: string[];
  missingFromUserProfile: string[];
}

export type AiProviderId = "ollama" | "openai" | "gemini";

export interface SavedResumeVersion {
  id: string;
  timestamp: number;
  jobTitle: string;
  resumeData: OptimizedResume;
  atsScore: number;
  advancedAts?: AdvancedATSResult;
  jobDescription?: string;
}

export interface InterviewPrepTopics {
  frontend: string[];
  backend: string[];
  devops: string[];
  systemDesign: string[];
  ai: string[];
}

/** Question plus hints for what a strong answer should cover (no model chain-of-thought). */
export interface InterviewQuestionItem {
  question: string;
  expectedTopics: string[];
}

export interface InterviewPrepQuestions {
  /** STAR / situational questions tied to JD themes (ownership, collaboration, ambiguity). */
  behavioral: InterviewQuestionItem[];
  /** Questions an interviewer might ask about bullets on *this* resume for *this* role. */
  resumeDeepDive: InterviewQuestionItem[];
  easy: InterviewQuestionItem[];
  medium: InterviewQuestionItem[];
  hard: InterviewQuestionItem[];
}

export interface InterviewPrepPlanDay {
  day: number;
  /** One-line theme for the day, explicitly tied to the posting or gaps. */
  focus: string;
  topics: string[];
}

/** Core model output for interview preparation. */
export interface InterviewPrepResult {
  role: string;
  topics: InterviewPrepTopics;
  questions: InterviewPrepQuestions;
  systemDesign: string[];
  gaps: string[];
  prepPlan: InterviewPrepPlanDay[];
}

/** API payload includes derived weak-area hints for the UI. */
export interface InterviewPrepResponse extends InterviewPrepResult {
  weakAreas: string[];
}

/** AI evaluation of a spoken/written interview answer (0–10 scale). */
export interface AnswerEvaluationResult {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestedAnswer: string;
}
