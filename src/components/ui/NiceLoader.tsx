"use client";

type Props = {
  label?: string;
  className?: string;
  /** Compact inline spinner for sidebars / cards */
  compact?: boolean;
};

export function NiceLoader({
  label = "Chargement…",
  className = "",
  compact = false,
}: Props) {
  if (compact) {
    return (
      <div
        className={`flex items-center justify-center gap-3 py-8 ${className}`}
        role="status"
        aria-live="polite"
      >
        <span className="loader-orb" />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-3xl bg-white px-5 py-14 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="loader-ring" />
        <span className="loader-pulse" />
        <span className="absolute h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="mt-1 text-xs text-slate-400">Un instant…</p>
      </div>
    </div>
  );
}

/** Full main-area loader (page content) */
export function PageLoader({ label = "Chargement…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[55vh] flex-col items-center justify-center gap-5"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="loader-ring" />
        <span className="loader-pulse" />
        <span className="absolute h-3 w-3 rounded-full bg-emerald-500" />
      </div>
      <div className="text-center">
        <p className="text-base font-medium text-slate-800">{label}</p>
        <p className="mt-1 text-sm text-slate-400">Un instant…</p>
      </div>
    </div>
  );
}

/** Skeleton rows for table-style lists */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-[72px] animate-pulse rounded-3xl bg-gradient-to-r from-white via-slate-50 to-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}
