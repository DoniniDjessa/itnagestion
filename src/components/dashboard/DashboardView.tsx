"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, startOfMonth, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/lib/supabase/client";
import type { Commande, Patient } from "@/lib/types";
import { formatCurrency, patientFullName } from "@/lib/format";

type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  at: string;
};

export function DashboardView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const [patientsRes, commandesRes] = await Promise.all([
        supabase
          .from("patients")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("commandes")
          .select("*, patients(id, first_name, last_name)")
          .order("created_at", { ascending: false }),
      ]);

      if (patientsRes.error || commandesRes.error) {
        setError(
          patientsRes.error?.message ||
            commandesRes.error?.message ||
            "Erreur de chargement",
        );
      } else {
        setPatients(patientsRes.data ?? []);
        setCommandes((commandesRes.data as Commande[]) ?? []);
      }

      setLoading(false);
    }

    load();
  }, []);

  const monthStart = startOfMonth(new Date()).toISOString();
  const pendingOrders = commandes.filter((c) => c.status === "En attente");
  const salesCount = commandes.filter((c) => c.status === "Payée");
  const monthRevenue = commandes
    .filter((c) => c.created_at >= monthStart && c.status === "Payée")
    .reduce((sum, c) => sum + Number(c.total_amount || 0), 0);

  const chartData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const day = subDays(new Date(), 13 - i);
      const key = format(day, "yyyy-MM-dd");
      return { key, label: format(day, "d MMM", { locale: fr }), visits: 0 };
    });
    const map = Object.fromEntries(days.map((d) => [d.key, d]));
    for (const patient of patients) {
      const key = format(parseISO(patient.created_at), "yyyy-MM-dd");
      if (map[key]) map[key].visits += 1;
    }
    return days;
  }, [patients]);

  const activities: ActivityItem[] = useMemo(() => {
    const patientEvents = patients.slice(0, 5).map((p) => ({
      id: `p-${p.id}`,
      label: "Nouveau patient inscrit",
      detail: patientFullName(p.first_name, p.last_name),
      at: p.created_at,
    }));
    const orderEvents = commandes.slice(0, 5).map((c) => ({
      id: `c-${c.id}`,
      label: c.status === "Livrée" ? "Commande livrée" : "Commande enregistrée",
      detail: c.reference_id,
      at: c.created_at,
    }));
    return [...patientEvents, ...orderEvents]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8);
  }, [patients, commandes]);

  const kpis = [
    {
      label: "Total patients",
      value: patients.length.toString(),
      hint: "+12% ce mois",
      icon: Users,
    },
    {
      label: "Commandes en cours",
      value: pendingOrders.length.toString(),
      hint: "En attente",
      icon: ShoppingBag,
    },
    {
      label: "CA ventes du mois",
      value: formatCurrency(monthRevenue),
      hint: `${salesCount.length} vente${salesCount.length > 1 ? "s" : ""} payée${salesCount.length > 1 ? "s" : ""}`,
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Vue d&apos;ensemble de l&apos;activité du centre
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map(({ label, value, hint, icon: Icon }) => (
          <article
            key={label}
            className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                  {loading ? "—" : value}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600">
                <Icon strokeWidth={1.75} className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600">
              <ArrowUpRight strokeWidth={1.75} className="h-3.5 w-3.5" />
              {hint}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <article className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Évolution des visites
              </h2>
              <p className="text-sm text-slate-400">
                Nouveaux patients — 14 derniers jours
              </p>
            </div>
            <Activity strokeWidth={1.75} className="h-5 w-5 text-slate-300" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
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
            {loading && (
              <li className="text-sm text-slate-400">Chargement…</li>
            )}
            {!loading && activities.length === 0 && (
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
    </div>
  );
}
