"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronRight,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { buildDiseaseSummaries, labelKey } from "@/lib/analytics";
import type {
  Commande,
  DiseaseSummary,
  Patient,
  Visite,
} from "@/lib/types";
import { formatDate, patientFullName } from "@/lib/format";
import { usePagination } from "@/hooks/usePagination";
import { PageLoader } from "@/components/ui/NiceLoader";
import { Pagination } from "@/components/ui/Pagination";
import { SummaryKpis } from "@/components/ui/SummaryKpis";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import {
  GoogleMapMock,
  useMapPointsFromPatients,
} from "@/components/maps/GoogleMapMock";

export function MaladiesView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [trendFilter, setTrendFilter] = useState("all");
  const [selected, setSelected] = useState<DiseaseSummary | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

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

  const diseases = useMemo(
    () => buildDiseaseSummaries(patients, visites, commandes),
    [patients, visites, commandes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return diseases.filter((d) => {
      if (trendFilter !== "all" && d.trend !== trendFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.cities.some((c) => c.toLowerCase().includes(q)) ||
        d.quartiers.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [diseases, search, trendFilter]);

  const mapPoints = useMapPointsFromPatients(patients);

  const diseaseKpis = useMemo(
    () => [
      {
        label: "Pathologies",
        value: loading ? "—" : String(filtered.length),
        iconSrc: "/icons/kpi-disease.svg",
        tone: "rose" as const,
      },
      {
        label: "Cas actifs",
        value: loading
          ? "—"
          : String(
              filtered.reduce((s, d) => s + (d.caseStatus["Actif"] ?? 0), 0),
            ),
        iconSrc: "/icons/kpi-active.svg",
        tone: "amber" as const,
      },
      {
        label: "En croissance",
        value: loading
          ? "—"
          : String(filtered.filter((d) => d.trend === "Croissance").length),
        iconSrc: "/icons/kpi-growth.svg",
        tone: "orange" as const,
      },
      {
        label: "En diminution",
        value: loading
          ? "—"
          : String(filtered.filter((d) => d.trend === "Diminution").length),
        iconSrc: "/icons/kpi-down.svg",
        tone: "sky" as const,
      },
    ],
    [filtered, loading],
  );

  const {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    from,
    to,
  } = usePagination(filtered, 10);

  const linkedPatients = useMemo(() => {
    if (!selected) return [];
    const key = selected.key;
    const ids = new Set<string>();
    for (const v of visites) {
      if (labelKey(v.diagnosis ?? "") === key) ids.add(v.patient_id);
    }
    for (const c of commandes) {
      if (labelKey(c.disease_to_treat ?? "") === key) ids.add(c.patient_id);
    }
    return patients.filter((p) => ids.has(p.id));
  }, [selected, patients, visites, commandes]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Maladies
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Patients, villes, quartiers et état des cas par pathologie
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <PageLoader label="Chargement des maladies…" />
      ) : (
        <>
      <SummaryKpis items={diseaseKpis} />

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher une maladie, ville…"
        selects={[
          {
            id: "trend",
            value: trendFilter,
            onChange: setTrendFilter,
            options: [
              { value: "all", label: "Toutes tendances" },
              { value: "Croissance", label: "Croissance" },
              { value: "Diminution", label: "Diminution" },
              { value: "Stable", label: "Stable" },
            ],
          },
        ]}
      />

      <GoogleMapMock
        points={mapPoints}
        title="Répartition géographique des cas"
        subtitle="Google Maps mockup — Côte d'Ivoire"
        heightClass="h-80"
        showFullscreenButton
        fullscreen={mapOpen}
        onFullscreenChange={setMapOpen}
      />

      <div className="data-table">
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Aucune maladie — ajoutez des diagnostics sur les visites
          </div>
        )}
        {filtered.length > 0 && (
          <div className="data-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Maladie</th>
                  <th>Patients</th>
                  <th>Villes</th>
                  <th>Tendance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((disease) => (
                  <tr
                    key={disease.key}
                    className="row-click"
                    onClick={() => setSelected(disease)}
                  >
                    <td>
                      <p className="cell-strong">{disease.name}</p>
                      <p className="cell-muted">
                        {disease.visitCount} visite
                        {disease.visitCount > 1 ? "s" : ""} ·{" "}
                        {disease.orderCount} commande
                        {disease.orderCount > 1 ? "s" : ""}
                      </p>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        <Users
                          strokeWidth={1.75}
                          className="h-3.5 w-3.5 text-slate-400"
                        />
                        {disease.patientCount}
                      </span>
                    </td>
                    <td>
                      {disease.cities.length
                        ? disease.cities.slice(0, 2).join(", ")
                        : "—"}
                      {disease.cities.length > 2
                        ? ` +${disease.cities.length - 2}`
                        : ""}
                    </td>
                    <td>
                      <TrendBadge trend={disease.trend} />
                    </td>
                    <td className="text-right text-slate-300">
                      <ChevronRight
                        strokeWidth={1.75}
                        className="ml-auto h-4 w-4"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        from={from}
        to={to}
        onPageChange={setPage}
        label="maladies"
      />
        </>
      )}

      {selected && (
        <DiseaseDetailSidebar
          disease={selected}
          patients={linkedPatients}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function DiseaseDetailSidebar({
  disease,
  patients,
  onClose,
}: {
  disease: DiseaseSummary;
  patients: Patient[];
  onClose: () => void;
}) {
  const statusEntries = Object.entries(disease.caseStatus).sort(
    (a, b) => b[1] - a[1],
  );

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
                Dossier maladie
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                {disease.name}
              </h2>
              <div className="mt-2">
                <TrendBadge trend={disease.trend} />
              </div>
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
            <MiniKpi label="Patients" value={String(disease.patientCount)} />
            <MiniKpi label="Visites" value={String(disease.visitCount)} />
            <MiniKpi label="Commandes" value={String(disease.orderCount)} />
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              État des cas
            </h3>
            {statusEntries.length === 0 ? (
              <p className="text-sm text-slate-400">Non renseigné</p>
            ) : (
              <ul className="space-y-2">
                {statusEntries.map(([status, count]) => (
                  <li
                    key={status}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-700">{status}</span>
                    <span className="font-semibold text-slate-900">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Villes concernées ({disease.cities.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {disease.cities.length === 0 && (
                <p className="text-sm text-slate-400">Aucune ville liée</p>
              )}
              {disease.cities.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                >
                  {c}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Quartiers ({disease.quartiers.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {disease.quartiers.length === 0 && (
                <p className="text-sm text-slate-400">Aucun quartier lié</p>
              )}
              {disease.quartiers.map((q) => (
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
              Patients ({patients.length})
            </h3>
            <ul className="space-y-2">
              {patients.length === 0 && (
                <li className="text-sm text-slate-400">Aucun patient</li>
              )}
              {patients.map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl border border-slate-100 px-4 py-3"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {patientFullName(p.first_name, p.last_name)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {[p.quartier, p.city].filter(Boolean).join(" · ") ||
                      "Localisation N/D"}{" "}
                    · inscrit {formatDate(p.created_at)}
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

function TrendBadge({ trend }: { trend: DiseaseSummary["trend"] }) {
  const styles =
    trend === "Croissance"
      ? "bg-orange-50 text-orange-700"
      : trend === "Diminution"
        ? "bg-sky-50 text-sky-700"
        : "bg-emerald-50 text-emerald-700";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      <Activity strokeWidth={1.75} className="h-3 w-3" />
      {trend}
    </span>
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
