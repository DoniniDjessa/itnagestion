"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  HeartPulse,
  MapPinned,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, startOfMonth, subDays, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/lib/supabase/client";
import {
  buildCitySummaries,
  buildDiseaseSummaries,
} from "@/lib/analytics";
import type { Commande, Patient, Visite } from "@/lib/types";
import { formatCurrency, patientFullName } from "@/lib/format";
import {
  GoogleMapMock,
  useMapPointsFromPatients,
} from "@/components/maps/GoogleMapMock";
import { PageLoader } from "@/components/ui/NiceLoader";
import { SummaryKpis } from "@/components/ui/SummaryKpis";

type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  at: string;
};

const BAR_COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#f97316", "#fb923c", "#7dd3fc"];

export function DashboardView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [visites, setVisites] = useState<Visite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const [patientsRes, commandesRes, visitesRes] = await Promise.all([
        supabase
          .from("patients")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("commandes")
          .select("*, patients(id, first_name, last_name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("visites")
          .select("*")
          .order("visit_date", { ascending: false }),
      ]);

      if (patientsRes.error || commandesRes.error || visitesRes.error) {
        setError(
          patientsRes.error?.message ||
            commandesRes.error?.message ||
            visitesRes.error?.message ||
            "Erreur de chargement",
        );
      } else {
        setPatients((patientsRes.data as Patient[]) ?? []);
        setCommandes((commandesRes.data as Commande[]) ?? []);
        setVisites((visitesRes.data as Visite[]) ?? []);
      }

      setLoading(false);
    }

    load();
  }, []);

  const monthStart = startOfMonth(new Date()).toISOString();
  const prevMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
  const pendingOrders = commandes.filter((c) => c.status === "En attente");
  const salesCount = commandes.filter((c) => c.status === "Payée");
  const monthRevenue = commandes
    .filter((c) => c.created_at >= monthStart && c.status === "Payée")
    .reduce((sum, c) => sum + Number(c.total_amount || 0), 0);

  const patientsThisMonth = patients.filter((p) => p.created_at >= monthStart)
    .length;
  const patientsPrevMonth = patients.filter(
    (p) => p.created_at >= prevMonthStart && p.created_at < monthStart,
  ).length;
  const patientDelta =
    patientsPrevMonth === 0
      ? patientsThisMonth > 0
        ? 100
        : 0
      : Math.round(
          ((patientsThisMonth - patientsPrevMonth) / patientsPrevMonth) * 100,
        );

  const diseases = useMemo(
    () => buildDiseaseSummaries(patients, visites, commandes),
    [patients, visites, commandes],
  );
  const cities = useMemo(
    () => buildCitySummaries(patients, visites, commandes),
    [patients, visites, commandes],
  );

  const visitChartData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const day = subDays(new Date(), 13 - i);
      const key = format(day, "yyyy-MM-dd");
      return { key, label: format(day, "d MMM", { locale: fr }), visits: 0 };
    });
    const map = Object.fromEntries(days.map((d) => [d.key, d]));
    for (const visite of visites) {
      const key = format(
        parseISO(visite.visit_date || visite.created_at),
        "yyyy-MM-dd",
      );
      if (map[key]) map[key].visits += 1;
    }
    return days;
  }, [visites]);

  const diseaseChartData = useMemo(
    () =>
      diseases.slice(0, 8).map((d) => ({
        name:
          d.name.length > 14 ? `${d.name.slice(0, 12)}…` : d.name,
        fullName: d.name,
        patients: d.patientCount,
      })),
    [diseases],
  );

  const cityChartData = useMemo(
    () =>
      cities.slice(0, 8).map((c) => ({
        name: c.name.length > 12 ? `${c.name.slice(0, 10)}…` : c.name,
        fullName: c.name,
        patients: c.patientCount,
        visits: c.visitCount,
      })),
    [cities],
  );

  const mapData = useMemo(
    () =>
      cities.map((c) => {
        const diseaseTrend = diseases
          .filter((d) => d.cities.some((city) => city === c.name))
          .reduce(
            (acc, d) => {
              if (d.trend === "Croissance") acc.up += 1;
              else if (d.trend === "Diminution") acc.down += 1;
              else acc.stable += 1;
              return acc;
            },
            { up: 0, down: 0, stable: 0 },
          );
        const trend =
          diseaseTrend.up > diseaseTrend.down
            ? ("Croissance" as const)
            : diseaseTrend.down > diseaseTrend.up
              ? ("Diminution" as const)
              : ("Stable" as const);
        return {
          id: c.key,
          name: c.name,
          city: c.name,
          value: c.patientCount,
          trend,
        };
      }),
    [cities, diseases],
  );

  const mockFallbackPoints = useMapPointsFromPatients(patients);
  const mapPoints = mapData.length > 0 ? mapData : mockFallbackPoints;

  const activities: ActivityItem[] = useMemo(() => {
    const patientEvents = patients.slice(0, 4).map((p) => ({
      id: `p-${p.id}`,
      label: "Nouveau patient inscrit",
      detail: patientFullName(p.first_name, p.last_name),
      at: p.created_at,
    }));
    const orderEvents = commandes.slice(0, 4).map((c) => ({
      id: `c-${c.id}`,
      label: c.status === "Livrée" ? "Commande livrée" : "Commande enregistrée",
      detail: c.reference_id,
      at: c.created_at,
    }));
    const visitEvents = visites.slice(0, 4).map((v) => ({
      id: `v-${v.id}`,
      label: "Visite enregistrée",
      detail: v.diagnosis || v.motif || "Consultation",
      at: v.visit_date || v.created_at,
    }));
    return [...patientEvents, ...orderEvents, ...visitEvents]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8);
  }, [patients, commandes, visites]);

  const kpis = [
    {
      label: "Total patients",
      value: patients.length.toString(),
      hint:
        patientDelta >= 0
          ? `+${patientDelta}% ce mois`
          : `${patientDelta}% ce mois`,
      iconSrc: "/icons/kpi-users.svg",
      tone: "emerald" as const,
    },
    {
      label: "Commandes en cours",
      value: pendingOrders.length.toString(),
      hint: "En attente",
      iconSrc: "/icons/kpi-orders.svg",
      tone: "amber" as const,
    },
    {
      label: "CA ventes du mois",
      value: formatCurrency(monthRevenue),
      hint: `${salesCount.length} vente${salesCount.length > 1 ? "s" : ""} payée${salesCount.length > 1 ? "s" : ""}`,
      iconSrc: "/icons/kpi-money.svg",
      tone: "violet" as const,
    },
    {
      label: "Pathologies suivies",
      value: diseases.length.toString(),
      hint: `${cities.length} ville${cities.length > 1 ? "s" : ""}`,
      iconSrc: "/icons/kpi-disease.svg",
      tone: "rose" as const,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Vue d&apos;ensemble patients, maladies et territoires
          </p>
        </header>
        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <PageLoader label="Chargement du tableau de bord…" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Vue d&apos;ensemble patients, maladies et territoires
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <SummaryKpis items={kpis} />

      <section className="grid gap-6 xl:grid-cols-5">
        <article className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Évolution des visites
              </h2>
              <p className="text-sm text-slate-400">14 derniers jours</p>
            </div>
            <Activity strokeWidth={1.75} className="h-5 w-5 text-slate-300" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitChartData}>
                <defs>
                  <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: "none",
                    boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="visits"
                  name="Visites"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fill="url(#visitsFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] xl:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">
            Dernières activités
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Événements récents du centre
          </p>
          <ul className="space-y-4">
            {activities.length === 0 && (
              <li className="text-sm text-slate-400">
                Aucune activité pour le moment
              </li>
            )}
            {activities.map((item, index) => (
              <li key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  {index < activities.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-slate-100" />
                  )}
                </div>
                <div className="pb-3">
                  <p className="text-sm font-medium text-slate-900">
                    {item.label}
                  </p>
                  <p className="text-sm text-slate-400">{item.detail}</p>
                  <p className="mt-0.5 text-xs text-slate-300">
                    {format(parseISO(item.at), "d MMM yyyy · HH:mm", {
                      locale: fr,
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Top maladies
              </h2>
              <p className="text-sm text-slate-400">
                Patients par pathologie
              </p>
            </div>
            <HeartPulse strokeWidth={1.75} className="h-5 w-5 text-slate-300" />
          </div>
          <div className="h-64">
            {diseaseChartData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">
                Pas encore de diagnostics
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diseaseChartData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={88} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [value, "Patients"]}
                    labelFormatter={(_, payload) =>
                      (payload?.[0]?.payload as { fullName?: string })?.fullName ??
                      ""
                    }
                    contentStyle={{
                      borderRadius: 16,
                      border: "none",
                      boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
                    }}
                  />
                  <Bar dataKey="patients" radius={[0, 8, 8, 0]}>
                    {diseaseChartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Patients par ville
              </h2>
              <p className="text-sm text-slate-400">Répartition territoriale</p>
            </div>
            <MapPinned strokeWidth={1.75} className="h-5 w-5 text-slate-300" />
          </div>
          <div className="h-64">
            {cityChartData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">
                Renseignez la ville des patients
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: "none",
                      boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
                    }}
                  />
                  <Bar dataKey="patients" name="Patients" fill="#059669" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="visits" name="Visites" fill="#7dd3fc" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </section>

      <GoogleMapMock
        points={mapPoints}
        title="Carte géographique"
        subtitle="Google Maps mockup — Côte d'Ivoire"
        heightClass="h-96"
      />
    </div>
  );
}
