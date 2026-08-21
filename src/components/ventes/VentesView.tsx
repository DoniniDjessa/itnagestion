"use client";

import { useEffect, useMemo, useState } from "react";
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
import { usePagination } from "@/hooks/usePagination";
import { PageLoader } from "@/components/ui/NiceLoader";
import { Pagination } from "@/components/ui/Pagination";
import { SummaryKpis } from "@/components/ui/SummaryKpis";
import { FilterToolbar, DatePresetChips } from "@/components/ui/FilterToolbar";

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

  const {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    from: pageFrom,
    to: pageTo,
  } = usePagination(filtered, 10);

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

      <SummaryKpis
        items={[
          {
            label: "Chiffre d'affaires",
            value: formatCurrency(summary.total),
            iconSrc: "/icons/kpi-money.svg",
            tone: "emerald",
          },
          {
            label: "Nombre de ventes",
            value: String(summary.count),
            iconSrc: "/icons/kpi-receipt.svg",
            tone: "blue",
          },
          {
            label: "Articles vendus",
            value: String(summary.itemsCount),
            iconSrc: "/icons/kpi-products.svg",
            tone: "violet",
          },
          {
            label: "Panier moyen",
            value: formatCurrency(summary.avg),
            iconSrc: "/icons/kpi-cart.svg",
            tone: "amber",
          },
        ]}
      />

      <FilterToolbar
        search={productQuery}
        onSearchChange={setProductQuery}
        searchPlaceholder="Produit, code, prix…"
      >
        <DatePresetChips
          value={preset}
          onChange={(v) => setPreset(v as DatePreset)}
          options={presets.map((p) => ({ id: p.id, label: p.label }))}
        />
      </FilterToolbar>

      <section className="space-y-4 rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5">
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
        </div>
      </section>

      <div className="data-table">
        {loading && <PageLoader label="Chargement des ventes…" />}
        {!loading && filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Aucune vente pour ces filtres. Passez une commande en statut{" "}
            <span className="font-medium text-emerald-600">Payée</span>.
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="data-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Produits</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((sale) => (
                  <tr key={sale.id}>
                    <td className="cell-strong">{sale.reference_id}</td>
                    <td>
                      {sale.patients
                        ? patientFullName(
                            sale.patients.first_name,
                            sale.patients.last_name,
                          )
                        : "—"}
                    </td>
                    <td>{formatDate(sale.created_at)}</td>
                    <td className="font-semibold text-emerald-600">
                      {formatCurrency(Number(sale.total_amount))}
                    </td>
                    <td>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          from={pageFrom}
          to={pageTo}
          onPageChange={setPage}
          label="ventes"
        />
      )}
    </div>
  );
}
