import type { StaticContact, StaticEducation } from "./static-profile";
import type { OptimizedResume } from "./types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ResumeHtmlExtras = {
  contact: StaticContact;
  education: StaticEducation[];
};

function contactLineHtml(c: StaticContact): string {
  const parts = [c.phone, c.email, c.linkedin, c.github].filter(Boolean);
  return parts.map(escapeHtml).join(" | ");
}

/**
 * ATS-friendly single-column HTML document for print/PDF.
 * Contact and education are taken from static profile (not model output).
 */
export function buildResumeHtml(
  resume: OptimizedResume,
  extras: ResumeHtmlExtras
): string {
  const skillsLine = resume.skills.map(escapeHtml).join(" · ");

  const experienceBlocks = resume.experience
    .map((exp) => {
      const header = `${escapeHtml(exp.role)} | ${escapeHtml(exp.company)} | ${escapeHtml(exp.duration)}`;
      const bullets = exp.points
        .map((p) => `<li>${escapeHtml(p)}</li>`)
        .join("");
      return `
        <div class="exp">
          <div class="exp-head">${header}</div>
          <ul>${bullets}</ul>
        </div>`;
    })
    .join("");

  const projectBlocks = resume.projects
    .map(
      (p) => `
        <div class="proj">
          <div class="proj-name">${escapeHtml(p.name)}</div>
          <div class="proj-desc">${escapeHtml(p.description)}</div>
        </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(resume.name)} — Resume</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, "Times New Roman", Times, serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .page { max-width: 100%; padding: 0; }
    h1 {
      font-size: 18pt;
      font-weight: bold;
      margin: 0 0 2pt 0;
      letter-spacing: 0.02em;
    }
    .title {
      font-size: 11pt;
      margin: 0 0 10pt 0;
    }
    .section {
      margin-top: 10pt;
    }
    .section-title {
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom: 1px solid #000;
      padding-bottom: 2pt;
      margin-bottom: 6pt;
    }
    .summary { margin: 0; text-align: justify; }
    .skills { margin: 0; }
    .exp { margin-bottom: 8pt; }
    .exp-head { font-weight: bold; margin-bottom: 3pt; }
    ul { margin: 0; padding-left: 18pt; }
    li { margin-bottom: 2pt; }
    .proj { margin-bottom: 6pt; }
    .proj-name { font-weight: bold; }
    .proj-desc { margin-top: 1pt; }
    .contact {
      font-size: 10pt;
      margin: 0 0 8pt 0;
      word-break: break-word;
    }
    .edu { margin-bottom: 4pt; }
    .edu-line { margin: 0; }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <h1>${escapeHtml(resume.name)}</h1>
      <div class="title">${escapeHtml(resume.title)}</div>
      <p class="contact">${contactLineHtml(extras.contact)}</p>
    </header>

    <section class="section">
      <div class="section-title">Summary</div>
      <p class="summary">${escapeHtml(resume.summary)}</p>
    </section>

    <section class="section">
      <div class="section-title">Skills</div>
      <p class="skills">${skillsLine}</p>
    </section>

    <section class="section">
      <div class="section-title">Experience</div>
      ${experienceBlocks}
    </section>

    <section class="section">
      <div class="section-title">Projects</div>
      ${projectBlocks || "<p class=\"summary\">—</p>"}
    </section>

    <section class="section">
      <div class="section-title">Education</div>
      ${extras.education
        .map(
          (e) => `
        <div class="edu">
          <p class="edu-line"><strong>${escapeHtml(e.degree)}</strong> — ${escapeHtml(e.institution)} — ${escapeHtml(e.duration)}</p>
        </div>`
        )
        .join("")}
    </section>
  </div>
</body>
</html>`;
}
