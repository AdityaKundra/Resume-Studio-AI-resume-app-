import type { JobDescriptionAnalysis } from "@/lib/types";

type Props = {
  analysis: JobDescriptionAnalysis | null;
  loading: boolean;
  error: string | null;
};

export function JdAnalysisPanel({ analysis, loading, error }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-ca bg-ca-low px-4 py-4 text-sm text-ca-muted shadow-ca">
        <span
          className="inline-block size-4 animate-spin rounded-full border-2 border-ca-primary border-t-transparent"
          aria-hidden
        />
        Scanning job description…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-ca bg-ca-danger-soft px-4 py-3 text-sm text-ca-danger ring-1 ring-ca-danger/20"
        role="alert"
        aria-live="assertive"
      >
        {error}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="rounded-ca bg-ca-low px-4 py-8 text-center outline outline-1 outline-dashed outline-ca-ink/15">
        <p className="text-sm font-medium text-ca-ink">No insights yet</p>
        <p className="mx-auto mt-2 max-w-[220px] text-xs leading-relaxed text-ca-muted">
          Run{" "}
          <span className="font-semibold text-ca-primary">Analyze posting</span> from
          the Job description stage to extract seniority, skills, and profile gaps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      <dl className="space-y-6">
        <div>
          <dt className="font-label text-[11px] font-semibold uppercase tracking-wide text-ca-muted">
            Role seniority
          </dt>
          <dd className="mt-2 font-medium text-ca-ink">{analysis.seniorityLevel}</dd>
        </div>

        <div>
          <dt className="font-label text-[11px] font-semibold uppercase tracking-wide text-ca-muted">
            Required skills (detected)
          </dt>
          <dd className="mt-3 flex flex-wrap gap-2">
            {analysis.requiredSkills.length === 0 ? (
              <span className="text-xs text-ca-muted">No common patterns matched</span>
            ) : (
              analysis.requiredSkills.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-ca-highest px-2.5 py-0.5 text-xs font-medium text-ca-ink"
                >
                  {s}
                </span>
              ))
            )}
          </dd>
        </div>

        <div>
          <dt className="font-label text-[11px] font-semibold uppercase tracking-wide text-ca-muted">
            Tools & platforms
          </dt>
          <dd className="mt-3 flex flex-wrap gap-2">
            {analysis.tools.length === 0 ? (
              <span className="text-xs text-ca-muted">—</span>
            ) : (
              analysis.tools.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-ca-primary-soft px-2.5 py-0.5 text-xs font-medium text-ca-primary-ink"
                >
                  {t}
                </span>
              ))
            )}
          </dd>
        </div>

        <div>
          <dt className="font-label text-[11px] font-semibold uppercase tracking-wide text-ca-muted">
            Missing from static profile
          </dt>
          <dd className="mt-3 flex flex-wrap gap-2">
            {analysis.missingFromUserProfile.length === 0 ? (
              <span className="text-xs text-ca-muted">
                No obvious gaps vs{" "}
                <code className="rounded bg-ca-low px-1 text-[10px]">static-profile</code>
              </span>
            ) : (
              analysis.missingFromUserProfile.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-ca-warning-soft px-2.5 py-0.5 text-xs font-medium text-ca-warning"
                >
                  {s}
                </span>
              ))
            )}
          </dd>
        </div>

        {analysis.keyResponsibilities.length > 0 && (
          <div>
            <dt className="font-label text-[11px] font-semibold uppercase tracking-wide text-ca-muted">
              Parsed responsibilities
            </dt>
            <dd className="mt-3">
              <ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed text-ca-ink">
                {analysis.keyResponsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
