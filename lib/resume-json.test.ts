import { describe, expect, it } from "vitest";
import { normalizeOptimizedResume, parseStructuredJson } from "./resume-json";

describe("parseStructuredJson", () => {
  it("parses raw JSON object text", () => {
    const v = parseStructuredJson('{"a":1}');
    expect(v).toEqual({ a: 1 });
  });

  it("strips markdown fences", () => {
    const v = parseStructuredJson("```json\n{\"name\":\"x\"}\n```");
    expect(v).toEqual({ name: "x" });
  });
});

describe("normalizeOptimizedResume", () => {
  it("fills missing fields with safe defaults", () => {
    const r = normalizeOptimizedResume({
      name: "A",
      title: "T",
      summary: "S",
      skills: ["go"],
      experience: [
        { company: "c", role: "r", duration: "d", points: ["p"] },
      ],
      projects: [{ name: "P", description: "d" }],
    });
    expect(r.name).toBe("A");
    expect(r.experience[0]?.points).toEqual(["p"]);
    expect(r.projects[0]?.description).toBe("d");
  });

  it("throws on non-object", () => {
    expect(() => normalizeOptimizedResume(null)).toThrow();
  });
});
