import { NextResponse } from "next/server";
import { generateInterviewPrep } from "@/lib/interview-prep";
import { jobDescriptionLengthError } from "@/lib/job-description";
import { logger } from "@/lib/logger";
import { normalizeOptimizedResume } from "@/lib/resume-json";
import type { OptimizedResume } from "@/lib/types";

export const maxDuration = 300;

type Body = {
  jobDescription?: string;
  resumeData?: unknown;
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

  let resumeData: OptimizedResume;
  try {
    resumeData = normalizeOptimizedResume(body.resumeData);
  } catch {
    return NextResponse.json(
      { error: "resumeData must be a valid resume object" },
      { status: 400 }
    );
  }

  try {
    const payload = await generateInterviewPrep(jobDescription, resumeData);
    logger.timing("interview-prep", Date.now() - started, {
      provider: process.env.AI_PROVIDER || "ollama",
    });
    return NextResponse.json(payload);
  } catch (err) {
    logger.error("interview-prep failed", err);
    const message =
      err instanceof Error ? err.message : "Interview prep generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
