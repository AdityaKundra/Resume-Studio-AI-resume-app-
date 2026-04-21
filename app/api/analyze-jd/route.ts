import { NextResponse } from "next/server";
import { analyzeJobDescription } from "@/lib/jd-analyzer";
import { jobDescriptionLengthError } from "@/lib/job-description";
import { logger } from "@/lib/logger";
import { STATIC_USER_PROFILE } from "@/lib/static-profile";
import { tryParseUserProfile } from "@/lib/user-profile";

type Body = {
  jobDescription?: string;
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

  try {
    const analysis = analyzeJobDescription(jobDescription, profile);
    logger.timing("analyze-jd", Date.now() - started);
    return NextResponse.json(analysis);
  } catch (err) {
    logger.error("analyze-jd failed", err);
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
