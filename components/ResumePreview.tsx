import type { StaticContact, StaticEducation } from "@/lib/static-profile";
import type { OptimizedResume } from "@/lib/types";

type Props = {
  resume: OptimizedResume;
  contact: StaticContact;
  education: StaticEducation[];
  className?: string;
};

const sectionTitle =
  "font-label mb-3 mt-8 text-xs font-bold uppercase tracking-[0.12em] text-ca-muted first:mt-0";

export function ResumePreview({
  resume,
  contact,
  education,
  className = "",
}: Props) {
  const contactParts = [
    contact.phone,
    contact.email,
    contact.linkedin,
    contact.github,
  ].filter(Boolean);

  return (
    <div
      className={`w-full rounded-ca-xl bg-ca-lowest p-8 text-ca-ink shadow-ca-paper ring-1 ring-ca-ink/[0.06] ${className}`}
    >
      <header className="pb-6">
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-ca-ink">
          {resume.name}
        </h2>
        <p className="mt-1 text-sm font-medium text-ca-muted">{resume.title}</p>
        <p className="mt-3 break-all text-xs text-ca-muted">
          {contactParts.join(" · ")}
        </p>
      </header>

      <section>
        <h3 className={sectionTitle}>Summary</h3>
        <p className="text-sm leading-relaxed text-ca-ink">{resume.summary}</p>
      </section>

      <section>
        <h3 className={sectionTitle}>Skills</h3>
        <p className="text-sm text-ca-ink">{resume.skills.join(" · ")}</p>
      </section>

      <section>
        <h3 className={sectionTitle}>Experience</h3>
        <ul className="space-y-6">
          {resume.experience.map((exp, i) => (
            <li key={`${exp.company}-${i}`}>
              <p className="text-sm font-semibold text-ca-ink">
                {exp.role} | {exp.company} | {exp.duration}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ca-ink">
                {exp.points.map((p, j) => (
                  <li key={j}>{p}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className={sectionTitle}>Projects</h3>
        <ul className="space-y-4">
          {resume.projects.map((p, i) => (
            <li key={`${p.name}-${i}`}>
              <p className="text-sm font-semibold text-ca-ink">{p.name}</p>
              <p className="mt-1 text-sm text-ca-ink/90">{p.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className={sectionTitle}>Education</h3>
        <ul className="space-y-3 text-sm text-ca-ink">
          {education.map((e, i) => (
            <li key={`${e.institution}-${i}`}>
              <span className="font-semibold">{e.degree}</span>
              {" — "}
              {e.institution}
              {" — "}
              {e.duration}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
