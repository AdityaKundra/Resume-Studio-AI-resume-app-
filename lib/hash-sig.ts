/**
 * SHA-256 hex digest — works in browser (Web Crypto) and Node (crypto).
 */
export async function sha256Hex(input: string): Promise<string> {
  if (typeof window === "undefined") {
    const { createHash } = await import("crypto");
    return createHash("sha256").update(input, "utf8").digest("hex");
  }
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
