/** Strip characters that could become HTML; keep plain text ATS-safe. */
export function sanitizePlainText(s: string): string {
  return s.replace(/[<>]/g, "").replace(/\u0000/g, "");
}
