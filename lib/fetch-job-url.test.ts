import { describe, expect, it } from "vitest";
import {
  cleanExtractedJobText,
  extractJobDescriptionFromHtml,
  validatePublicJobUrl,
} from "./fetch-job-url";

describe("validatePublicJobUrl", () => {
  it("accepts https public URLs", () => {
    const r = validatePublicJobUrl("https://example.com/jobs/123");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.href).toContain("example.com");
  });

  it("rejects non-http(s)", () => {
    expect(validatePublicJobUrl("ftp://x.com").ok).toBe(false);
  });

  it("rejects localhost", () => {
    expect(validatePublicJobUrl("http://localhost:3000").ok).toBe(false);
  });

  it("rejects private IPv4", () => {
    expect(validatePublicJobUrl("http://192.168.1.1/").ok).toBe(false);
    expect(validatePublicJobUrl("http://10.0.0.1/").ok).toBe(false);
  });

  it("rejects URLs with credentials", () => {
    expect(validatePublicJobUrl("https://user:pass@example.com").ok).toBe(false);
  });
});

describe("cleanExtractedJobText", () => {
  it("collapses whitespace", () => {
    expect(cleanExtractedJobText("  a  \n\n  b  ")).toBe("a\n\nb");
  });
});

describe("extractJobDescriptionFromHtml", () => {
  it("prefers description-like regions", () => {
    const html = `
      <html><body>
        <nav>Home</nav>
        <div class="job-description"><p>${"We need a strong engineer. ".repeat(20)}</p></div>
        <footer>Legal</footer>
      </body></html>`;
    const t = extractJobDescriptionFromHtml(html);
    expect(t.length).toBeGreaterThan(100);
    expect(t.toLowerCase()).toContain("engineer");
  });

  it("falls back to body text", () => {
    const html =
      "<html><body><p>" +
      "Role overview: build APIs and ship features. ".repeat(15) +
      "</p></body></html>";
    const t = extractJobDescriptionFromHtml(html);
    expect(t.length).toBeGreaterThan(80);
  });
});
