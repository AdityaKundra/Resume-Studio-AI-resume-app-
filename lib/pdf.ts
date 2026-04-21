import fs from "node:fs";
import type { Browser } from "puppeteer";
import puppeteer from "puppeteer";

const args = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
];

/**
 * Prefer env, then OS Chrome/Chromium, then Puppeteer's downloaded browser.
 */
async function launchBrowser(): Promise<Browser> {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    return puppeteer.launch({
      headless: true,
      executablePath: fromEnv,
      args,
    });
  }

  const candidates: string[] = [];
  if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    );
  } else if (process.platform === "win32") {
    candidates.push(
      "C:\\Program Files\\Google Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google Chrome\\Application\\chrome.exe"
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium"
    );
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return puppeteer.launch({
        headless: true,
        executablePath: p,
        args,
      });
    }
  }

  try {
    return await puppeteer.launch({
      headless: true,
      channel: "chrome",
      args,
    });
  } catch {
    // Fall through to bundled Chromium (requires `npx puppeteer browsers install chrome`).
  }

  return puppeteer.launch({
    headless: true,
    args,
  });
}

/** Reuse one browser per process — avoids ~5–20s Chrome launch per PDF. */
let sharedBrowser: Browser | null = null;
let sharedBrowserPromise: Promise<Browser> | null = null;

async function acquireBrowser(): Promise<Browser> {
  if (sharedBrowser?.connected) {
    return sharedBrowser;
  }
  sharedBrowser = null;
  if (!sharedBrowserPromise) {
    sharedBrowserPromise = launchBrowser()
      .then((b) => {
        sharedBrowser = b;
        b.on("disconnected", () => {
          sharedBrowser = null;
          sharedBrowserPromise = null;
        });
        return b;
      })
      .catch((e) => {
        sharedBrowserPromise = null;
        throw e;
      });
  }
  return sharedBrowserPromise;
}

/**
 * Renders HTML to a PDF buffer (A4, print margins).
 * Uses a shared browser instance and `load` (not `networkidle0`) for static HTML.
 */
export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  let browser: Browser;
  try {
    browser = await acquireBrowser();
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(
      [
        "Could not launch a browser for PDF export.",
        hint,
        "",
        "Fix one of:",
        "1. Install Google Chrome, or set PUPPETEER_EXECUTABLE_PATH to your Chrome/Chromium binary.",
        "2. Run: npx puppeteer browsers install chrome",
        "See https://pptr.dev/guides/configuration",
      ].join("\n")
    );
  }

  const page = await browser.newPage();
  try {
    // Static inline HTML — no network; "load" is much faster than networkidle0.
    await page.setContent(html, {
      waitUntil: "load",
      timeout: 45_000,
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "12mm",
        bottom: "12mm",
        left: "12mm",
      },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => {});
  }
}
