"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Patient, VisiteInsert } from "@/lib/types";
import { CASE_STATUS_OPTIONS } from "@/lib/analytics";
import { patientFullName } from "@/lib/format";

type Props = {
  patient: Patient;
  onClose: () => void;
  onCreated: () => void;
};

const emptyVisit = {
  visit_date: new Date().toISOString().slice(0, 16),
  motif: "",
  symptoms: "",
  blood_pressure: "",
  temperature: "",
  weight_kg: "",
  diagnosis: "",
  treatment: "",
  notes: "",
  status: "Terminée",
  case_status: "Actif",
};

export function AddVisitModal({ patient, onClose, onCreated }: Props) {
  const [form, setForm] = useState(emptyVisit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: VisiteInsert = {
      patient_id: patient.id,
      visit_date: new Date(form.visit_date).toISOString(),
      motif: form.motif || null,
      symptoms: form.symptoms || null,
      blood_pressure: form.blood_pressure || null,
      temperature: form.temperature ? Number(form.temperature) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      diagnosis: form.diagnosis || null,
      treatment: form.treatment || null,
      notes: form.notes || null,
      status: form.status,
      case_status: form.case_status || null,
    };

    const { error: insertError } = await supabase
      .from("visites")
      .insert(payload);

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-[1px]">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Nouvelle visite
            </h2>
            <p className="text-sm text-slate-400">
              {patientFullName(patient.first_name, patient.last_name)} — parcours
              de santé
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
          >
            <X strokeWidth={1.75} className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {error && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              1. Contexte
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date & heure">
                <input
                  type="datetime-local"
                  required
                  value={form.visit_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, visit_date: e.target.value }))
                  }
                  className="field"
                />
              </Field>
              <Field label="Statut">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="field"
                >
                  <option>Planifiée</option>
                  <option>En cours</option>
                  <option>Terminée</option>
                </select>
              </Field>
            </div>
            <Field label="Motif de consultation">
              <input
                value={form.motif}
                onChange={(e) =>
                  setForm((f) => ({ ...f, motif: e.target.value }))
                }
                placeholder="Ex: Fièvre, contrôle, renouvellement…"
                className="field"
              />
            </Field>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              2. Constantes & symptômes
            </h3>
            <Field label="Symptômes / plaintes">
              <textarea
                rows={3}
                value={form.symptoms}
                onChange={(e) =>
                  setForm((f) => ({ ...f, symptoms: e.target.value }))
                }
                className="field resize-none"
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tension">
                <input
                  value={form.blood_pressure}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, blood_pressure: e.target.value }))
                  }
                  placeholder="120/80"
                  className="field"
                />
              </Field>
              <Field label="Temp. (°C)">
                <input
                  type="number"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, temperature: e.target.value }))
                  }
                  className="field"
                />
              </Field>
              <Field label="Poids (kg)">
                <input
                  type="number"
                  step="0.1"
                  value={form.weight_kg}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, weight_kg: e.target.value }))
                  }
                  className="field"
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              3. Diagnostic & prise en charge
            </h3>
            <Field label="Diagnostic">
              <textarea
                rows={2}
                value={form.diagnosis}
                onChange={(e) =>
                  setForm((f) => ({ ...f, diagnosis: e.target.value }))
                }
                className="field resize-none"
              />
            </Field>
            <Field label="État du cas">
              <select
                value={form.case_status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, case_status: e.target.value }))
                }
                className="field"
              >
                {CASE_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Traitement / consignes">
              <textarea
                rows={2}
                value={form.treatment}
                onChange={(e) =>
                  setForm((f) => ({ ...f, treatment: e.target.value }))
                }
                className="field resize-none"
              />
            </Field>
            <Field label="Notes complémentaires">
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="field resize-none"
              />
            </Field>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer la visite"}
          </button>
        </form>
      </div>
    </div>
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
