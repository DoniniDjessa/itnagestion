"use client";

import { Search } from "lucide-react";

export type FilterSelect = {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  widthClass?: string;
};

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  /** Extra controls on the right (date inputs, etc.) */
  children?: React.ReactNode;
};

export function FilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Rechercher…",
  selects = [],
  children,
}: Props) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            strokeWidth={1.75}
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none ring-emerald-500/20 placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selects.map((sel) => (
            <label key={sel.id} className="flex items-center gap-2">
              {sel.label && (
                <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                  {sel.label}
                </span>
              )}
              <select
                value={sel.value}
                onChange={(e) => sel.onChange(e.target.value)}
                className={`field h-10 py-0 ${sel.widthClass ?? "w-40"}`}
              >
                {sel.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {children}
        </div>
      </div>
    </div>
  );
}

/** Compact date preset chips like Salam Boucherie */
export function DatePresetChips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
            value === opt.id
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
              : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
