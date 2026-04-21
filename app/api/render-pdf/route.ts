import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { htmlToPdfBuffer } from "@/lib/pdf";
import { normalizeOptimizedResume } from "@/lib/resume-json";
import { STATIC_USER_PROFILE } from "@/lib/static-profile";
import { buildResumeHtml } from "@/lib/template";
import { tryParseUserProfile } from "@/lib/user-profile";
import type { OptimizedResume } from "@/lib/types";

export const maxDuration = 120;

type Body = {
  resumeData?: unknown;
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

  let resume: OptimizedResume;
  try {
    resume = normalizeOptimizedResume(body.resumeData);
  } catch {
    return NextResponse.json(
      { error: "resumeData must be a valid resume object" },
      { status: 400 }
    );
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
    const html = buildResumeHtml(resume, {
      contact: profile.contact,
      education: profile.education,
    });
    const pdfBuffer = await htmlToPdfBuffer(html);
    logger.timing("render-pdf", Date.now() - started);
    return NextResponse.json({
      pdfBase64: pdfBuffer.toString("base64"),
    });
  } catch (err) {
    logger.error("render-pdf failed", err);
    const message = err instanceof Error ? err.message : "PDF render failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
