import { describe, expect, it } from "vitest";
import { STATIC_USER_PROFILE } from "./static-profile";
import { analyzeJobDescription } from "./jd-analyzer";

describe("analyzeJobDescription", () => {
  it("detects skills and tools from JD text", () => {
    const jd = `
      Senior React engineer with TypeScript, Node.js, AWS, Docker, and Kubernetes.
      You will build REST APIs and use PostgreSQL.
    `;
    const a = analyzeJobDescription(jd, STATIC_USER_PROFILE);
    expect(a.requiredSkills).toContain("React");
    expect(a.requiredSkills).toContain("TypeScript");
    expect(a.tools).toContain("Docker");
    expect(a.tools).toContain("Kubernetes");
    expect(a.seniorityLevel).toMatch(/Senior/i);
  });

  it("returns empty missingFromUserProfile without profile", () => {
    const a = analyzeJobDescription("We need Python and Rust.");
    expect(a.missingFromUserProfile).toEqual([]);
  });

  it("computes gaps vs profile when profile passed", () => {
    const jd = "Must have Kotlin and Swift on day one.";
    const a = analyzeJobDescription(jd, STATIC_USER_PROFILE);
    expect(a.missingFromUserProfile).toContain("Kotlin");
    expect(a.missingFromUserProfile).toContain("Swift");
  });
});
