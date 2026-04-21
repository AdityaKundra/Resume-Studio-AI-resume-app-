import type { AdvancedATSResult } from "@/lib/types";

type Props = {
  advanced: AdvancedATSResult;
  /** Runs improve-resume with missing keywords and recomputes ATS. */
  onBoost?: () => void;
  boostLoading?: boolean;
};

function Bar({
  label,
  value,
  weightPercent,
}: {
  label: string;
  value: number;
  weightPercent: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] text-ca-muted">
        <span>
          {label}{" "}
          <span className="text-ca-muted/80">({weightPercent}%)</span>
        </span>
        <span className="tabular-nums font-semibold text-ca-ink">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ca-low ring-1 ring-ca-ink/[0.08]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-ca-primary to-ca-primary-dim transition-[width] duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

export function AtsDashboard({ advanced, onBoost, boostLoading }: Props) {
  const b = advanced.breakdown;
  const placement = advanced.placementBonus ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-ca bg-ca-low px-4 py-5 shadow-ca">
        <div>
          <p className="font-label text-[11px] font-semibold uppercase tracking-wide text-ca-muted">
            Composite score
          </p>
          <p className="font-display mt-1 text-4xl font-bold tabular-nums tracking-tight text-ca-ink">
            {advanced.score}
            <span className="text-xl font-semibold text-ca-muted">/100</span>
          </p>
          {placement > 0 && (
            <p className="mt-1 text-[10px] text-ca-muted">
              Includes +{placement} placement bonus (terms in both skills &amp;
              experience)
            </p>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <p className="max-w-[220px] text-[10px] leading-snug text-ca-muted">
            Weighted: keyword 40% · semantic 25% · skills 20% · sections 10% ·
            formatting 5% · small placement bonus. Estimate only.
          </p>
          {onBoost && (
            <button
              type="button"
              onClick={onBoost}
              disabled={boostLoading}
              className="rounded-ca bg-ca-primary px-4 py-2 text-xs font-semibold text-white shadow-ca transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {boostLoading ? "Boosting…" : "Boost ATS score"}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Bar
          label="Keyword match"
          value={b?.keywordMatch ?? advanced.keywordScore}
          weightPercent={40}
        />
        <Bar
          label="Semantic similarity"
          value={b?.semantic ?? advanced.semanticScore}
          weightPercent={25}
        />
        <Bar
          label="Skills coverage"
          value={b?.skills ?? advanced.skillsScore}
          weightPercent={20}
        />
        <Bar
          label="Section completeness"
          value={b?.sections ?? advanced.sectionScore}
          weightPercent={10}
        />
        <Bar
          label="Formatting"
          value={b?.formatting ?? advanced.formattingScore}
          weightPercent={5}
        />
      </div>

      {advanced.matchedKeywords.length > 0 && (
        <div>
          <p className="font-label text-[11px] font-semibold uppercase tracking-wide text-ca-muted">
            Matched keywords
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {advanced.matchedKeywords.slice(0, 24).map((kw) => (
              <span
                key={kw}
                className="rounded-full bg-ca-success-soft px-2.5 py-0.5 text-[11px] font-medium text-ca-success ring-1 ring-ca-success/20"
              >
                {kw}
              </span>
            ))}
            {advanced.matchedKeywords.length > 24 && (
              <span className="self-center text-[11px] text-ca-muted">
                +{advanced.matchedKeywords.length - 24} more
              </span>
            )}
          </div>
        </div>
      )}

      {advanced.missingKeywords.length > 0 && (
        <div>
          <p className="font-label text-[11px] font-semibold uppercase tracking-wide text-ca-muted">
            Missing keywords
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {advanced.missingKeywords.slice(0, 20).map((kw) => (
              <span
                key={kw}
                className="rounded-full bg-ca-danger-soft px-2.5 py-0.5 text-[11px] font-medium text-ca-danger ring-1 ring-ca-danger/20"
              >
                {kw}
              </span>
            ))}
            {advanced.missingKeywords.length > 20 && (
              <span className="self-center text-[11px] text-ca-muted">
                +{advanced.missingKeywords.length - 20} more
              </span>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="font-label text-[11px] font-semibold uppercase tracking-wide text-ca-muted">
          Suggested next steps
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-4 text-xs leading-relaxed text-ca-ink">
          {advanced.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
