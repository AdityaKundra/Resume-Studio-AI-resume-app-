"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  clearEditableResumeStorage,
  loadEditableResumeFromStorage,
  saveEditableResumeToStorage,
} from "@/lib/editable-resume-storage";
import { EMPTY_OPTIMIZED_RESUME } from "@/lib/empty-resume";
import { buildResumeHtml } from "@/lib/template";
import { sanitizePlainText } from "@/lib/resume-text";
import { useAppStore } from "@/store/useAppStore";
import type { OptimizedResume, ResumeExperience, ResumeProject } from "@/lib/types";

const fieldClass =
  "w-full rounded-ca border-0 bg-ca-lowest px-3 py-2 text-sm text-ca-ink shadow-ca ring-1 ring-ca-ink/[0.08] transition-shadow placeholder:text-ca-muted focus:outline-none focus:ring-2 focus:ring-ca-primary/25";
const labelClass =
  "font-label mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ca-muted";
const primaryBtn =
  "inline-flex items-center justify-center rounded-ca bg-ca-primary-gradient px-3 py-2 text-xs font-semibold text-ca-on-primary shadow-ca-ambient transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
  "inline-flex items-center justify-center rounded-ca bg-ca-highest px-3 py-2 text-xs font-semibold text-ca-ink shadow-ca transition hover:bg-ca-container disabled:opacity-50";
const ghostBtn =
  "inline-flex items-center justify-center rounded-ca px-2 py-1 text-xs font-medium text-ca-primary ring-1 ring-ca-primary/20 transition hover:bg-ca-primary-soft";

function deepEqualResume(a: OptimizedResume, b: OptimizedResume): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type DiffFlags = {
  header: boolean;
  summary: boolean;
  skills: boolean;
  experience: boolean;
  projects: boolean;
};

function diffAgainstSnapshot(
  current: OptimizedResume,
  snap: OptimizedResume
): DiffFlags {
  return {
    header: current.name !== snap.name || current.title !== snap.title,
    summary: current.summary !== snap.summary,
    skills: JSON.stringify(current.skills) !== JSON.stringify(snap.skills),
    experience:
      JSON.stringify(current.experience) !== JSON.stringify(snap.experience),
    projects:
      JSON.stringify(current.projects) !== JSON.stringify(snap.projects),
  };
}

function editedSectionClass(active: boolean): string {
  return active
    ? "rounded-ca ring-2 ring-ca-primary/35 ring-offset-2 ring-offset-ca-lowest transition-[box-shadow] duration-200"
    : "rounded-ca transition-[box-shadow] duration-200";
}

type Props = {
  /** Seed from AI / workspace; used for reset + first paint. */
  seedResume: OptimizedResume;
  jobDescription: string;
};

