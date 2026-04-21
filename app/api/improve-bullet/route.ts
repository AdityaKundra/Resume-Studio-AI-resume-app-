import { NextResponse } from "next/server";
import { improveResumeBullet } from "@/lib/ai-provider";
import { jobDescriptionLengthError } from "@/lib/job-description";
import { logger } from "@/lib/logger";

export const maxDuration = 120;

type Body = {
  bullet?: unknown;
  jobDescription?: unknown;
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

  const bullet =
    typeof body.bullet === "string" ? body.bullet.trim() : "";
  const jobDescription =
    typeof body.jobDescription === "string" ? body.jobDescription.trim() : "";

  if (!bullet) {
    return NextResponse.json({ error: "bullet is required" }, { status: 400 });
  }
  if (!jobDescription) {
    return NextResponse.json(
      { error: "jobDescription is required" },
      { status: 400 }
    );
  }

  const jdErr = jobDescriptionLengthError(jobDescription);
  if (jdErr) {
    return NextResponse.json({ error: jdErr }, { status: 400 });
  }

  try {
    const improved = await improveResumeBullet({ bullet, jobDescription });
    logger.timing("improve-bullet", Date.now() - started, {
      provider: process.env.AI_PROVIDER || "ollama",
    });
    return NextResponse.json({ bullet: improved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Improve failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
