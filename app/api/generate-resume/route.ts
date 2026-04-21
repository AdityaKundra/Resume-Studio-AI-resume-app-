import { NextResponse } from "next/server";
import { calculateAdvancedATSScore } from "@/lib/ats-score";
import { skippedAdvancedAts } from "@/lib/ats-skip";
import { generateResume } from "@/lib/ai-provider";
import { jobDescriptionLengthError } from "@/lib/job-description";
import { logger } from "@/lib/logger";
import { htmlToPdfBuffer } from "@/lib/pdf";
import { STATIC_USER_PROFILE } from "@/lib/static-profile";
import { buildResumeHtml } from "@/lib/template";
import { tryParseUserProfile } from "@/lib/user-profile";
import type { GenerateResumeResponseBody } from "@/lib/types";

export const maxDuration = 300;

type Body = {
  jobDescription?: string;
  format?: "json" | "pdf";
  skipPdf?: boolean;
  skipAdvancedAts?: boolean;
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

  const wantPdf = body.format === "pdf";
  const skipPdf = wantPdf ? false : body.skipPdf === true;
  const skipAdvancedAts = body.skipAdvancedAts === true;

  try {
    const resume = await generateResume({
      userData: profile,
      jobDescription,
    });
    const html = buildResumeHtml(resume, {
      contact: profile.contact,
      education: profile.education,
    });
    const [pdfBuffer, advancedAts] = await Promise.all([
      skipPdf
        ? Promise.resolve(Buffer.alloc(0))
        : htmlToPdfBuffer(html),
      skipAdvancedAts
        ? Promise.resolve(skippedAdvancedAts())
        : calculateAdvancedATSScore(resume, jobDescription),
    ]);

    logger.timing("generate-resume", Date.now() - started, {
      provider: process.env.AI_PROVIDER || "ollama",
      skipPdf,
      skipAdvancedAts,
    });
    if (!skipAdvancedAts) {
      logger.recordAts({
        score: advancedAts.score,
        keywordScore: advancedAts.keywordScore,
        semanticScore: advancedAts.semanticScore,
        sectionScore: advancedAts.sectionScore,
        formattingScore: advancedAts.formattingScore,
      });
    }

    if (body.format === "pdf") {
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="resume.pdf"',
        },
      });
    }

    const payload: GenerateResumeResponseBody = {
      resume,
      pdfBase64: skipPdf ? "" : pdfBuffer.toString("base64"),
      atsMatchScore: advancedAts.score,
      advancedAts,
    };

    return NextResponse.json(payload);
  } catch (err) {
    logger.error("generate-resume failed", err);
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
