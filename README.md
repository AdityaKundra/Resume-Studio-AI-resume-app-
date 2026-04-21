# AI Resume Generator (`resume-studio`)

**GitHub repo name:** `resume-studio` (folder and npm package name match).

This repository contains **Resume Studio**, a production-style Next.js application. After `git clone` into `resume-studio`, install dependencies, copy [`.env.example`](.env.example) to `.env.local`, then follow **Setup** below.

Production-style Next.js app (**Resume Studio**) that uses a **local or cloud** LLM to tailor your resume to a job description, renders an ATS-oriented layout, exports **PDF** via Puppeteer, and includes posting analysis, ATS-style scoring, and interview prep.

For a fuller product and flow overview, visit **`/about`** in the app or read **[docs/RESUME_STUDIO_OVERVIEW.md](docs/RESUME_STUDIO_OVERVIEW.md)**.

## Stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **AI**: **Ollama** (default), **OpenAI**, or **Google Gemini** — JSON-mode completions
- **Puppeteer** for HTML → PDF (A4)

## Prerequisites

- Node.js 20+
- For **Ollama**: daemon running; at least one model pulled, e.g. `ollama pull llama3.2`
- Chrome/Chromium for Puppeteer (`npm install` downloads a compatible build)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

   See **Environment variables** below and match [`.env.example`](.env.example).

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Uses **Turbopack** by default. If the app acts stale: **`npm run dev:clean`**.

   Open [http://localhost:3000](http://localhost:3000).

## Usage

1. **Profile**: Open **Profile** in the sidebar (`/profile`, saved in the browser). Defaults match [`lib/static-profile.ts`](lib/static-profile.ts). **Reset to default** clears stored data.
2. Paste a **job URL** and **Fetch JD** (optional), or paste the **job description** directly (max length enforced; see API).
3. Optional: **Analyze posting** (fast, heuristic — no LLM).
4. **Generate resume** — preview, optional PDF, ATS estimate. Optional checkboxes: **Skip PDF** / **Skip ATS scoring** for faster iteration.
5. **Improve resume**, **Download PDF**, **Interview prep**, and **Saved versions** (export/import JSON).
6. **Edit resume** (`/resume/edit`): manual edits with live A4 preview, **Download PDF** from edited JSON, per-bullet **Improve** (uses workspace JD + `POST /api/improve-bullet`). Optional **Reset to AI version**; drafts persist in `localStorage`.

## Environment variables

| Variable | Description |
| -------- | ----------- |
| `AI_PROVIDER` | `ollama` (default), `openai`, or `gemini` |
| `OLLAMA_MODEL` | Model name from `ollama list` (default `llama3.2`) |
| `OLLAMA_BASE_URL` | Ollama API base (default `http://127.0.0.1:11434`) |
| `OLLAMA_TIMEOUT_MS` | Request timeout in ms (default `240000`) |
| `OLLAMA_EMBEDDING_MODEL` | Embeddings for ATS semantic score (default `nomic-embed-text`; falls back to TF–IDF if unavailable) |
| `ATS_SKIP_EMBEDDINGS` | `true` / `1` — skip embedding API calls; semantic ATS uses TF–IDF only (**much faster** locally) |
| `RESUME_MAX_ATTEMPTS` | Validation repair loops for generate/improve (default `3`; try `2` for speed) |
| `OLLAMA_NUM_PREDICT` | Max new tokens for resume JSON via Ollama (`1024`–`8192`; lower = faster, risk of truncation) |
| `OPENAI_API_KEY` | Required when `AI_PROVIDER=openai` |
| `OPENAI_MODEL` | Default `gpt-4o-mini` |
| `GEMINI_API_KEY` | Required when `AI_PROVIDER=gemini` |
| `GEMINI_MODEL` | Default `gemini-2.0-flash` |
| `PUPPETEER_EXECUTABLE_PATH` | Optional path to Chrome/Chromium for PDF |
| `LOG_TO_FILE` | `true` / `1` to append logs to `logs/app.log` |
| `LOG_REDACT_FILE` | Default: sensitive fields in **file** logs are redacted. Set to `false` or `0` to disable redaction (not recommended on shared machines) |
| `DEBUG_LOGS` | `true` / `1` for verbose debug logs |

## API (JSON `POST` unless noted)

All routes expect `Content-Type: application/json`. Job descriptions are trimmed and must not exceed **50,000** characters.

### `POST /api/generate-resume`

Body:

- `jobDescription` (string, required)
- `userProfile` (object, optional) — same shape as [`StaticUserProfile`](lib/static-profile.ts); if omitted, server uses built-in static profile
- `skipPdf` (boolean, optional) — skip Puppeteer PDF (response `pdfBase64` is `""`). Ignored when `format` is `pdf`
- `skipAdvancedAts` (boolean, optional) — skip multi-factor ATS computation (stub scores returned)
- `format` (optional): `"json"` (default) or `"pdf"` — raw PDF bytes in response body

### `POST /api/improve-resume`

Body: `jobDescription`, `resumeData`, optional `missingKeywords` (string array), optional `userProfile` for template + lexicon context.

### `POST /api/improve-bullet`

Body: `bullet` (string, required), `jobDescription` (string, required). Returns `{ "bullet": string }` — a single rewritten experience bullet aligned to the posting (plain text, no HTML).

### `POST /api/fetch-job`

Body: `url` (string, required) — public `http`/`https` only (SSRF-safe).

Returns `{ "jobDescription": string }` with cleaned text (capped at 50,000 characters). Many career sites (e.g. LinkedIn) return login walls or block servers; errors suggest pasting the JD manually.

### `POST /api/analyze-jd`

Heuristic JD scan (no LLM). Body: `jobDescription`, optional `userProfile` for `missingFromUserProfile`.

### `POST /api/interview-prep`

Body: `jobDescription`, `resumeData` (optimized resume object).

### `POST /api/render-pdf`

Body: `resumeData`, optional `userProfile` for contact/education in the HTML shell.

## Troubleshooting

- **Cannot connect to Ollama / `ECONNREFUSED`**: Ollama must listen on port **11434** (or your `OLLAMA_BASE_URL`).
  - **macOS:** open the **Ollama** app, or run `ollama serve`.
  - **Check:** `curl http://127.0.0.1:11434/api/tags`
- **`Cannot find module './331.js'`** / **HMR 404**: `npm run clean` then `npm run dev` (or `npm run dev:clean`). Only one dev server for this folder.
- **Model not found**: `ollama pull <name>` or fix **`OLLAMA_MODEL`**.
- **Timeout / slow**: use a **smaller/faster** quantized model (`ollama pull llama3.2:1b`, `qwen2.5:3b`, etc.), or raise **`OLLAMA_TIMEOUT_MS`**.
- **Generate takes minutes**: most time is the **LLM**. Speed up with: **`ATS_SKIP_EMBEDDINGS=true`** (skips two embedding calls per score), UI checkboxes **Skip ATS scoring** / **Skip PDF**, **`RESUME_MAX_ATTEMPTS=2`**, **`OLLAMA_NUM_PREDICT=3072`** if JSON still validates. PDF reuse and parallel PDF+ATS are enabled in the server automatically.
- **Invalid JSON from model**: stronger instruct model or re-pull; JSON mode works best on recent Ollama.

## Notes

- **Puppeteer / PDF:** tries **system Chrome** (common paths + `channel: 'chrome'`), then Puppeteer’s Chrome. If you see “Could not find Chrome”, install [Google Chrome](https://www.google.com/chrome/) or run **`npm run browsers:install`**. Override with **`PUPPETEER_EXECUTABLE_PATH`**.
- **Deployment:** Puppeteer needs a full Node runtime; serverless often needs extra Chromium. This project targets **local** or **VM/container** deploys.
- **ATS scores** are **heuristic estimates**, not a guarantee from a real ATS.
- **Security:** API routes are **unauthenticated**. Do not expose publicly without adding your own auth or rate limiting. File logs redact large/sensitive payload fields by default (`LOG_REDACT_FILE`).

## Production checklist (self-hosted)

- [ ] Set `AI_PROVIDER` and required API keys or Ollama URL for your network
- [ ] Ensure Chrome/Chromium is available for PDF, or set `PUPPETEER_EXECUTABLE_PATH`
- [ ] Keep `LOG_REDACT_FILE` enabled (default) if writing logs to shared disk
- [ ] Add reverse-proxy auth or network restrictions if the app is reachable beyond localhost
- [ ] Run `npm run build` and `npm run start` behind a process manager

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run dev:clean` | Clean `.next` + dev |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run browsers:install` | Install Puppeteer Chrome |
