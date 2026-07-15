"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Package,
  Receipt,
  Search,
  ShoppingBag,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Commande, OrderItem } from "@/lib/types";
import { SALE_STATUS } from "@/lib/types";
import {
  currentMonthValue,
  getPresetRange,
  inDateRange,
  todayValue,
  type DatePreset,
} from "@/lib/date-filters";
import { formatCurrency, formatDate, patientFullName } from "@/lib/format";

const presets: { id: DatePreset; label: string }[] = [
  { id: "avant_hier", label: "Avant-hier" },
  { id: "hier", label: "Hier" },
  { id: "aujourd_hui", label: "Aujourd'hui" },
  { id: "custom_day", label: "Jour" },
  { id: "range", label: "Période" },
  { id: "month", label: "Mois" },
];

function matchesProductFilter(items: OrderItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return items.some((item) => {
    const name = (item.name || "").toLowerCase();
    const code = (item.code || "").toLowerCase();
    const price = String(item.price ?? "");
    return name.includes(q) || code.includes(q) || price.includes(q);
  });
}

export function VentesView() {
  const [sales, setSales] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DatePreset>("aujourd_hui");
  const [day, setDay] = useState(todayValue());
  const [from, setFrom] = useState(todayValue());
  const [to, setTo] = useState(todayValue());
  const [month, setMonth] = useState(currentMonthValue());
  const [productQuery, setProductQuery] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("commandes")
        .select("*, patients(id, first_name, last_name)")
        .eq("status", SALE_STATUS)
        .order("created_at", { ascending: false });

      if (fetchError) setError(fetchError.message);
      else {
        setError(null);
        setSales((data as Commande[]) ?? []);
      }
      setLoading(false);
    }

    load();
  }, []);

  const range = useMemo(
    () => getPresetRange(preset, { day, from, to, month }),
    [preset, day, from, to, month],
  );

  const filtered = useMemo(() => {
    return sales.filter(
      (sale) =>
        inDateRange(sale.created_at, range) &&
        matchesProductFilter(
          Array.isArray(sale.items) ? sale.items : [],
          productQuery,
        ),
    );
  }, [sales, range, productQuery]);

  const summary = useMemo(() => {
    const total = filtered.reduce(
      (sum, s) => sum + Number(s.total_amount || 0),
      0,
    );
    const itemsCount = filtered.reduce(
      (sum, s) =>
        sum +
        (Array.isArray(s.items)
          ? s.items.reduce((n, i) => n + Number(i.qty || 0), 0)
          : 0),
      0,
    );
    const avg = filtered.length ? total / filtered.length : 0;
    return { total, count: filtered.length, itemsCount, avg };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Ventes
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Commandes livrées et payées ({SALE_STATUS})
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Chiffre d'affaires"
          value={formatCurrency(summary.total)}
          icon={Banknote}
        />
        <SummaryCard
          label="Nombre de ventes"
          value={String(summary.count)}
          icon={Receipt}
        />
        <SummaryCard
          label="Articles vendus"
          value={String(summary.itemsCount)}
          icon={Package}
        />
        <SummaryCard
          label="Panier moyen"
          value={formatCurrency(summary.avg)}
          icon={ShoppingBag}
        />
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                preset === p.id
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {preset === "custom_day" && (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Jour</span>
              <input
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="field"
              />
            </label>
          )}
          {preset === "range" && (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  Du
                </span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="field"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-500">
                  Au
                </span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="field"
                />
              </label>
            </>
          )}
          {preset === "month" && (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500">Mois</span>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="field"
              />
            </label>
          )}

          <label className="block space-y-1 sm:col-span-2 lg:col-span-2">
            <span className="text-xs font-medium text-slate-500">
              Produit (nom, code, prix)
            </span>
            <div className="relative">
              <Search
                strokeWidth={1.75}
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Ex: Paracétamol, PRD-01, 500…"
                className="field pl-10"
              />
            </div>
          </label>
        </div>
      </section>

      <div className="space-y-3">
        <div className="hidden grid-cols-[0.9fr_1.1fr_1fr_0.8fr_1.4fr] gap-3 px-5 text-xs font-medium uppercase tracking-wide text-slate-400 lg:grid">
          <span>Référence</span>
          <span>Patient</span>
          <span>Date</span>
          <span>Montant</span>
          <span>Produits</span>
        </div>

        {loading && (
          <div className="rounded-3xl bg-white px-5 py-10 text-center text-sm text-slate-400 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            Chargement…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="rounded-3xl bg-white px-5 py-10 text-center text-sm text-slate-400 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            Aucune vente pour ces filtres. Passez une commande en statut{" "}
            <span className="font-medium text-emerald-600">Payée</span>.
          </div>
        )}

        {filtered.map((sale) => (
          <article
            key={sale.id}
            className="rounded-3xl bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
          >
            <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr_1fr_0.8fr_1.4fr] lg:items-center">
              <p className="font-semibold text-slate-900">
                {sale.reference_id}
              </p>
              <p className="text-sm text-slate-600">
                {sale.patients
                  ? patientFullName(
                      sale.patients.first_name,
                      sale.patients.last_name,
                    )
                  : "—"}
              </p>
              <p className="text-sm text-slate-600">
                {formatDate(sale.created_at)}
              </p>
              <p className="font-semibold text-emerald-600">
                {formatCurrency(Number(sale.total_amount))}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(sale.items || []).map((item, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700"
                  >
                    {item.code ? `${item.code} · ` : ""}
                    {item.name} ×{item.qty}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <article className="rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-600">
          <Icon strokeWidth={1.75} className="h-4 w-4" />
        </div>
      </div>
    </article>
  );
}
