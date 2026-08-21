"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarPlus,
  Camera,
  ClipboardList,
  HeartPulse,
  ImageIcon,
  Package,
  Pencil,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  deleteStorageFile,
  uploadPatientPicture,
} from "@/lib/storage";
import { patientDiseases } from "@/lib/analytics";
import type { Commande, Patient, PatientPhoto, Visite } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime, getInitials, patientFullName } from "@/lib/format";
import { NiceLoader } from "@/components/ui/NiceLoader";

type Tab = "infos" | "maladies" | "visites" | "commandes" | "photos";

type Props = {
  patient: Patient;
  onClose: () => void;
  onAddVisit: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPatientUpdated: (patient: Patient) => void;
  refreshKey: number;
};

export function PatientDetailSidebar({
  patient,
  onClose,
  onAddVisit,
  onEdit,
  onDelete,
  onPatientUpdated,
  refreshKey,
}: Props) {
  const [tab, setTab] = useState<Tab>("infos");
  const [visites, setVisites] = useState<Visite[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);

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

  const diseases = useMemo(
    () => patientDiseases(patient.id, visites, commandes),
    [patient.id, visites, commandes],
  );

  const photos = useMemo(
    () => (Array.isArray(patient.photos) ? patient.photos : []),
    [patient.photos],
  );

  const totalSpent = commandes.reduce(
    (s, c) => s + Number(c.total_amount || 0),
    0,
  );
  const lastVisit = visites[0]?.visit_date ?? null;
  const avgBasket =
    commandes.length > 0 ? totalSpent / commandes.length : 0;

  async function addGalleryPhoto(file: File) {
    setUploadingPhoto(true);
    setError(null);
    const upload = await uploadPatientPicture(file);
    if (upload.error || !upload.url) {
      setError(upload.error || "Échec upload photo");
      setUploadingPhoto(false);
      return;
    }

    const next: PatientPhoto[] = [
      {
        url: upload.url,
        path: upload.path ?? undefined,
        caption: null,
        created_at: new Date().toISOString(),
      },
      ...photos,
    ];

    const { error: updateError } = await supabase
      .from("patients")
      .update({ photos: next })
      .eq("id", patient.id);

    setUploadingPhoto(false);

    if (updateError) {
      await deleteStorageFile(upload.url);
      setError(updateError.message);
      return;
    }

    onPatientUpdated({ ...patient, photos: next });
  }

  async function removeGalleryPhoto(photo: PatientPhoto) {
    if (!confirm("Retirer cette photo du dossier ?")) return;
    const next = photos.filter((p) => p.url !== photo.url);
    const { error: updateError } = await supabase
      .from("patients")
      .update({ photos: next })
      .eq("id", patient.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await deleteStorageFile(photo.url);
    onPatientUpdated({ ...patient, photos: next });
  }

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
                {(patient.city || patient.quartier) && (
                  <p className="mt-0.5 text-xs text-emerald-600">
                    {[patient.quartier, patient.commune, patient.city]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
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

          <div className="mt-4 flex gap-1 overflow-x-auto rounded-2xl bg-slate-50 p-1">
            {(
              [
                { id: "infos", label: "Infos", icon: ClipboardList },
                { id: "maladies", label: "Maladies", icon: HeartPulse },
                { id: "visites", label: "Visites", icon: Stethoscope },
                { id: "commandes", label: "Cmd", icon: Package },
                { id: "photos", label: "Photos", icon: ImageIcon },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition sm:text-xs ${
                  tab === id
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Icon strokeWidth={1.75} className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
              {(error.toLowerCase().includes("city") ||
                error.toLowerCase().includes("photos") ||
                error.toLowerCase().includes("column")) && (
                <span className="mt-1 block text-xs">
                  Exécutez{" "}
                  <code className="font-mono">
                    supabase/migration_dossier_geo.sql
                  </code>
                </span>
              )}
            </div>
          )}

          {loading && <NiceLoader compact label="Chargement du dossier…" />}

          {!loading && (
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Kpi label="Visites" value={String(visites.length)} />
              <Kpi label="Commandes" value={String(commandes.length)} />
              <Kpi label="Dépenses" value={formatCurrency(totalSpent)} />
              <Kpi
                label="Panier moy."
                value={commandes.length ? formatCurrency(avgBasket) : "—"}
              />
            </div>
          )}

          {!loading && tab === "infos" && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                  Suivi
                </p>
                <p className="mt-1 text-sm text-emerald-900">
                  Patient depuis {formatDate(patient.created_at)}
                  {lastVisit
                    ? ` · Dernière visite ${formatDate(lastVisit)}`
                    : " · Aucune visite"}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Info label="Email" value={patient.email} />
                <Info label="Naissance" value={formatDate(patient.birth_date)} />
                <Info label="Téléphone" value={patient.phone} />
                <Info label="Genre" value={patient.gender} />
                <Info label="Groupe sanguin" value={patient.blood_type} />
                <Info label="Ville" value={patient.city} />
                <Info label="Commune" value={patient.commune} />
                <Info label="Quartier" value={patient.quartier} />
                <div className="col-span-2">
                  <Info label="Adresse" value={patient.address} />
                </div>
                <Info
                  label="Contact d&apos;urgence"
                  value={patient.emergency_contact}
                />
                <Info label="Tél. urgence" value={patient.emergency_phone} />
                <div className="col-span-2">
                  <Info
                    label="Allergies"
                    value={patient.allergies || "Aucune renseignée"}
                  />
                </div>
                <div className="col-span-2">
                  <Info
                    label="Antécédents"
                    value={patient.medical_history || "Aucun renseignement"}
                  />
                </div>
              </dl>
            </div>
          )}

          {!loading && tab === "maladies" && (
            <div className="space-y-3">
              {diseases.length === 0 && (
                <Empty>Aucune maladie liée (diagnostic ou commande)</Empty>
              )}
              {diseases.map((name) => {
                const relatedVisits = visites.filter(
                  (v) =>
                    (v.diagnosis || "").trim().toLowerCase() ===
                    name.toLowerCase(),
                );
                const relatedOrders = commandes.filter(
                  (c) =>
                    (c.disease_to_treat || "").trim().toLowerCase() ===
                    name.toLowerCase(),
                );
                return (
                  <article
                    key={name}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <p className="font-medium text-slate-900">{name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {relatedVisits.length} visite
                      {relatedVisits.length > 1 ? "s" : ""} ·{" "}
                      {relatedOrders.length} commande
                      {relatedOrders.length > 1 ? "s" : ""}
                    </p>
                    {relatedVisits[0] && (
                      <p className="mt-2 text-xs text-emerald-600">
                        Dernier cas : {formatDate(relatedVisits[0].visit_date)}{" "}
                        ·{" "}
                        {relatedVisits[0].case_status ||
                          relatedVisits[0].status}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {!loading && tab === "visites" && (
            <div className="space-y-3">
              {visites.length === 0 && (
                <Empty>Aucune visite enregistrée</Empty>
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
                        {visite.diagnosis && (
                          <p className="mt-1 text-xs text-emerald-600">
                            {visite.diagnosis}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          {visite.status}
                        </span>
                        {visite.case_status && (
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                            {visite.case_status}
                          </span>
                        )}
                      </div>
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
                <Empty>Aucune commande pour ce patient</Empty>
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
                      {(commande.disease_to_treat ||
                        commande.ordered_by_name) && (
                        <p className="mt-1 text-xs text-slate-500">
                          {commande.ordered_by_name
                            ? `Par ${commande.ordered_by_name}`
                            : ""}
                          {commande.ordered_by_name &&
                          commande.disease_to_treat
                            ? " · "
                            : ""}
                          {commande.disease_to_treat || ""}
                        </p>
                      )}
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
                  {Array.isArray(commande.items) &&
                    commande.items.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-slate-200/70 pt-3 text-xs text-slate-500">
                        {commande.items.map((item, i) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span>
                              {item.name} × {item.qty}
                            </span>
                            <span>
                              {formatCurrency(
                                Number(item.qty) * Number(item.price),
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                </article>
              ))}
            </div>
          )}

          {!loading && tab === "photos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-400">
                  Photos cliniques / dossier ({photos.length})
                </p>
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => galleryRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                >
                  <Camera strokeWidth={1.75} className="h-3.5 w-3.5" />
                  {uploadingPhoto ? "Envoi…" : "Ajouter"}
                </button>
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void addGalleryPhoto(file);
                    e.target.value = "";
                  }}
                />
              </div>

              {patient.picture_url && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Portrait
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={patient.picture_url}
                    alt=""
                    className="h-40 w-full rounded-2xl object-cover"
                  />
                </div>
              )}

              {photos.length === 0 && !patient.picture_url && (
                <Empty>Aucune photo dans le dossier</Empty>
              )}

              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.url}
                    className="group relative overflow-hidden rounded-2xl bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || "Photo dossier"}
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryPhoto(photo)}
                      className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-red-500 opacity-0 shadow transition group-hover:opacity-100"
                    >
                      <Trash2 strokeWidth={1.75} className="h-3.5 w-3.5" />
                    </button>
                    <p className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/60 to-transparent px-2 pb-2 pt-6 text-[10px] text-white">
                      {formatDate(photo.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
      {children}
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
