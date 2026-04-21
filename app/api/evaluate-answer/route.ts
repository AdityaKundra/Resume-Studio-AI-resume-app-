import { NextResponse } from "next/server";
import { evaluateInterviewAnswer } from "@/lib/evaluate-answer";
import { jobDescriptionLengthError } from "@/lib/job-description";
import { logger } from "@/lib/logger";

export const maxDuration = 120;

type Body = {
  question?: string;
  answer?: string;
  jobDescription?: string;
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

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  const jobDescription =
    typeof body.jobDescription === "string" ? body.jobDescription.trim() : "";

  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }
  if (!answer) {
    return NextResponse.json({ error: "answer is required" }, { status: 400 });
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
    const result = await evaluateInterviewAnswer({
      question,
      answer,
      jobDescription,
    });
    logger.timing("evaluate-answer", Date.now() - started, {
      provider: process.env.AI_PROVIDER || "ollama",
    });
    return NextResponse.json(result);
  } catch (err) {
    logger.error("evaluate-answer failed", err);
    const message =
      err instanceof Error ? err.message : "Evaluation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
