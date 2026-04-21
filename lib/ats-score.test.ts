import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateAdvancedATSScore, resumeToPlainText } from "./ats-score";
import type { OptimizedResume } from "./types";

const sampleResume: OptimizedResume = {
  name: "Test User",
  title: "Engineer",
  summary:
    "Built scalable services with React, TypeScript, Node.js, and PostgreSQL.",
  skills: ["TypeScript", "React", "Node.js"],
  experience: [
    {
      company: "Acme",
      role: "Developer",
      duration: "2020–2024",
      points: [
        "Implemented REST APIs with Node.js",
        "Shipped React dashboards used by 10k users",
      ],
    },
  ],
  projects: [{ name: "P1", description: "Full-stack app with MongoDB" }],
};

describe("resumeToPlainText", () => {
  it("concatenates resume fields lowercased", () => {
    const t = resumeToPlainText(sampleResume);
    expect(t).toContain("typescript");
    expect(t).toContain("acme");
  });
});

describe("calculateAdvancedATSScore", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("no ollama in test"))
    );
  });

  it("returns bounded scores when embeddings unavailable", async () => {
    const jd =
      "Looking for TypeScript React Node developer with PostgreSQL experience.";
    const r = await calculateAdvancedATSScore(sampleResume, jd);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.keywordScore).toBeGreaterThanOrEqual(0);
    expect(r.breakdown.keywordMatch).toBe(r.keywordScore);
    expect(r.breakdown.semantic).toBe(r.semanticScore);
    expect(r.breakdown.skills).toBe(r.skillsScore);
    expect(r.matchedKeywords.length + r.missingKeywords.length).toBeGreaterThan(
      0
    );
  });
});
