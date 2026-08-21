"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  label?: string;
};

export function Pagination({
  page,
  totalPages,
  total,
  from,
  to,
  onPageChange,
  label = "éléments",
}: Props) {
  if (total === 0) return null;

  const windowPages = buildWindow(page, totalPages);

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-400 sm:text-sm">
        {from}–{to} sur {total} {label}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-35"
          aria-label="Page précédente"
        >
          <ChevronLeft strokeWidth={1.75} className="h-4 w-4" />
        </button>

        {windowPages.map((p, i) =>
          p === "…" ? (
            <span
              key={`e-${i}`}
              className="px-1 text-xs text-slate-300"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-medium transition ${
                p === page
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-35"
          aria-label="Page suivante"
        >
          <ChevronRight strokeWidth={1.75} className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function buildWindow(page: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, page]);
  for (let i = page - 1; i <= page + 1; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("…");
    out.push(sorted[i]);
  }
  return out;
}
