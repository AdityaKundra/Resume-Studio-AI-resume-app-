import { NextResponse } from "next/server";
import { calculateAdvancedATSScore } from "@/lib/ats-score";
import { improveResume } from "@/lib/ai-provider";
import { jobDescriptionLengthError } from "@/lib/job-description";
import { logger } from "@/lib/logger";
import { htmlToPdfBuffer } from "@/lib/pdf";
import { normalizeOptimizedResume } from "@/lib/resume-json";
import { STATIC_USER_PROFILE } from "@/lib/static-profile";
import { buildResumeHtml } from "@/lib/template";
import { tryParseUserProfile } from "@/lib/user-profile";
import type { ImproveResumeResponseBody, OptimizedResume } from "@/lib/types";

export const maxDuration = 300;

type Body = {
  resumeData?: unknown;
  jobDescription?: string;
  missingKeywords?: unknown;
  userProfile?: unknown;
};

export async function POST(request: Request) {
  const started = Date.now();
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const jobDescription =
    typeof body.jobDescription === "string" ? body.jobDescription.trim() : "";
  if (!jobDescription) {
    return NextResponse.json(
      { error: "jobDescription is required" },
      { status: 400 }
    );
  }

  const jdLenErr = jobDescriptionLengthError(jobDescription);
  if (jdLenErr) {
    return NextResponse.json({ error: jdLenErr }, { status: 400 });
  }

  let profile = STATIC_USER_PROFILE;
  if (body.userProfile !== undefined) {
    const parsed = tryParseUserProfile(body.userProfile);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    profile = parsed.profile;
  }

  let resumeData: OptimizedResume;
  try {
    resumeData = normalizeOptimizedResume(body.resumeData);
  } catch {
    return NextResponse.json(
      { error: "resumeData must be a valid resume object" },
      { status: 400 }
    );
  }

  const missingKeywords = Array.isArray(body.missingKeywords)
    ? body.missingKeywords.map((k) => String(k).trim()).filter(Boolean)
    : [];

  try {
    const resume = await improveResume({
      resumeData,
      jobDescription,
      missingKeywords,
      userDataForLexicon: profile,
    });
    const html = buildResumeHtml(resume, {
      contact: profile.contact,
      education: profile.education,
    });
    const [pdfBuffer, advancedAts] = await Promise.all([
      htmlToPdfBuffer(html),
      calculateAdvancedATSScore(resume, jobDescription),
    ]);
    logger.timing("improve-resume", Date.now() - started, {
      provider: process.env.AI_PROVIDER || "ollama",
    });
    logger.recordAts({
      score: advancedAts.score,
      keywordScore: advancedAts.keywordScore,
      semanticScore: advancedAts.semanticScore,
      sectionScore: advancedAts.sectionScore,
      formattingScore: advancedAts.formattingScore,
    });

    const payload: ImproveResumeResponseBody = {
      resume,
      pdfBase64: pdfBuffer.toString("base64"),
      atsMatchScore: advancedAts.score,
      advancedAts,
    };
    return NextResponse.json(payload);
  } catch (err) {
    logger.error("improve-resume failed", err);
    const message = err instanceof Error ? err.message : "Improve failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
