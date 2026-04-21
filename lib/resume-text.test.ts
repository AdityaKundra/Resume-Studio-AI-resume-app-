import { describe, expect, it } from "vitest";
import { sanitizePlainText } from "./resume-text";

describe("sanitizePlainText", () => {
  it("removes angle brackets", () => {
    expect(sanitizePlainText('Hello <script>alert(1)</script>')).toBe(
      "Hello scriptalert(1)/script"
    );
  });

  it("removes null bytes", () => {
    expect(sanitizePlainText("a\u0000b")).toBe("ab");
  });
});
