"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  HeartPulse,
  Home,
  MapPinned,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { buildCitySummaries, labelKey } from "@/lib/analytics";
import type { CitySummary, Commande, Patient, Visite } from "@/lib/types";
import type { CommuneRow, QuartierRow, VilleRow } from "@/lib/geo-store";
import { formatDate, patientFullName } from "@/lib/format";
import { usePagination } from "@/hooks/usePagination";
import { PageLoader } from "@/components/ui/NiceLoader";
import { Pagination } from "@/components/ui/Pagination";
import { GoogleMapMock } from "@/components/maps/GoogleMapMock";
import type { MapPoint } from "@/components/maps/GoogleMapMock";
import { SummaryKpis } from "@/components/ui/SummaryKpis";
import { FilterToolbar } from "@/components/ui/FilterToolbar";

type Tab = "villes" | "communes" | "quartiers";

type VilleListItem = CitySummary & { id: string };

export function GeographieView() {
  const [tab, setTab] = useState<Tab>("villes");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [villes, setVilles] = useState<VilleRow[]>([]);
  const [communes, setCommunes] = useState<CommuneRow[]>([]);
  const [quartiers, setQuartiers] = useState<QuartierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<VilleListItem | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [pRes, vRes, cRes, villesRes, communesRes, quartiersRes] =
        await Promise.all([
          supabase.from("patients").select("*"),
          supabase.from("visites").select("*"),
          supabase.from("commandes").select("*"),
          supabase.from("villes").select("id, name, name_key").order("name"),
          supabase
            .from("communes")
            .select("id, name, name_key, ville_id")
            .order("name"),
          supabase
            .from("quartiers")
            .select("id, name, name_key, commune_id, ville_id")
            .order("name"),
        ]);

      const err =
        pRes.error?.message ||
        vRes.error?.message ||
        cRes.error?.message ||
        villesRes.error?.message ||
        communesRes.error?.message ||
        quartiersRes.error?.message;

      if (err) {
        setError(err);
      } else {
        setError(null);
        setPatients((pRes.data as Patient[]) ?? []);
        setVisites((vRes.data as Visite[]) ?? []);
        setCommandes((cRes.data as Commande[]) ?? []);
        setVilles((villesRes.data as VilleRow[]) ?? []);
        setCommunes((communesRes.data as CommuneRow[]) ?? []);
        setQuartiers((quartiersRes.data as QuartierRow[]) ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  /** Stats patients — enrichissent le catalogue, ne le remplacent pas */
  const citySummaries = useMemo(
    () => buildCitySummaries(patients, visites, commandes),
    [patients, visites, commandes],
  );

  const summaryByKey = useMemo(() => {
    const m = new Map<string, CitySummary>();
    for (const s of citySummaries) m.set(s.key, s);
    return m;
  }, [citySummaries]);

  const villeNameById = useMemo(() => {
    return new Map(villes.map((v) => [v.id, v.name]));
  }, [villes]);

  const communeNameById = useMemo(() => {
    return new Map(communes.map((c) => [c.id, c.name]));
  }, [communes]);

  /** Catalogue réel `villes` + stats + communes/quartiers liés */
  const villeRows = useMemo((): VilleListItem[] => {
    return villes.map((v) => {
      const stats = summaryByKey.get(v.name_key);
      const linkedCommunes = communes
        .filter((c) => c.ville_id === v.id)
        .map((c) => c.name);
      const linkedQuartiers = quartiers
        .filter((q) => q.ville_id === v.id)
        .map((q) => q.name);
      return {
        id: v.id,
        key: v.name_key,
        name: v.name,
        patientCount: stats?.patientCount ?? 0,
        visitCount: stats?.visitCount ?? 0,
        orderCount: stats?.orderCount ?? 0,
        diseases: stats?.diseases ?? [],
        communes: linkedCommunes,
        quartiers: linkedQuartiers,
        caseStatus: stats?.caseStatus ?? {},
      };
    });
  }, [villes, communes, quartiers, summaryByKey]);

  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return villeRows;
    return villeRows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.communes.some((x) => x.toLowerCase().includes(q)) ||
        c.quartiers.some((x) => x.toLowerCase().includes(q)),
    );
  }, [villeRows, search]);

  const filteredCommunes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return communes;
    return communes.filter((c) => {
      const ville = c.ville_id ? villeNameById.get(c.ville_id) : "";
      return (
        c.name.toLowerCase().includes(q) ||
        (ville || "").toLowerCase().includes(q)
      );
    });
  }, [communes, search, villeNameById]);

  const filteredQuartiers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quartiers;
    return quartiers.filter((row) => {
      const ville = row.ville_id ? villeNameById.get(row.ville_id) : "";
      const commune = row.commune_id
        ? communeNameById.get(row.commune_id)
        : "";
      return (
        row.name.toLowerCase().includes(q) ||
        (ville || "").toLowerCase().includes(q) ||
        (commune || "").toLowerCase().includes(q)
      );
    });
  }, [quartiers, search, villeNameById, communeNameById]);

  const listForPage =
    tab === "villes"
      ? filteredCities
      : tab === "communes"
        ? filteredCommunes
        : filteredQuartiers;

  const {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    from,
    to,
  } = usePagination(listForPage as unknown[], 20);

  const cityPatients = useMemo(() => {
    if (!selected) return [];
    return patients.filter((p) => labelKey(p.city ?? "") === selected.key);
  }, [selected, patients]);

  /** Pins carte = villes du catalogue (pas de mock) */
  const mapPoints = useMemo((): MapPoint[] => {
    return villeRows.map((v) => ({
      id: v.id,
      name: v.name,
      city: v.name,
      value: Math.max(v.patientCount, 1),
    }));
  }, [villeRows]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Données géographiques
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Villes, communes et quartiers — alimentés à la création des patients
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          {(error.toLowerCase().includes("city") ||
            error.toLowerCase().includes("villes") ||
            error.toLowerCase().includes("commune")) && (
            <span className="mt-1 block text-xs">
              Exécutez{" "}
              <code className="font-mono">
                supabase/migration_dossier_geo.sql
              </code>{" "}
              dans le SQL Editor Supabase.
            </span>
          )}
        </div>
      )}

      <SummaryKpis
        columns={3}
        items={[
          {
            label: "Villes",
            value: loading ? "—" : String(villes.length),
            iconSrc: "/icons/kpi-city.svg",
            tone: "emerald",
          },
          {
            label: "Communes",
            value: loading ? "—" : String(communes.length),
            iconSrc: "/icons/kpi-commune.svg",
            tone: "sky",
          },
          {
            label: "Quartiers",
            value: loading ? "—" : String(quartiers.length),
            iconSrc: "/icons/kpi-quartier.svg",
            tone: "violet",
          },
        ]}
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "villes", label: "Villes" },
            { id: "communes", label: "Communes" },
            { id: "quartiers", label: "Quartiers" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSearch("");
            }}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                : "bg-white text-slate-500 shadow-sm hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Rechercher ${tab}…`}
      />

      <div className="data-table">
        {loading && <PageLoader label="Chargement…" />}
        {!loading && total === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Aucune donnée — créez un patient avec ville / commune / quartier
            (elles seront enregistrées ici automatiquement)
          </div>
        )}
        {!loading && tab === "villes" && total > 0 && (
          <div className="data-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ville</th>
                  <th>Patients</th>
                  <th>Visites</th>
                  <th>Communes</th>
                  <th>Quartiers</th>
                  <th>Maladies</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(pageItems as VilleListItem[]).map((city) => (
                  <tr
                    key={city.id}
                    className="row-click"
                    onClick={() => setSelected(city)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <MapPinned strokeWidth={1.75} className="h-4 w-4" />
                        </span>
                        <span className="cell-strong">{city.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        <Users strokeWidth={1.75} className="h-3.5 w-3.5 text-slate-400" />
                        {city.patientCount}
                      </span>
                    </td>
                    <td>{city.visitCount}</td>
                    <td>{city.communes.length}</td>
                    <td>{city.quartiers.length}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        <HeartPulse
                          strokeWidth={1.75}
                          className="h-3.5 w-3.5 text-slate-400"
                        />
                        {city.diseases.length}
                      </span>
                    </td>
                    <td className="text-right text-slate-300">
                      <ChevronRight className="ml-auto h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && tab === "communes" && total > 0 && (
          <div className="data-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Commune</th>
                  <th>Ville liée</th>
                </tr>
              </thead>
              <tbody>
                {(pageItems as CommuneRow[]).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                          <Building2 strokeWidth={1.75} className="h-4 w-4" />
                        </span>
                        <span className="cell-strong">{c.name}</span>
                      </div>
                    </td>
                    <td className="cell-muted">
                      {c.ville_id
                        ? villeNameById.get(c.ville_id) || "—"
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && tab === "quartiers" && total > 0 && (
          <div className="data-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Quartier</th>
                  <th>Commune</th>
                  <th>Ville liée</th>
                </tr>
              </thead>
              <tbody>
                {(pageItems as QuartierRow[]).map((q) => (
                  <tr key={q.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                          <Home strokeWidth={1.75} className="h-4 w-4" />
                        </span>
                        <span className="cell-strong">{q.name}</span>
                      </div>
                    </td>
                    <td className="cell-muted">
                      {q.commune_id
                        ? communeNameById.get(q.commune_id) || "—"
                        : "—"}
                    </td>
                    <td className="cell-muted">
                      {q.ville_id
                        ? villeNameById.get(q.ville_id) || "—"
                        : "—"}
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
          from={from}
          to={to}
          onPageChange={setPage}
          label={tab}
        />
      )}

      <GoogleMapMock
        points={mapPoints}
        title="Carte géographique"
        subtitle="Villes du catalogue — Côte d'Ivoire"
        heightClass="h-80"
      />

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
      <aside className="relative z-10 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                Dossier géographique
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
              Communes ({city.communes?.length ?? 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {(city.communes?.length ?? 0) === 0 && (
                <p className="text-sm text-slate-400">Aucune commune</p>
              )}
              {city.communes?.map((q) => (
                <span
                  key={q}
                  className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                >
                  {q}
                </span>
              ))}
            </div>
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
              Maladies ({city.diseases.length})
            </h3>
            <div className="flex flex-wrap gap-2">
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
                    {[p.quartier, p.commune].filter(Boolean).join(" · ") ||
                      "—"}{" "}
                    · {formatDate(p.created_at)}
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
