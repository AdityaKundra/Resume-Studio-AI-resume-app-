import { NextResponse } from "next/server";
import {
  clampJobDescription,
  extractJobDescriptionFromHtml,
  MAX_HTML_CHARS,
  MIN_EXTRACTED_CHARS,
  validatePublicJobUrl,
} from "@/lib/fetch-job-url";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

type Body = {
  url?: string;
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

  const rawUrl = typeof body.url === "string" ? body.url : "";
  const validated = validatePublicJobUrl(rawUrl);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(validated.href, {
      redirect: "follow",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Page returned HTTP ${res.status}. Paste the job description manually if this site blocks fetching.`,
        },
        { status: 502 }
      );
    }

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (
      ct &&
      !ct.includes("text/html") &&
      !ct.includes("application/xhtml") &&
      !ct.includes("text/plain")
    ) {
      return NextResponse.json(
        {
          error:
            "Response is not HTML. Paste the job description manually, or try a different URL.",
        },
        { status: 422 }
      );
    }

    html = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof Error && e.name === "TimeoutError") {
      return NextResponse.json(
        {
          error:
            "Request timed out. Paste the job description manually, or try again.",
        },
        { status: 504 }
      );
    }
    logger.error("fetch-job network error", e);
    return NextResponse.json(
      {
        error: `Could not load URL (${msg}). Many career sites block automated access — paste the JD manually.`,
      },
      { status: 502 }
    );
  }

  if (html.length > MAX_HTML_CHARS) {
    return NextResponse.json(
      { error: "Page is too large to process safely." },
      { status: 413 }
    );
  }

  let jobDescription: string;
  try {
    jobDescription = extractJobDescriptionFromHtml(html);
  } catch (err) {
    logger.error("fetch-job parse failed", err);
    return NextResponse.json(
      {
        error:
          "Could not parse page HTML. Paste the job description manually if extraction fails.",
      },
      { status: 422 }
    );
  }

  jobDescription = clampJobDescription(jobDescription);

  if (jobDescription.length < MIN_EXTRACTED_CHARS) {
    return NextResponse.json(
      {
        error:
          "Could not find enough job text on this page (login walls and bot blocking are common). Paste the job description manually.",
      },
      { status: 422 }
    );
  }

  logger.timing("fetch-job", Date.now() - started);
  return NextResponse.json({ jobDescription });
}
