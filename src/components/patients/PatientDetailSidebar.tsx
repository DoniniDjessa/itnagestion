"use client";

import { useEffect, useState } from "react";
import {
  CalendarPlus,
  ClipboardList,
  Package,
  Pencil,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Commande, Patient, Visite } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getInitials,
  patientFullName,
} from "@/lib/format";

type Tab = "infos" | "visites" | "commandes";

type Props = {
  patient: Patient;
  onClose: () => void;
  onAddVisit: () => void;
  onEdit: () => void;
  onDelete: () => void;
  refreshKey: number;
};

export function PatientDetailSidebar({
  patient,
  onClose,
  onAddVisit,
  onEdit,
  onDelete,
  refreshKey,
}: Props) {
  const [tab, setTab] = useState<Tab>("visites");
  const [visites, setVisites] = useState<Visite[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const [visitesRes, commandesRes] = await Promise.all([
        supabase
          .from("visites")
          .select("*")
          .eq("patient_id", patient.id)
          .order("visit_date", { ascending: false }),
        supabase
          .from("commandes")
          .select("*")
          .eq("patient_id", patient.id)
          .order("created_at", { ascending: false }),
      ]);

      if (visitesRes.error || commandesRes.error) {
        setError(
          visitesRes.error?.message ||
            commandesRes.error?.message ||
            "Erreur de chargement",
        );
      } else {
        setVisites((visitesRes.data as Visite[]) ?? []);
        setCommandes((commandesRes.data as Commande[]) ?? []);
      }
      setLoading(false);
    }

    load();
  }, [patient.id, refreshKey]);

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
            <div className="flex items-center gap-3">
              {patient.picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={patient.picture_url}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover ring-4 ring-emerald-50"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 ring-4 ring-emerald-50">
                  {getInitials(patient.first_name, patient.last_name)}
                </span>
              )}
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {patientFullName(patient.first_name, patient.last_name)}
                </h2>
                <p className="text-sm text-slate-400">
                  {patient.phone || "Sans téléphone"} ·{" "}
                  {patient.gender || "Genre N/D"}
                </p>
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

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              <Pencil strokeWidth={1.75} className="h-4 w-4" />
              Modifier
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
            >
              <Trash2 strokeWidth={1.75} className="h-4 w-4" />
              Supprimer
            </button>
          </div>

          <button
            type="button"
            onClick={onAddVisit}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
          >
            <CalendarPlus strokeWidth={1.75} className="h-4 w-4" />
            Ajouter une visite
          </button>

          <div className="mt-4 flex gap-1 rounded-2xl bg-slate-50 p-1">
            {(
              [
                { id: "infos", label: "Infos", icon: ClipboardList },
                { id: "visites", label: "Visites", icon: Stethoscope },
                { id: "commandes", label: "Commandes", icon: Package },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition sm:text-sm ${
                  tab === id
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Icon strokeWidth={1.75} className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
              {error.toLowerCase().includes("visites") && (
                <span className="mt-1 block text-xs">
                  Exécutez{" "}
                  <code className="font-mono">supabase/migration_visites.sql</code>
                </span>
              )}
            </div>
          )}

          {loading && (
            <p className="text-sm text-slate-400">Chargement du dossier…</p>
          )}

          {!loading && tab === "infos" && (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Email" value={patient.email} />
              <Info label="Naissance" value={formatDate(patient.birth_date)} />
              <Info label="Téléphone" value={patient.phone} />
              <Info label="Genre" value={patient.gender} />
              <div className="col-span-2">
                <Info
                  label="Antécédents"
                  value={patient.medical_history || "Aucun renseignement"}
                />
              </div>
              <div className="col-span-2 rounded-2xl bg-emerald-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                  Résumé
                </p>
                <p className="mt-1 text-sm text-emerald-900">
                  {visites.length} visite{visites.length > 1 ? "s" : ""} ·{" "}
                  {commandes.length} commande{commandes.length > 1 ? "s" : ""}
                </p>
              </div>
            </dl>
          )}

          {!loading && tab === "visites" && (
            <div className="space-y-3">
              {visites.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                  Aucune visite enregistrée
                </div>
              )}
              {visites.map((visite) => {
                const open = expandedVisit === visite.id;
                return (
                  <article
                    key={visite.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 text-left"
                      onClick={() =>
                        setExpandedVisit(open ? null : visite.id)
                      }
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {visite.motif || "Consultation"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDateTime(visite.visit_date)}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {visite.status}
                      </span>
                    </button>

                    {open && (
                      <div className="mt-4 space-y-3 border-t border-slate-200/70 pt-4 text-sm">
                        <FlowStep title="Motif" body={visite.motif} />
                        <FlowStep title="Symptômes" body={visite.symptoms} />
                        <div className="grid grid-cols-3 gap-2 rounded-xl bg-white p-3 text-xs">
                          <Vital
                            label="Tension"
                            value={visite.blood_pressure}
                          />
                          <Vital
                            label="Temp."
                            value={
                              visite.temperature != null
                                ? `${visite.temperature} °C`
                                : null
                            }
                          />
                          <Vital
                            label="Poids"
                            value={
                              visite.weight_kg != null
                                ? `${visite.weight_kg} kg`
                                : null
                            }
                          />
                        </div>
                        <FlowStep title="Diagnostic" body={visite.diagnosis} />
                        <FlowStep title="Traitement" body={visite.treatment} />
                        <FlowStep title="Notes" body={visite.notes} />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {!loading && tab === "commandes" && (
            <div className="space-y-3">
              {commandes.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                  Aucune commande pour ce patient
                </div>
              )}
              {commandes.map((commande) => (
                <article
                  key={commande.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {commande.reference_id}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatDate(commande.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(Number(commande.total_amount))}
                      </p>
                      <p className="mt-0.5 text-xs text-emerald-600">
                        {commande.status}
                      </p>
                    </div>
                  </div>
                  {Array.isArray(commande.items) && commande.items.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-slate-200/70 pt-3 text-xs text-slate-500">
                      {commande.items.map((item, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span>
                            {item.name} × {item.qty}
                          </span>
                          <span>
                            {formatCurrency(Number(item.qty) * Number(item.price))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function FlowStep({
  title,
  body,
}: {
  title: string;
  body: string | null | undefined;
}) {
  if (!body) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
        {title}
      </p>
      <p className="mt-1 text-slate-700">{body}</p>
    </div>
  );
}

function Vital({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800">{value || "—"}</p>
    </div>
  );
}