export function EditableResume({ seedResume, jobDescription }: Props) {
  const userProfile = useAppStore((s) => s.userProfile);
  const result = useAppStore((s) => s.result);
  const setResult = useAppStore((s) => s.setResult);
  const setToast = useAppStore((s) => s.setToast);

  const snapshotRef = useRef<OptimizedResume>(
    structuredClone(
      seedResume.name || seedResume.experience.length
        ? seedResume
        : EMPTY_OPTIMIZED_RESUME
    )
  );

  const lastSeedSig = useRef<string | null>(null);

  const [resume, setResume] = useState<OptimizedResume>(() => {
    const seedHasContent =
      Boolean(seedResume.name?.trim()) ||
      Boolean(seedResume.summary?.trim()) ||
      seedResume.skills.length > 0 ||
      seedResume.experience.length > 0 ||
      seedResume.projects.length > 0;
    const base = seedHasContent
      ? structuredClone(seedResume)
      : structuredClone(EMPTY_OPTIMIZED_RESUME);
    if (typeof window !== "undefined" && !seedHasContent) {
      const stored = loadEditableResumeFromStorage();
      if (
        stored &&
        stored.jobDescription === jobDescription &&
        (stored.resume.name || stored.resume.experience.length)
      ) {
        return stored.resume;
      }
    }
    return base;
  });

  const [skillDraft, setSkillDraft] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [improvingKey, setImprovingKey] = useState<string | null>(null);

  useEffect(() => {
    const sig = JSON.stringify(seedResume);
    if (lastSeedSig.current === sig) return;
    lastSeedSig.current = sig;
    const hasContent =
      Boolean(seedResume.name?.trim()) ||
      Boolean(seedResume.summary?.trim()) ||
      seedResume.skills.length > 0 ||
      seedResume.experience.length > 0 ||
      seedResume.projects.length > 0;
    if (!hasContent) return;
    setResume(structuredClone(seedResume));
    snapshotRef.current = structuredClone(seedResume);
    clearEditableResumeStorage();
  }, [seedResume]);

  const diff = useMemo(
    () => diffAgainstSnapshot(resume, snapshotRef.current),
    [resume]
  );
  const isDirty = useMemo(
    () => !deepEqualResume(resume, snapshotRef.current),
    [resume]
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      saveEditableResumeToStorage({
        resume,
        jobDescription,
        savedAt: Date.now(),
      });
    }, 450);
    return () => window.clearTimeout(t);
  }, [resume, jobDescription]);

  const previewHtml = useMemo(
    () =>
      buildResumeHtml(resume, {
        contact: userProfile.contact,
        education: userProfile.education,
      }),
    [resume, userProfile.contact, userProfile.education]
  );

  const updateResume = useCallback((patch: Partial<OptimizedResume>) => {
    setResume((r) => ({ ...r, ...patch }));
  }, []);

  const addSkill = useCallback(() => {
    const t = sanitizePlainText(skillDraft).trim();
    if (!t) return;
    setResume((r) => ({
      ...r,
      skills: r.skills.includes(t) ? r.skills : [...r.skills, t],
    }));
    setSkillDraft("");
  }, [skillDraft]);

  const removeSkill = useCallback((idx: number) => {
    setResume((r) => ({
      ...r,
      skills: r.skills.filter((_, i) => i !== idx),
    }));
  }, []);

  const setExperience = useCallback((next: ResumeExperience[]) => {
    setResume((r) => ({ ...r, experience: next }));
  }, []);

  const setProjects = useCallback((next: ResumeProject[]) => {
    setResume((r) => ({ ...r, projects: next }));
  }, []);

  const improveBullet = useCallback(
    async (expIndex: number, pointIndex: number) => {
      const bullet = resume.experience[expIndex]?.points[pointIndex]?.trim();
      if (!bullet || !jobDescription.trim()) {
        setToast("Need a bullet and job description in the workspace.");
        return;
      }
      const key = `${expIndex}-${pointIndex}`;
      setImprovingKey(key);
      try {
        const res = await fetch("/api/improve-bullet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bullet, jobDescription }),
        });
        const data = (await res.json()) as { bullet?: string; error?: string };
        if (!res.ok || !data.bullet) {
          throw new Error(data.error ?? "Improve failed");
        }
        const next = structuredClone(resume.experience);
        next[expIndex].points[pointIndex] = sanitizePlainText(data.bullet);
        setExperience(next);
        setToast("Bullet updated.");
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Could not improve bullet.");
      } finally {
        setImprovingKey(null);
      }
    },
    [resume.experience, jobDescription, setToast, setExperience]
  );

  const downloadPdf = useCallback(async () => {
    setPdfLoading(true);
    try {
      const res = await fetch("/api/render-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData: resume,
          userProfile,
        }),
      });
      const data = (await res.json()) as { pdfBase64?: string; error?: string };
      if (!res.ok || !data.pdfBase64) {
        setToast(data.error ?? "PDF failed");
        return;
      }
      const bytes = Uint8Array.from(atob(data.pdfBase64), (c) =>
        c.charCodeAt(0)
      );
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(resume.name || "resume").replace(/\s+/g, "_")}_edited.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setToast("PDF download started.");
    } catch {
      setToast("Network error while building PDF.");
    } finally {
      setPdfLoading(false);
    }
  }, [resume, userProfile, setToast]);

  const resetToAi = useCallback(() => {
    const snap = structuredClone(snapshotRef.current);
    setResume(snap);
    clearEditableResumeStorage();
    setToast("Restored AI version.");
  }, [setToast]);

  const syncToWorkspace = useCallback(() => {
    if (!result) {
      setToast("Generate a resume in the builder first to sync.");
      return;
    }
    setResult({
      ...result,
      resume: structuredClone(resume),
    });
    setToast("Workspace resume updated.");
  }, [result, resume, setResult, setToast]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={pdfLoading}
            className={primaryBtn}
          >
            {pdfLoading ? "Building PDF…" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={resetToAi}
            disabled={!isDirty}
            className={secondaryBtn}
          >
            Reset to AI version
          </button>
          <button type="button" onClick={syncToWorkspace} className={ghostBtn}>
            Sync to workspace
          </button>
        </div>
        {isDirty ? (
          <p className="text-xs text-ca-muted" role="status">
            Unsaved edits relative to the last AI snapshot — preview updates live.
          </p>
        ) : null}

        <section className={editedSectionClass(diff.header)}>
          <p className={labelClass}>Header</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="er-name" className={labelClass}>
                Name
              </label>
              <input
                id="er-name"
                value={resume.name}
                onChange={(e) =>
                  updateResume({ name: sanitizePlainText(e.target.value) })
                }
                className={fieldClass}
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="er-title" className={labelClass}>
                Title
              </label>
              <input
                id="er-title"
                value={resume.title}
                onChange={(e) =>
                  updateResume({ title: sanitizePlainText(e.target.value) })
                }
                className={fieldClass}
              />
            </div>
          </div>
        </section>

        <section className={editedSectionClass(diff.summary)}>
          <label htmlFor="er-summary" className={labelClass}>
            Summary
          </label>
          <textarea
            id="er-summary"
            rows={5}
            value={resume.summary}
            onChange={(e) =>
              updateResume({ summary: sanitizePlainText(e.target.value) })
            }
            className={`min-h-[120px] resize-y ${fieldClass}`}
          />
        </section>

        <section className={editedSectionClass(diff.skills)}>
          <p className={labelClass}>Skills</p>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((s, i) => (
              <span
                key={`${s}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-ca-highest px-2.5 py-1 text-xs font-medium text-ca-ink ring-1 ring-ca-ink/[0.08]"
              >
                {s}
                <button
                  type="button"
                  className="rounded-full p-0.5 text-ca-muted hover:bg-ca-low hover:text-ca-danger"
                  aria-label={`Remove ${s}`}
                  onClick={() => removeSkill(i)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={skillDraft}
              onChange={(e) => setSkillDraft(sanitizePlainText(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Add skill, press Enter"
              className={fieldClass}
            />
            <button type="button" onClick={addSkill} className={secondaryBtn}>
              Add
            </button>
          </div>
        </section>

        <section className={editedSectionClass(diff.experience)}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={labelClass}>Experience</p>
            <button
              type="button"
              onClick={() =>
                setExperience([
                  ...resume.experience,
                  {
                    company: "",
                    role: "",
                    duration: "",
                    points: [""],
                  },
                ])
              }
              className={ghostBtn}
            >
              + Add role
            </button>
          </div>
          <div className="space-y-6">
            {resume.experience.map((exp, ei) => (
              <div
                key={ei}
                className="rounded-ca border border-ca-ink/[0.06] bg-ca-low/40 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Company</label>
                    <input
                      value={exp.company}
                      onChange={(e) => {
                        const next = [...resume.experience];
                        next[ei] = {
                          ...next[ei],
                          company: sanitizePlainText(e.target.value),
                        };
                        setExperience(next);
                      }}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Role</label>
                    <input
                      value={exp.role}
                      onChange={(e) => {
                        const next = [...resume.experience];
                        next[ei] = {
                          ...next[ei],
                          role: sanitizePlainText(e.target.value),
                        };
                        setExperience(next);
                      }}
                      className={fieldClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Duration</label>
                    <input
                      value={exp.duration}
                      onChange={(e) => {
                        const next = [...resume.experience];
                        next[ei] = {
                          ...next[ei],
                          duration: sanitizePlainText(e.target.value),
                        };
                        setExperience(next);
                      }}
                      className={fieldClass}
                    />
                  </div>
                </div>
                <p className={`${labelClass} mt-4`}>Bullets</p>
                <ul className="space-y-3">
                  {exp.points.map((pt, pi) => (
                    <li key={pi} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <textarea
                        value={pt}
                        onChange={(e) => {
                          const next = [...resume.experience];
                          const pts = [...next[ei].points];
                          pts[pi] = sanitizePlainText(e.target.value);
                          next[ei] = { ...next[ei], points: pts };
                          setExperience(next);
                        }}
                        rows={3}
                        className={`min-w-0 flex-1 resize-y ${fieldClass}`}
                      />
                      <div className="flex shrink-0 gap-2 sm:flex-col">
                        <button
                          type="button"
                          onClick={() => void improveBullet(ei, pi)}
                          disabled={
                            improvingKey === `${ei}-${pi}` ||
                            !jobDescription.trim()
                          }
                          className={primaryBtn + " whitespace-nowrap"}
                        >
                          {improvingKey === `${ei}-${pi}`
                            ? "…"
                            : "Improve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...resume.experience];
                            const pts = next[ei].points.filter((_, j) => j !== pi);
                            next[ei] = { ...next[ei], points: pts.length ? pts : [""] };
                            setExperience(next);
                          }}
                          className={secondaryBtn}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    const next = [...resume.experience];
                    next[ei] = {
                      ...next[ei],
                      points: [...next[ei].points, ""],
                    };
                    setExperience(next);
                  }}
                  className={`${ghostBtn} mt-3`}
                >
                  + Bullet
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExperience(resume.experience.filter((_, j) => j !== ei))
                  }
                  className="mt-3 text-xs font-medium text-ca-danger hover:underline"
                >
                  Remove role
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className={editedSectionClass(diff.projects)}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={labelClass}>Projects</p>
            <button
              type="button"
              onClick={() =>
                setProjects([
                  ...resume.projects,
                  { name: "", description: "" },
                ])
              }
              className={ghostBtn}
            >
              + Add project
            </button>
          </div>
          <div className="space-y-4">
            {resume.projects.map((p, pi) => (
              <div
                key={pi}
                className="rounded-ca border border-ca-ink/[0.06] bg-ca-low/40 p-4"
              >
                <label className={labelClass}>Name</label>
                <input
                  value={p.name}
                  onChange={(e) => {
                    const next = [...resume.projects];
                    next[pi] = {
                      ...next[pi],
                      name: sanitizePlainText(e.target.value),
                    };
                    setProjects(next);
                  }}
                  className={fieldClass}
                />
                <label className={`${labelClass} mt-3`}>Description</label>
                <textarea
                  value={p.description}
                  onChange={(e) => {
                    const next = [...resume.projects];
                    next[pi] = {
                      ...next[pi],
                      description: sanitizePlainText(e.target.value),
                    };
                    setProjects(next);
                  }}
                  rows={3}
                  className={`resize-y ${fieldClass}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setProjects(resume.projects.filter((_, j) => j !== pi))
                  }
                  className="mt-2 text-xs font-medium text-ca-danger hover:underline"
                >
                  Remove project
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="lg:sticky lg:top-4">
        <p className="font-label mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ca-muted">
          Live preview (A4)
        </p>
        <div className="overflow-hidden rounded-ca-xl bg-ca-dim p-3 shadow-ca ring-1 ring-ca-ink/[0.08]">
          <div
            className="mx-auto origin-top scale-[0.55] sm:scale-[0.65] md:scale-[0.72] lg:scale-[0.78]"
            style={{ width: "210mm", height: "297mm" }}
          >
            <iframe
              title="Resume preview"
              className="h-full w-full border-0 bg-white shadow-ca-paper"
              sandbox="allow-same-origin"
              srcDoc={previewHtml}
            />
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ca-muted">
          Preview uses the same HTML as PDF export. Keep content concise for a
          single printed page.
        </p>
      </div>
    </div>
  );
}
