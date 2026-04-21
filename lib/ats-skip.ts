import type { AdvancedATSResult } from "./types";

/** Placeholder when `skipAdvancedAts` is used on generate-resume. */
export function skippedAdvancedAts(): AdvancedATSResult {
  return {
    score: 0,
    breakdown: {
      keywordMatch: 0,
      semantic: 0,
      skills: 0,
      sections: 0,
      formatting: 0,
    },
    keywordScore: 0,
    semanticScore: 0,
    skillsScore: 0,
    sectionScore: 0,
    formattingScore: 0,
    matchedKeywords: [],
    missingKeywords: [],
    suggestions: [
      "Advanced ATS scoring was skipped for this run. Generate again without “Skip ATS scoring” for a full breakdown, or use Analyze posting for JD signals.",
    ],
    placementBonus: 0,
  };
}
