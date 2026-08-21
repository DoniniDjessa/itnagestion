"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  HeartPulse,
  MapPinned,
  Search,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { buildCitySummaries, labelKey } from "@/lib/analytics";
import type { CitySummary, Commande, Patient, Visite } from "@/lib/types";
import { formatDate, patientFullName } from "@/lib/format";
import { usePagination } from "@/hooks/usePagination";
import { TableSkeleton } from "@/components/ui/NiceLoader";
import { Pagination } from "@/components/ui/Pagination";

export function VillesView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CitySummary | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [pRes, vRes, cRes] = await Promise.all([
        supabase.from("patients").select("*"),
        supabase.from("visites").select("*"),
        supabase.from("commandes").select("*"),
      ]);
      if (pRes.error || vRes.error || cRes.error) {
        setError(
          pRes.error?.message ||
            vRes.error?.message ||
            cRes.error?.message ||
            "Erreur",
        );
      } else {
        setError(null);
        setPatients((pRes.data as Patient[]) ?? []);
        setVisites((vRes.data as Visite[]) ?? []);
        setCommandes((cRes.data as Commande[]) ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const cities = useMemo(
    () => buildCitySummaries(patients, visites, commandes),
    [patients, visites, commandes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.quartiers.some((qtr) => qtr.toLowerCase().includes(q)) ||
        c.diseases.some((d) => d.toLowerCase().includes(q)),
    );
  }, [cities, search]);

  const {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    from,
    to,
  } = usePagination(filtered, 10);

  const cityPatients = useMemo(() => {
    if (!selected) return [];
    return patients.filter((p) => labelKey(p.city ?? "") === selected.key);
  }, [selected, patients]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Villes
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Patients, cas et pathologies par zone géographique
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          {error.toLowerCase().includes("city") && (
            <span className="mt-1 block text-xs">
              Exécutez{" "}
              <code className="font-mono">
                supabase/migration_dossier_geo.sql
              </code>
            </span>
          )}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Villes suivies"
          value={loading ? "—" : String(cities.length)}
        />
        <SummaryCard
          label="Patients localisés"
          value={
            loading
              ? "—"
              : String(cities.reduce((s, c) => s + c.patientCount, 0))
          }
        />
        <SummaryCard
          label="Visites liées"
          value={
            loading
              ? "—"
              : String(cities.reduce((s, c) => s + c.visitCount, 0))
          }
        />
      </section>

      <div className="relative max-w-md">
        <Search
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une ville, quartier…"
          className="w-full rounded-2xl border-0 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.04)] outline-none ring-emerald-500/20 placeholder:text-slate-400 focus:ring-4"
        />
      </div>

      <div className="space-y-3">
        {loading && <TableSkeleton rows={5} />}
        {!loading && filtered.length === 0 && (
          <div className="rounded-3xl bg-white px-5 py-10 text-center text-sm text-slate-400">
            Aucune ville — renseignez le champ Ville sur les patients
          </div>
        )}
        {pageItems.map((city) => (
          <button
            key={city.key}
            type="button"
            onClick={() => setSelected(city)}
            className="table-card w-full grid-cols-1 text-left md:grid-cols-[1.4fr_1fr_1fr_1fr_40px]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <MapPinned strokeWidth={1.75} className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium">{city.name}</p>
                <p className="muted mt-0.5 text-xs text-slate-400">
                  {city.quartiers.length} quartier
                  {city.quartiers.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <span className="muted inline-flex items-center gap-1.5 text-sm text-slate-600">
              <Users strokeWidth={1.75} className="h-3.5 w-3.5" />
              {city.patientCount}
            </span>
            <span className="muted text-sm text-slate-600">
              {city.visitCount} visite{city.visitCount > 1 ? "s" : ""}
            </span>
            <span className="muted inline-flex items-center gap-1.5 text-sm text-slate-600">
              <HeartPulse strokeWidth={1.75} className="h-3.5 w-3.5" />
              {city.diseases.length} maladie
              {city.diseases.length > 1 ? "s" : ""}
            </span>
            <span className="flex justify-end text-slate-400 group-hover:text-white">
              <ChevronRight strokeWidth={1.75} className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>

      {!loading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          from={from}
          to={to}
          onPageChange={setPage}
          label="villes"
        />
      )}

      {selected && (
        <CityDetailSidebar
          city={selected}
          patients={cityPatients}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function CityDetailSidebar({
  city,
  patients,
  onClose,
}: {
  city: CitySummary;
  patients: Patient[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                Dossier ville
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                {city.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
            >
              <X strokeWidth={1.75} className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniKpi label="Patients" value={String(city.patientCount)} />
            <MiniKpi label="Visites" value={String(city.visitCount)} />
            <MiniKpi label="Commandes" value={String(city.orderCount)} />
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              État des cas
            </h3>
            {Object.keys(city.caseStatus).length === 0 ? (
              <p className="text-sm text-slate-400">Non renseigné</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(city.caseStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <li
                      key={status}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="text-slate-700">{status}</span>
                      <span className="font-semibold text-slate-900">
                        {count}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Quartiers ({city.quartiers.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {city.quartiers.length === 0 && (
                <p className="text-sm text-slate-400">Aucun quartier</p>
              )}
              {city.quartiers.map((q) => (
                <span
                  key={q}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {q}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Maladies présentes ({city.diseases.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {city.diseases.length === 0 && (
                <p className="text-sm text-slate-400">Aucune pathologie</p>
              )}
              {city.diseases.map((d) => (
                <span
                  key={d}
                  className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700"
                >
                  {d}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Patients ({patients.length})
            </h3>
            <ul className="space-y-2">
              {patients.map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl border border-slate-100 px-4 py-3"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {patientFullName(p.first_name, p.last_name)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {p.quartier || "Quartier N/D"} · {p.phone || "Sans tél."} ·{" "}
                    {formatDate(p.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
