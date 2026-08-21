"use client";

import Image from "next/image";

export type KpiItem = {
  label: string;
  value: string;
  hint?: string;
  /** Flat 2D icon path under /public/icons */
  iconSrc: string;
  tone?:
    | "blue"
    | "emerald"
    | "violet"
    | "amber"
    | "rose"
    | "sky"
    | "orange"
    | "yellow";
};

const tones: Record<
  NonNullable<KpiItem["tone"]>,
  { card: string; label: string; hint: string; badge: string }
> = {
  blue: {
    card: "from-blue-500 to-blue-600",
    label: "text-blue-100",
    hint: "text-blue-200",
    badge: "bg-white/15 ring-white/25",
  },
  emerald: {
    card: "from-emerald-500 to-green-600",
    label: "text-emerald-100",
    hint: "text-emerald-200",
    badge: "bg-white/15 ring-white/25",
  },
  violet: {
    card: "from-purple-500 to-purple-600",
    label: "text-purple-100",
    hint: "text-purple-200",
    badge: "bg-white/15 ring-white/25",
  },
  amber: {
    card: "from-amber-500 to-orange-600",
    label: "text-amber-100",
    hint: "text-amber-200",
    badge: "bg-white/15 ring-white/25",
  },
  rose: {
    card: "from-rose-500 to-red-600",
    label: "text-rose-100",
    hint: "text-rose-200",
    badge: "bg-white/15 ring-white/25",
  },
  sky: {
    card: "from-sky-500 to-cyan-600",
    label: "text-sky-100",
    hint: "text-sky-200",
    badge: "bg-white/15 ring-white/25",
  },
  orange: {
    card: "from-orange-500 to-orange-600",
    label: "text-orange-100",
    hint: "text-orange-200",
    badge: "bg-white/15 ring-white/25",
  },
  yellow: {
    card: "from-yellow-500 to-yellow-600",
    label: "text-yellow-100",
    hint: "text-yellow-200",
    badge: "bg-white/15 ring-white/25",
  },
};

type Props = {
  items: KpiItem[];
  columns?: 2 | 3 | 4;
};

/** Salam-style gradient summary cards with flat 2D icons */
export function SummaryKpis({ items, columns = 4 }: Props) {
  const cols =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 xl:grid-cols-3"
        : "sm:grid-cols-2 xl:grid-cols-4";

  return (
    <section className={`mb-2 grid gap-4 md:gap-6 ${cols}`}>
      {items.map((item) => {
        const tone = tones[item.tone ?? "blue"];
        return (
          <article
            key={item.label}
            className={`rounded-2xl bg-gradient-to-r ${tone.card} p-5 text-white shadow-md shadow-slate-900/10 sm:p-6`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm ${tone.label}`}>{item.label}</p>
                <p className="mt-1 truncate text-2xl font-bold tracking-tight">
                  {item.value}
                </p>
                {item.hint && (
                  <p className={`mt-1 text-xs ${tone.hint}`}>{item.hint}</p>
                )}
              </div>
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1 ${tone.badge}`}
              >
                <Image
                  src={item.iconSrc}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10"
                  unoptimized
                />
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
