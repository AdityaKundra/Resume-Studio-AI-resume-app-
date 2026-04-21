import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function SectionShell({
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "",
}: Props) {
  return (
    <section
      className={`group flex flex-col overflow-hidden rounded-ca-xl bg-ca-low shadow-ca ring-1 ring-ca-ink/[0.04] transition-shadow duration-300 hover:shadow-ca-ambient ${className}`}
    >
      <header className="flex flex-col gap-3 bg-ca-low/95 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0">
          <p className="font-label text-[10px] font-semibold uppercase tracking-[0.14em] text-ca-primary">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-ca-ink sm:text-xl">
            {title}
          </h2>
          {description && (
            <p className="mt-2 max-w-prose text-xs leading-relaxed text-ca-muted">
              {description}
            </p>
          )}
        </div>
        {action ? (
          <div className="shrink-0 sm:pt-0.5">{action}</div>
        ) : null}
      </header>
      <div
        className={`min-h-0 flex-1 bg-ca-lowest px-5 py-5 sm:px-6 sm:py-6 ${bodyClassName}`}
      >
        {children}
      </div>
    </section>
  );
}
