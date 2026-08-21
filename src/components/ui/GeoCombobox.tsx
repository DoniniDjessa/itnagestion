"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  /** Fetch suggestions; called when query length >= 3 */
  onSearch: (query: string) => Promise<string[]>;
  disabled?: boolean;
};

export function GeoCombobox({
  label,
  value,
  onChange,
  placeholder,
  required,
  onSearch,
  disabled,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3) {
      setOptions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const results = await onSearch(q);
      if (!cancelled) {
        setOptions(results);
        setLoading(false);
        setOpen(true);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, onSearch]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const showCreateHint =
    value.trim().length >= 3 &&
    !options.some((o) => o.toLowerCase() === value.trim().toLowerCase());

  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div ref={wrapRef} className="relative">
        <MapPin
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500/70"
        />
        <input
          required={required}
          disabled={disabled}
          value={value}
          list={listId}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value.trim().length >= 3) setOpen(true);
          }}
          onFocus={() => {
            if (value.trim().length >= 3) setOpen(true);
          }}
          className="field pl-9 pr-9"
        />
        <ChevronDown
          strokeWidth={1.75}
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300"
        />

        {open && value.trim().length >= 3 && (
          <ul className="absolute z-30 mt-1.5 max-h-48 w-full overflow-y-auto rounded-2xl border border-slate-100 bg-white py-1 shadow-xl shadow-slate-900/10">
            {loading && (
              <li className="px-3 py-2 text-xs text-slate-400">Recherche…</li>
            )}
            {!loading && options.length === 0 && (
              <li className="px-3 py-2 text-xs text-slate-400">
                Aucun résultat — sera créé à l&apos;enregistrement
              </li>
            )}
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  {opt}
                </button>
              </li>
            ))}
            {showCreateHint && !loading && (
              <li className="border-t border-slate-50 px-3 py-2 text-[11px] text-emerald-600">
                Nouveau : « {value.trim()} » sera ajouté au catalogue
              </li>
            )}
          </ul>
        )}
      </div>
      {value.trim().length > 0 && value.trim().length < 3 && (
        <span className="text-[11px] text-slate-400">
          Tapez au moins 3 caractères pour suggérer
        </span>
      )}
    </label>
  );
}
