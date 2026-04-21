"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { clearUserProfile, saveUserProfile } from "@/lib/persistence";
import { STATIC_USER_PROFILE, type StaticUserProfile } from "@/lib/static-profile";
import { tryParseSkillsRecord } from "@/lib/user-profile";

type Props = {
  profile: StaticUserProfile;
  onChange: (next: StaticUserProfile) => void;
  /** Omit outer card — use inside SectionShell */
  embedded?: boolean;
};

function skillsToJson(skills: Record<string, string[]>): string {
  return JSON.stringify(skills, null, 2);
}

export function ProfileEditor({ profile, onChange, embedded }: Props) {
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const [skillsText, setSkillsText] = useState(() => skillsToJson(profile.skills));
  const [skillsError, setSkillsError] = useState<string | null>(null);

  useEffect(() => {
    setSkillsText(skillsToJson(profile.skills));
    setSkillsError(null);
  }, [profile.skills]);

  const syncSkillsFromProfile = useCallback((p: StaticUserProfile) => {
    setSkillsText(skillsToJson(p.skills));
    setSkillsError(null);
  }, []);

  const applySkillsJson = useCallback(() => {
    try {
      const parsed = JSON.parse(skillsText) as unknown;
      const probe = tryParseSkillsRecord(parsed);
      if (!probe.ok) {
        setSkillsError("Skills must be an object of string arrays.");
        return;
      }
      setSkillsError(null);
      onChange({ ...profile, skills: probe.skills });
    } catch {
      setSkillsError("Invalid JSON.");
    }
  }, [profile, skillsText, onChange]);

  const resetToDefault = () => {
    void clearUserProfile().then(() => {
      onChange(STATIC_USER_PROFILE);
      syncSkillsFromProfile(STATIC_USER_PROFILE);
    });
  };

  const persist = () => {
    void saveUserProfile(profile);
  };

  const shellClass = embedded
    ? "space-y-3"
    : "rounded-xl border border-ca-ink/[0.08] bg-ca-lowest p-4 shadow-sm ring-1 ring-ca-ink/[0.03]";

  return (
    <div className={shellClass}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-3 text-left ${
          embedded
            ? "rounded-lg border border-ca-ink/[0.08] bg-ca-low/60 px-3 py-2.5 transition hover:bg-ca-low"
            : ""
        }`}
        aria-expanded={open}
        aria-controls={`${baseId}-panel`}
      >
        <span className="font-display text-sm font-semibold text-ca-ink">
          {embedded ? "Edit experience, projects & skills" : "My profile"}
        </span>
        <span className="shrink-0 rounded-md bg-ca-lowest px-2 py-0.5 text-[11px] font-medium text-ca-muted ring-1 ring-ca-ink/[0.08]">
          {open ? "Collapse" : "Expand"}
        </span>
      </button>

      {open && (
        <div
          id={`${baseId}-panel`}
          className={`space-y-4 ${embedded ? "pt-1" : "mt-4 border-t border-ca-ink/[0.08] pt-4"}`}
        >
          <p className="text-[11px] leading-relaxed text-ca-muted">
            Used for Generate, Analyze posting, PDF header/footer, and Improve.
            Saved in this browser only.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor={`${baseId}-name`}
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ca-muted"
              >
                Name
              </label>
              <input
                id={`${baseId}-name`}
                value={profile.name}
                onChange={(e) => onChange({ ...profile, name: e.target.value })}
                className="w-full rounded-md border border-ca-ink/[0.08] bg-ca-low px-2 py-1.5 text-sm text-ca-ink"
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor={`${baseId}-summary`}
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ca-muted"
              >
                Summary
              </label>
              <textarea
                id={`${baseId}-summary`}
                rows={3}
                value={profile.summary}
                onChange={(e) =>
                  onChange({ ...profile, summary: e.target.value })
                }
                className="w-full resize-y rounded-md border border-ca-ink/[0.08] bg-ca-low px-2 py-1.5 text-sm text-ca-ink"
              />
            </div>
          </div>

          <fieldset className="space-y-2 rounded-md border border-ca-ink/[0.08]/80 p-3">
            <legend className="px-1 text-[10px] font-semibold uppercase tracking-wide text-ca-muted">
              Contact
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["phone", "Phone"],
                  ["email", "Email"],
                  ["linkedin", "LinkedIn"],
                  ["github", "GitHub"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label
                    htmlFor={`${baseId}-${key}`}
                    className="mb-0.5 block text-[10px] text-ca-muted"
                  >
                    {label}
                  </label>
                  <input
                    id={`${baseId}-${key}`}
                    value={profile.contact[key]}
                    onChange={(e) =>
                      onChange({
                        ...profile,
                        contact: { ...profile.contact, [key]: e.target.value },
                      })
                    }
                    className="w-full rounded-md border border-ca-ink/[0.08] bg-ca-low px-2 py-1 text-xs text-ca-ink"
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ca-muted">
                Experience
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...profile,
                    experience: [
                      ...profile.experience,
                      {
                        role: "",
                        company: "",
                        duration: "",
                        responsibilities: [],
                      },
                    ],
                  })
                }
                className="text-[11px] font-medium text-ca-primary-ink hover:underline"
              >
                Add role
              </button>
            </div>
            <ul className="space-y-3">
              {profile.experience.map((ex, i) => (
                <li
                  key={i}
                  className="rounded-md border border-ca-ink/[0.08] bg-ca-low/50 p-2"
                >
                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      disabled={profile.experience.length <= 1}
                      onClick={() =>
                        onChange({
                          ...profile,
                          experience: profile.experience.filter(
                            (_, j) => j !== i
                          ),
                        })
                      }
                      className="text-[11px] text-ca-danger hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      placeholder="Role"
                      value={ex.role}
                      onChange={(e) => {
                        const next = [...profile.experience];
                        next[i] = { ...ex, role: e.target.value };
                        onChange({ ...profile, experience: next });
                      }}
                      className="rounded border border-ca-ink/[0.08] bg-ca-lowest px-2 py-1 text-xs"
                    />
                    <input
                      placeholder="Company"
                      value={ex.company}
                      onChange={(e) => {
                        const next = [...profile.experience];
                        next[i] = { ...ex, company: e.target.value };
                        onChange({ ...profile, experience: next });
                      }}
                      className="rounded border border-ca-ink/[0.08] bg-ca-lowest px-2 py-1 text-xs"
                    />
                    <input
                      placeholder="Duration"
                      value={ex.duration}
                      onChange={(e) => {
                        const next = [...profile.experience];
                        next[i] = { ...ex, duration: e.target.value };
                        onChange({ ...profile, experience: next });
                      }}
                      className="rounded border border-ca-ink/[0.08] bg-ca-lowest px-2 py-1 text-xs sm:col-span-3"
                    />
                  </div>
                  <label className="mt-2 block text-[10px] text-ca-muted">
                    Responsibilities (one per line)
                  </label>
                  <textarea
                    rows={4}
                    value={ex.responsibilities.join("\n")}
                    onChange={(e) => {
                      const lines = e.target.value
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean);
                      const next = [...profile.experience];
                      next[i] = { ...ex, responsibilities: lines };
                      onChange({ ...profile, experience: next });
                    }}
                    className="mt-1 w-full rounded border border-ca-ink/[0.08] bg-ca-lowest px-2 py-1 text-xs"
                  />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ca-muted">
                Projects
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...profile,
                    projects: [
                      ...profile.projects,
                      { name: "", description: [], techStack: [] },
                    ],
                  })
                }
                className="text-[11px] font-medium text-ca-primary-ink hover:underline"
              >
                Add project
              </button>
            </div>
            <ul className="space-y-3">
              {profile.projects.map((pr, i) => (
                <li
                  key={i}
                  className="rounded-md border border-ca-ink/[0.08] bg-ca-low/50 p-2"
                >
                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...profile,
                          projects: profile.projects.filter(
                            (_, j) => j !== i
                          ),
                        })
                      }
                      className="text-[11px] text-ca-danger hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    placeholder="Name"
                    value={pr.name}
                    onChange={(e) => {
                      const next = [...profile.projects];
                      next[i] = { ...pr, name: e.target.value };
                      onChange({ ...profile, projects: next });
                    }}
                    className="mb-2 w-full rounded border border-ca-ink/[0.08] bg-ca-lowest px-2 py-1 text-xs"
                  />
                  <input
                    placeholder="Tech stack (comma-separated)"
                    value={pr.techStack.join(", ")}
                    onChange={(e) => {
                      const techStack = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const next = [...profile.projects];
                      next[i] = { ...pr, techStack };
                      onChange({ ...profile, projects: next });
                    }}
                    className="mb-2 w-full rounded border border-ca-ink/[0.08] bg-ca-lowest px-2 py-1 text-xs"
                  />
                  <textarea
                    placeholder="Description bullets (one per line)"
                    rows={3}
                    value={pr.description.join("\n")}
                    onChange={(e) => {
                      const description = e.target.value
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean);
                      const next = [...profile.projects];
                      next[i] = { ...pr, description };
                      onChange({ ...profile, projects: next });
                    }}
                    className="w-full rounded border border-ca-ink/[0.08] bg-ca-lowest px-2 py-1 text-xs"
                  />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label
              htmlFor={`${baseId}-skills`}
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ca-muted"
            >
              Skills (JSON object of string arrays)
            </label>
            <textarea
              id={`${baseId}-skills`}
              rows={8}
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              onBlur={applySkillsJson}
              className="w-full resize-y rounded-md border border-ca-ink/[0.08] bg-ca-low px-2 py-1.5 font-mono text-[11px] text-ca-ink"
            />
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applySkillsJson}
                className="rounded-md border border-ca-ink/[0.08] bg-ca-lowest px-2 py-1 text-[11px] font-medium"
              >
                Apply skills JSON
              </button>
              {skillsError && (
                <span className="text-[11px] text-ca-danger">{skillsError}</span>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ca-muted">
                Education
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...profile,
                    education: [
                      ...profile.education,
                      { degree: "", institution: "", duration: "" },
                    ],
                  })
                }
                className="text-[11px] font-medium text-ca-primary-ink hover:underline"
              >
                Add row
              </button>
            </div>
            <ul className="space-y-2">
              {profile.education.map((ed, i) => (
                <li
                  key={i}
                  className="grid gap-2 rounded-md border border-ca-ink/[0.08] bg-ca-low/50 p-2 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <input
                    placeholder="Degree"
                    value={ed.degree}
                    onChange={(e) => {
                      const next = [...profile.education];
                      next[i] = { ...ed, degree: e.target.value };
                      onChange({ ...profile, education: next });
                    }}
                    className="rounded border border-ca-ink/[0.08] bg-ca-lowest px-2 py-1 text-xs"
                  />
                  <input
                    placeholder="Institution"
                    value={ed.institution}
                    onChange={(e) => {
                      const next = [...profile.education];
                      next[i] = { ...ed, institution: e.target.value };
                      onChange({ ...profile, education: next });
                    }}
                    className="rounded border border-ca-ink/[0.08] bg-ca-lowest px-2 py-1 text-xs"
                  />
                  <div className="flex gap-2 sm:contents">
                    <input
                      placeholder="Duration"
                      value={ed.duration}
                      onChange={(e) => {
                        const next = [...profile.education];
                        next[i] = { ...ed, duration: e.target.value };
                        onChange({ ...profile, education: next });
                      }}
                      className="grow rounded border border-ca-ink/[0.08] bg-ca-lowest px-2 py-1 text-xs sm:col-span-1"
                    />
                    <button
                      type="button"
                      disabled={profile.education.length <= 1}
                      onClick={() =>
                        onChange({
                          ...profile,
                          education: profile.education.filter(
                            (_, j) => j !== i
                          ),
                        })
                      }
                      className="text-[11px] text-ca-danger hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-ca-ink/[0.08] pt-3">
            <button
              type="button"
              onClick={persist}
              className="rounded-ca bg-ca-primary-gradient px-3 py-1.5 text-xs font-semibold text-ca-on-primary shadow-ca"
            >
              Save to browser
            </button>
            <button
              type="button"
              onClick={resetToDefault}
              className="rounded-lg border border-ca-ink/[0.08] bg-ca-lowest px-3 py-1.5 text-xs font-semibold text-ca-ink"
            >
              Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
