"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronRight, Pencil, Plus, Search, Settings2, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { deleteStorageFile, uploadPatientPicture } from "@/lib/storage";
import type { Patient, PatientInsert } from "@/lib/types";
import { formatDate, getInitials, patientFullName } from "@/lib/format";
import { PatientDetailSidebar } from "./PatientDetailSidebar";
import { AddVisitModal } from "./AddVisitModal";

const emptyForm: PatientInsert = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  birth_date: "",
  gender: "Femme",
  medical_history: "",
  picture_url: null,
  address: "",
};

const avatarColors = [
  "bg-emerald-100 text-emerald-700",
  "bg-teal-100 text-teal-700",
  "bg-lime-100 text-lime-700",
  "bg-cyan-100 text-cyan-700",
  "bg-green-100 text-green-700",
];

export function PatientsView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState<PatientInsert>(emptyForm);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [removePicture, setRemovePicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadPatients() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) setError(fetchError.message);
    else {
      setError(null);
      setPatients(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    return () => {
      if (picturePreview?.startsWith("blob:")) URL.revokeObjectURL(picturePreview);
    };
  }, [picturePreview]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      [p.first_name, p.last_name, p.phone, p.email, p.gender, p.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [patients, search]);

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setPictureFile(null);
    setRemovePicture(false);
    if (picturePreview?.startsWith("blob:")) URL.revokeObjectURL(picturePreview);
    setPicturePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(patient: Patient) {
    setEditing(patient);
    setForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      phone: patient.phone ?? "",
      email: patient.email ?? "",
      birth_date: patient.birth_date ?? "",
      gender: patient.gender ?? "Femme",
      medical_history: patient.medical_history ?? "",
      picture_url: patient.picture_url,
      address: patient.address ?? "",
    });
    setPictureFile(null);
    setRemovePicture(false);
    setPicturePreview(patient.picture_url);
    setOpen(true);
  }

  function onPictureChange(file: File | null) {
    if (picturePreview?.startsWith("blob:")) URL.revokeObjectURL(picturePreview);
    setPictureFile(file);
    setRemovePicture(false);
    setPicturePreview(
      file ? URL.createObjectURL(file) : editing?.picture_url ?? null,
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let picture_url: string | null = editing?.picture_url ?? null;

    if (removePicture && picture_url) {
      await deleteStorageFile(picture_url);
      picture_url = null;
    }

    if (pictureFile) {
      if (editing?.picture_url) {
        await deleteStorageFile(editing.picture_url);
      }
      const upload = await uploadPatientPicture(pictureFile);
      if (upload.error) {
        setSaving(false);
        setError(upload.error);
        return;
      }
      picture_url = upload.url;
    }

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone || null,
      email: form.email || null,
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      medical_history: form.medical_history || null,
      picture_url,
      address: form.address || null,
    };

    const result = editing
      ? await supabase.from("patients").update(payload).eq("id", editing.id)
      : await supabase.from("patients").insert(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (editing && selected?.id === editing.id) {
      setSelected({ ...editing, ...payload, id: editing.id, created_at: editing.created_at });
    }

    resetForm();
    setOpen(false);
    await loadPatients();
  }

  async function handleDelete(patient: Patient) {
    if (
      !confirm(
        `Supprimer ${patientFullName(patient.first_name, patient.last_name)} ? La photo sera retirée du bucket.`,
      )
    ) {
      return;
    }

    setError(null);

    const { count } = await supabase
      .from("commandes")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patient.id);

    if ((count ?? 0) > 0) {
      setError(
        "Impossible de supprimer : ce patient a des commandes. Annulez/supprimez d'abord les commandes en attente.",
      );
      return;
    }

    if (patient.picture_url) {
      await deleteStorageFile(patient.picture_url);
    }

    const { error: deleteError } = await supabase
      .from("patients")
      .delete()
      .eq("id", patient.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (selected?.id === patient.id) setSelected(null);
    await loadPatients();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Patients
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {filtered.length} patient{filtered.length > 1 ? "s" : ""} trouvé
            {filtered.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
        >
          <Plus strokeWidth={1.75} className="h-4 w-4" />
          Ajouter un Patient
        </button>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="relative max-w-md">
        <Search
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un patient…"
          className="w-full rounded-2xl border-0 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.04)] outline-none ring-emerald-500/20 placeholder:text-slate-400 focus:ring-4"
        />
      </div>

      <div className="space-y-3">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.8fr_0.9fr_80px] gap-3 px-5 text-xs font-medium uppercase tracking-wide text-slate-400 md:grid">
          <span>Patient</span>
          <span>Téléphone</span>
          <span>Naissance</span>
          <span>Genre</span>
          <span>Statut</span>
          <span className="text-right">Action</span>
        </div>

        {loading && (
          <div className="rounded-3xl bg-white px-5 py-10 text-center text-sm text-slate-400 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            Chargement…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="rounded-3xl bg-white px-5 py-10 text-center text-sm text-slate-400 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            Aucun patient trouvé
          </div>
        )}

        {filtered.map((patient, index) => (
          <button
            key={patient.id}
            type="button"
            onClick={() => setSelected(patient)}
            className="table-card w-full grid-cols-1 text-left md:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.9fr_80px]"
          >
            <div className="flex items-center gap-3">
              <PatientAvatar
                patient={patient}
                colorClass={avatarColors[index % avatarColors.length]}
              />
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {patientFullName(patient.first_name, patient.last_name)}
                </p>
                <p className="muted truncate text-xs text-slate-400">
                  {patient.email || "Sans email"}
                </p>
              </div>
            </div>
            <span className="muted text-sm text-slate-600 md:text-inherit">
              {patient.phone || "—"}
            </span>
            <span className="muted text-sm text-slate-600 md:text-inherit">
              {formatDate(patient.birth_date)}
            </span>
            <span className="muted text-sm text-slate-600 md:text-inherit">
              {patient.gender || "—"}
            </span>
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="status-dot-ok h-2 w-2 rounded-full bg-emerald-500" />
              Suivi actif
            </span>
            <span className="flex items-center justify-end gap-1 text-slate-400 group-hover:text-white">
              <Settings2 strokeWidth={1.75} className="h-4 w-4" />
              <ChevronRight strokeWidth={1.75} className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0"
            onClick={() => {
              resetForm();
              setOpen(false);
            }}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editing ? "Modifier le patient" : "Nouveau patient"}
                </h2>
                <p className="text-sm text-slate-400">
                  Photo optionnelle, compressée avant envoi
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
              >
                <X strokeWidth={1.75} className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-emerald-200 bg-emerald-50 text-emerald-500 transition hover:border-emerald-400"
                  >
                    {picturePreview && !removePicture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={picturePreview}
                        alt="Aperçu"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera strokeWidth={1.75} className="h-6 w-6" />
                    )}
                  </button>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Photo du patient
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Optionnel — compressée puis stockée dans centre-bucket
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Choisir une image
                      </button>
                      {(pictureFile ||
                        (editing?.picture_url && !removePicture)) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPictureFile(null);
                            setRemovePicture(true);
                            setPicturePreview(null);
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
                          }}
                          className="text-sm font-medium text-slate-400 hover:text-slate-600"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        onPictureChange(e.target.files?.[0] ?? null)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom">
                    <input
                      required
                      value={form.first_name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, first_name: e.target.value }))
                      }
                      className="field"
                    />
                  </Field>
                  <Field label="Nom">
                    <input
                      required
                      value={form.last_name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, last_name: e.target.value }))
                      }
                      className="field"
                    />
                  </Field>
                </div>
                <Field label="Téléphone">
                  <input
                    value={form.phone ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    className="field"
                  />
                </Field>
                <Field label="Adresse">
                  <textarea
                    required
                    rows={2}
                    value={form.address ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                    className="field resize-none"
                    placeholder="Quartier, avenue, commune…"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="field"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date de naissance">
                    <input
                      type="date"
                      value={form.birth_date ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, birth_date: e.target.value }))
                      }
                      className="field"
                    />
                  </Field>
                  <Field label="Genre">
                    <select
                      value={form.gender ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, gender: e.target.value }))
                      }
                      className="field"
                    >
                      <option>Femme</option>
                      <option>Homme</option>
                      <option>Autre</option>
                    </select>
                  </Field>
                </div>
                <Field label="Antécédents médicaux">
                  <textarea
                    rows={4}
                    value={form.medical_history ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        medical_history: e.target.value,
                      }))
                    }
                    className="field resize-none"
                  />
                </Field>
              </div>

              <div className="border-t border-slate-100 px-6 py-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-60"
                >
                  {saving
                    ? "Enregistrement…"
                    : editing
                      ? "Enregistrer les modifications"
                      : "Enregistrer le patient"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {selected && (
        <PatientDetailSidebar
          patient={selected}
          refreshKey={detailRefreshKey}
          onClose={() => {
            setSelected(null);
            setVisitModalOpen(false);
          }}
          onAddVisit={() => setVisitModalOpen(true)}
          onEdit={() => {
            openEdit(selected);
          }}
          onDelete={() => handleDelete(selected)}
        />
      )}

      {selected && visitModalOpen && (
        <AddVisitModal
          patient={selected}
          onClose={() => setVisitModalOpen(false)}
          onCreated={() => setDetailRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}

function PatientAvatar({
  patient,
  colorClass,
  size = "md",
}: {
  patient: Patient;
  colorClass: string;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-14 w-14 text-sm" : "h-10 w-10 text-xs";

  if (patient.picture_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={patient.picture_url}
        alt={patientFullName(patient.first_name, patient.last_name)}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-white/50`}
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center rounded-full font-semibold ${sizeClass} ${colorClass}`}
    >
      {getInitials(patient.first_name, patient.last_name)}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
