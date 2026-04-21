import { load, type CheerioAPI } from "cheerio";
import { JOB_DESCRIPTION_MAX_LENGTH } from "./job-description";

const MIN_EXTRACTED_CHARS = 80;
const MAX_HTML_CHARS = 2_000_000;

/** Collapse whitespace and strip invisible junk from scraped text. */
export function cleanExtractedJobText(raw: string): string {
  let t = raw.replace(/\u00a0/g, " ");
  t = t.replace(/\r\n/g, "\n");
  t = t.replace(/[ \t]+\n/g, "\n");
  t = t.replace(/\n[ \t]+/g, "\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]{2,}/g, " ");
  return t.trim();
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost") return true;
  if (h.endsWith(".localhost")) return true;
  if (h.endsWith(".local")) return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = h.match(ipv4);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  }

  if (h === "[::1]" || h === "::1") return true;
  if (h.startsWith("[fc") || h.startsWith("[fd")) return true; // IPv6 ULA

  return false;
}

export type ValidateJobUrlResult =
  | { ok: true; href: string }
  | { ok: false; error: string };

/**
 * Allow only public http(s) URLs (basic SSRF guard for server-side fetch).
 */
export function validatePublicJobUrl(input: string): ValidateJobUrlResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "url is required" };
  }
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
  if (u.username || u.password) {
    return { ok: false, error: "URL must not contain credentials" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are allowed" };
  }
  if (isBlockedHostname(u.hostname)) {
    return { ok: false, error: "That host is not allowed" };
  }
  return { ok: true, href: u.href };
}

type Block = { len: number; text: string };

function collectBlocks($: CheerioAPI, selector: string, out: Block[]): void {
  $(selector).each((_, el) => {
    const t = cleanExtractedJobText($(el).text());
    if (t.length >= 120) out.push({ len: t.length, text: t });
  });
}

/**
 * Heuristic extraction: prefer rich description containers, else paragraphs, else body.
 */
export function extractJobDescriptionFromHtml(html: string): string {
  const $ = load(html);
  $("script, style, noscript, svg, iframe, template, nav, footer").remove();

  const blocks: Block[] = [];

  collectBlocks(
    $,
    '[class*="description" i], [class*="job-description" i], [class*="jobDescription" i], [class*="job_description" i]',
    blocks
  );
  collectBlocks($, '[id*="description" i], [id*="job-details" i], [id*="jobDescription" i]', blocks);
  collectBlocks($, '[data-testid*="description" i], [data-job*="description" i]', blocks);
  collectBlocks($, "article, [role='article']", blocks);
  collectBlocks($, "main section, main .content, [role='main']", blocks);
  collectBlocks($, "main", blocks);

  if (blocks.length > 0) {
    blocks.sort((a, b) => b.len - a.len);
    let best = blocks[0]!.text;
    if (best.length < 400 && blocks.length > 1) {
      best = blocks
        .slice(0, 4)
        .map((b) => b.text)
        .join("\n\n");
      best = cleanExtractedJobText(best);
    }
    return best;
  }

  const paras: Block[] = [];
  $("p, li").each((_, el) => {
    const t = cleanExtractedJobText($(el).text());
    if (t.length > 45) paras.push({ len: t.length, text: t });
  });
  if (paras.length > 0) {
    paras.sort((a, b) => b.len - a.len);
    return cleanExtractedJobText(
      paras
        .slice(0, 50)
        .map((p) => p.text)
        .join("\n\n")
    );
  }

  return cleanExtractedJobText($("body").text());
}

export function clampJobDescription(text: string): string {
  if (text.length <= JOB_DESCRIPTION_MAX_LENGTH) return text;
  return text.slice(0, JOB_DESCRIPTION_MAX_LENGTH).trim();
}

export { MIN_EXTRACTED_CHARS, MAX_HTML_CHARS };
