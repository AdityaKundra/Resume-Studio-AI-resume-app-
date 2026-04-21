type Props = {
  label: string;
  value: string;
  active?: boolean;
  variant?: "default" | "success" | "warning";
};

export function StatusBadge({
  label,
  value,
  active,
  variant = "default",
}: Props) {
  const styles =
    variant === "success"
      ? "bg-ca-success-soft text-ca-success ring-1 ring-ca-success/20"
      : variant === "warning"
        ? "bg-ca-warning-soft text-ca-warning ring-1 ring-ca-warning/25"
        : active
          ? "bg-ca-primary-soft text-ca-primary-ink ring-1 ring-ca-primary/20"
          : "bg-ca-highest/80 text-ca-muted ring-1 ring-ca-ink/[0.06]";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-ca px-2.5 py-1 text-xs shadow-ca transition-transform duration-200 hover:scale-[1.02] ${styles}`}
    >
      <span className="font-label font-medium opacity-80">{label}</span>
      <span
        className={`max-w-[140px] truncate font-semibold tabular-nums ${
          variant === "success"
            ? "text-ca-success"
            : variant === "warning"
              ? "text-ca-warning"
              : active
                ? "text-ca-primary-ink"
                : "text-ca-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
