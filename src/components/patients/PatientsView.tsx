"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ChevronRight,
  Map,
  Plus,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { deleteStorageFile, uploadPatientPicture } from "@/lib/storage";
import type { Patient, PatientInsert } from "@/lib/types";
import { usePagination } from "@/hooks/usePagination";
import { PageLoader } from "@/components/ui/NiceLoader";
import { Pagination } from "@/components/ui/Pagination";
import { GeoCombobox } from "@/components/ui/GeoCombobox";
import { FilterToolbar } from "@/components/ui/FilterToolbar";
import { SummaryKpis } from "@/components/ui/SummaryKpis";
import {
  GoogleMapMock,
  useMapPointsFromPatients,
} from "@/components/maps/GoogleMapMock";
import {
  findVilleByName,
  searchCommunes,
  searchQuartiers,
  searchVilles,
  syncPatientGeo,
} from "@/lib/geo-store";
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
  city: "",
  commune: "",
  quartier: "",
  allergies: "",
  blood_type: "",
  emergency_contact: "",
  emergency_phone: "",
  photos: [],
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
  const [mapOpen, setMapOpen] = useState(false);
  const [genderFilter, setGenderFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
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

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of patients) {
      if (p.city?.trim()) set.add(p.city.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [patients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      if (genderFilter !== "all" && (p.gender || "") !== genderFilter) {
        return false;
      }
      if (
        cityFilter !== "all" &&
        (p.city || "").trim().toLowerCase() !== cityFilter.toLowerCase()
      ) {
        return false;
      }
      if (!q) return true;
      return [
        p.first_name,
        p.last_name,
        p.phone,
        p.email,
        p.gender,
        p.address,
        p.city,
        p.commune,
        p.quartier,
        p.allergies,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [patients, search, genderFilter, cityFilter]);

  const {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    from,
    to,
  } = usePagination(filtered, 20);

  const mapPoints = useMapPointsFromPatients(patients);

  const kpis = useMemo(() => {
    const withCity = filtered.filter((p) => p.city).length;
    const withPhoto = filtered.filter((p) => p.picture_url).length;
    const women = filtered.filter((p) => p.gender === "Femme").length;
    return [
      {
        label: "Total patients",
        value: String(filtered.length),
        hint: "Selon filtres",
        iconSrc: "/icons/kpi-users.svg",
        tone: "emerald" as const,
      },
      {
        label: "Localisés",
        value: String(withCity),
        hint: "Ville renseignée",
        iconSrc: "/icons/kpi-map.svg",
        tone: "sky" as const,
      },
      {
        label: "Avec photo",
        value: String(withPhoto),
        hint: "Portrait dossier",
        iconSrc: "/icons/kpi-photo.svg",
        tone: "violet" as const,
      },
      {
        label: "Femmes",
        value: String(women),
        hint: `${filtered.length - women} autres`,
        iconSrc: "/icons/kpi-person.svg",
        tone: "amber" as const,
      },
    ];
  }, [filtered]);

  const searchCityOptions = useCallback(async (q: string) => {
    const rows = await searchVilles(q);
    return rows.map((r) => r.name);
  }, []);

  const searchCommuneOptions = useCallback(
    async (q: string) => {
      const ville = form.city ? await findVilleByName(form.city) : null;
      const rows = await searchCommunes(q, ville?.id ?? null);
      return rows.map((r) => r.name);
    },
    [form.city],
  );

  const searchQuartierOptions = useCallback(
    async (q: string) => {
      const ville = form.city ? await findVilleByName(form.city) : null;
      const rows = await searchQuartiers(q, { villeId: ville?.id ?? null });
      return rows.map((r) => r.name);
    },
    [form.city],
  );

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
      city: patient.city ?? "",
      commune: patient.commune ?? "",
      quartier: patient.quartier ?? "",
      allergies: patient.allergies ?? "",
      blood_type: patient.blood_type ?? "",
      emergency_contact: patient.emergency_contact ?? "",
      emergency_phone: patient.emergency_phone ?? "",
      photos: patient.photos ?? [],
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
      city: form.city || null,
      commune: form.commune || null,
      quartier: form.quartier || null,
      allergies: form.allergies || null,
      blood_type: form.blood_type || null,
      emergency_contact: form.emergency_contact || null,
      emergency_phone: form.emergency_phone || null,
      photos: editing?.photos ?? form.photos ?? [],
    };

    await syncPatientGeo({
      city: payload.city,
      commune: payload.commune,
      quartier: payload.quartier,
    });

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
    if (Array.isArray(patient.photos)) {
      for (const photo of patient.photos) {
        await deleteStorageFile(photo.url);
      }
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50"
          >
            <Map strokeWidth={1.75} className="h-4 w-4" />
            Carte
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
          >
            <Plus strokeWidth={1.75} className="h-4 w-4" />
            Ajouter un Patient
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <PageLoader label="Chargement des patients…" />
      ) : (
        <>
      <SummaryKpis items={kpis} />

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Nom, téléphone, ville, quartier…"
        selects={[
          {
            id: "gender",
            value: genderFilter,
            onChange: setGenderFilter,
            options: [
              { value: "all", label: "Tous les genres" },
              { value: "Femme", label: "Femme" },
              { value: "Homme", label: "Homme" },
              { value: "Autre", label: "Autre" },
            ],
          },
          {
            id: "city",
            value: cityFilter,
            onChange: setCityFilter,
            widthClass: "w-44",
            options: [
              { value: "all", label: "Toutes les villes" },
              ...cityOptions.map((c) => ({ value: c, label: c })),
            ],
          },
        ]}
      />

      <GoogleMapMock
        points={mapPoints}
        title="Répartition des patients"
        subtitle="Google Maps mockup — Côte d'Ivoire"
        heightClass="h-80"
        showFullscreenButton
        fullscreen={mapOpen}
        onFullscreenChange={setMapOpen}
      />

      <div className="data-table">
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Aucun patient trouvé
          </div>
        )}
        {filtered.length > 0 && (
          <div className="data-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Téléphone</th>
                  <th>Localisation</th>
                  <th>Naissance</th>
                  <th>Genre</th>
                  <th>Statut</th>
                  <th className="text-right"> </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((patient, index) => (
                  <tr
                    key={patient.id}
                    className="row-click"
                    onClick={() => setSelected(patient)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <PatientAvatar
                          patient={patient}
                          colorClass={avatarColors[index % avatarColors.length]}
                        />
                        <div className="min-w-0">
                          <p className="cell-strong truncate">
                            {patientFullName(
                              patient.first_name,
                              patient.last_name,
                            )}
                          </p>
                          <p className="cell-muted truncate">
                            {patient.email || "Sans email"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>{patient.phone || "—"}</td>
                    <td>
                      <p className="text-sm text-slate-700">
                        {[patient.quartier, patient.commune, patient.city]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </td>
                    <td>{formatDate(patient.birth_date)}</td>
                    <td>{patient.gender || "—"}</td>
                    <td>
                      <span className="inline-flex items-center gap-2 text-sm text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Suivi actif
                      </span>
                    </td>
                    <td className="text-right text-slate-300">
                      <ChevronRight strokeWidth={1.75} className="ml-auto h-4 w-4" />
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
        label="patients"
      />
        </>
      )}

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
          <aside className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
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
                <GeoCombobox
                  label="Ville"
                  required
                  value={form.city ?? ""}
                  onChange={(city) => setForm((f) => ({ ...f, city }))}
                  onSearch={searchCityOptions}
                  placeholder="Abidjan, Bouaké…"
                />
                <GeoCombobox
                  label="Commune"
                  value={form.commune ?? ""}
                  onChange={(commune) => setForm((f) => ({ ...f, commune }))}
                  onSearch={searchCommuneOptions}
                  placeholder="Ex: Cocody, Plateau…"
                />
                <GeoCombobox
                  label="Quartier"
                  value={form.quartier ?? ""}
                  onChange={(quartier) => setForm((f) => ({ ...f, quartier }))}
                  onSearch={searchQuartierOptions}
                  placeholder="Médina, Plateau…"
                />
                <Field label="Adresse">
                  <textarea
                    rows={2}
                    value={form.address ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                    className="field resize-none"
                    placeholder="Rue, avenue, repères…"
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
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Groupe sanguin">
                    <select
                      value={form.blood_type ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, blood_type: e.target.value }))
                      }
                      className="field"
                    >
                      <option value="">—</option>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                        (g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ),
                      )}
                    </select>
                  </Field>
                  <Field label="Allergies">
                    <input
                      value={form.allergies ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, allergies: e.target.value }))
                      }
                      className="field"
                      placeholder="Pénicilline, pollen…"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Contact d'urgence">
                    <input
                      value={form.emergency_contact ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          emergency_contact: e.target.value,
                        }))
                      }
                      className="field"
                    />
                  </Field>
                  <Field label="Tél. urgence">
                    <input
                      value={form.emergency_phone ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          emergency_phone: e.target.value,
                        }))
                      }
                      className="field"
                    />
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
          onPatientUpdated={(p) => {
            setSelected(p);
            setPatients((list) =>
              list.map((item) => (item.id === p.id ? p : item)),
            );
          }}
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
