import type {
  CaseStatus,
  CitySummary,
  Commande,
  DiseaseCaseState,
  DiseaseSummary,
  Patient,
  Visite,
} from "@/lib/types";

export function normalizeLabel(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function labelKey(value: string) {
  return normalizeLabel(value).toLocaleLowerCase("fr-FR");
}

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n;
}

function deriveCaseStatus(visite: Visite): string {
  if (visite.case_status) return normalizeLabel(visite.case_status) || "Actif";
  if (visite.status === "En cours" || visite.status === "Planifiée") return "Actif";
  if (visite.status === "Terminée") return "Guéri";
  return "Surveillance";
}

type PatientLite = Pick<
  Patient,
  "id" | "first_name" | "last_name" | "city" | "commune" | "quartier" | "created_at"
>;

/**
 * Aggregate diagnoses (visites) + disease_to_treat (commandes)
 * into disease dossiers with geo + case status.
 */
export function buildDiseaseSummaries(
  patients: PatientLite[],
  visites: Visite[],
  commandes: Commande[],
): DiseaseSummary[] {
  const patientsById = new Map(patients.map((p) => [p.id, p]));
  const map = new Map<
    string,
    {
      name: string;
      patients: Set<string>;
      visitCount: number;
      orderCount: number;
      cities: Set<string>;
      quartiers: Set<string>;
      caseStatus: Record<string, number>;
      recent: number;
      older: number;
    }
  >();

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  function ensure(raw: string) {
    const name = normalizeLabel(raw);
    if (!name) return null;
    const key = labelKey(name);
    let entry = map.get(key);
    if (!entry) {
      entry = {
        name,
        patients: new Set(),
        visitCount: 0,
        orderCount: 0,
        cities: new Set(),
        quartiers: new Set(),
        caseStatus: {},
        recent: 0,
        older: 0,
      };
      map.set(key, entry);
    } else if (name.length > entry.name.length) {
      entry.name = name;
    }
    return entry;
  }

  function attachPatient(
    entry: NonNullable<ReturnType<typeof ensure>>,
    patientId: string,
  ) {
    const patient = patientsById.get(patientId);
    entry.patients.add(patientId);
    if (patient?.city) entry.cities.add(normalizeLabel(patient.city));
    if (patient?.quartier) entry.quartiers.add(normalizeLabel(patient.quartier));
  }

  for (const visite of visites) {
    const entry = ensure(visite.diagnosis ?? "");
    if (!entry) continue;
    entry.visitCount += 1;
    attachPatient(entry, visite.patient_id);
    bump(entry.caseStatus, deriveCaseStatus(visite));
    const t = new Date(visite.visit_date || visite.created_at).getTime();
    if (now - t <= thirtyDays) entry.recent += 1;
    else if (now - t <= sixtyDaysMs()) entry.older += 1;
  }

  for (const commande of commandes) {
    const entry = ensure(commande.disease_to_treat ?? "");
    if (!entry) continue;
    entry.orderCount += 1;
    attachPatient(entry, commande.patient_id);
    const status =
      commande.status === "En attente"
        ? "Actif"
        : commande.status === "Annulée"
          ? "Surveillance"
          : "Guéri";
    bump(entry.caseStatus, status);
    const t = new Date(commande.created_at).getTime();
    if (now - t <= thirtyDays) entry.recent += 1;
    else if (now - t <= sixtyDaysMs()) entry.older += 1;
  }

  return Array.from(map.entries())
    .map(([key, e]) => ({
      key,
      name: e.name,
      patientCount: e.patients.size,
      visitCount: e.visitCount,
      orderCount: e.orderCount,
      cities: Array.from(e.cities).sort((a, b) => a.localeCompare(b, "fr")),
      quartiers: Array.from(e.quartiers).sort((a, b) => a.localeCompare(b, "fr")),
      caseStatus: e.caseStatus,
      trend: trendFromCounts(e.recent, e.older),
    }))
    .sort((a, b) => b.patientCount - a.patientCount || a.name.localeCompare(b.name, "fr"));
}

function sixtyDaysMs() {
  return 60 * 24 * 60 * 60 * 1000;
}

function trendFromCounts(recent: number, older: number): DiseaseCaseState {
  if (recent > older) return "Croissance";
  if (recent < older) return "Diminution";
  return "Stable";
}

export function buildCitySummaries(
  patients: PatientLite[],
  visites: Visite[],
  commandes: Commande[],
): CitySummary[] {
  const map = new Map<
    string,
    {
      name: string;
      patients: Set<string>;
      visitCount: number;
      orderCount: number;
      diseases: Set<string>;
      communes: Set<string>;
      quartiers: Set<string>;
      caseStatus: Record<string, number>;
    }
  >();

  function ensureCity(raw: string | null | undefined) {
    const name = normalizeLabel(raw);
    if (!name) return null;
    const key = labelKey(name);
    let entry = map.get(key);
    if (!entry) {
      entry = {
        name,
        patients: new Set(),
        visitCount: 0,
        orderCount: 0,
        diseases: new Set(),
        communes: new Set(),
        quartiers: new Set(),
        caseStatus: {},
      };
      map.set(key, entry);
    }
    return entry;
  }

  const patientCity = new Map<string, string>();

  for (const patient of patients) {
    const entry = ensureCity(patient.city);
    if (!entry) continue;
    entry.patients.add(patient.id);
    patientCity.set(patient.id, entry.name);
    if (patient.commune) entry.communes.add(normalizeLabel(patient.commune));
    if (patient.quartier) entry.quartiers.add(normalizeLabel(patient.quartier));
  }

  for (const visite of visites) {
    const cityName = patientCity.get(visite.patient_id);
    const entry = cityName ? map.get(labelKey(cityName)) : null;
    if (!entry) continue;
    entry.visitCount += 1;
    if (visite.diagnosis) entry.diseases.add(normalizeLabel(visite.diagnosis));
    bump(entry.caseStatus, deriveCaseStatus(visite));
  }

  for (const commande of commandes) {
    const cityName = patientCity.get(commande.patient_id);
    const entry = cityName ? map.get(labelKey(cityName)) : null;
    if (!entry) continue;
    entry.orderCount += 1;
    if (commande.disease_to_treat) {
      entry.diseases.add(normalizeLabel(commande.disease_to_treat));
    }
  }

  return Array.from(map.entries())
    .map(([key, e]) => ({
      key,
      name: e.name,
      patientCount: e.patients.size,
      visitCount: e.visitCount,
      orderCount: e.orderCount,
      diseases: Array.from(e.diseases).sort((a, b) => a.localeCompare(b, "fr")),
      communes: Array.from(e.communes).sort((a, b) => a.localeCompare(b, "fr")),
      quartiers: Array.from(e.quartiers).sort((a, b) => a.localeCompare(b, "fr")),
      caseStatus: e.caseStatus,
    }))
    .sort((a, b) => b.patientCount - a.patientCount || a.name.localeCompare(b.name, "fr"));
}

export function patientDiseases(
  patientId: string,
  visites: Visite[],
  commandes: Commande[],
) {
  const names = new Map<string, string>();
  for (const v of visites) {
    if (v.patient_id !== patientId) continue;
    const n = normalizeLabel(v.diagnosis);
    if (n) names.set(labelKey(n), n);
  }
  for (const c of commandes) {
    if (c.patient_id !== patientId) continue;
    const n = normalizeLabel(c.disease_to_treat);
    if (n) names.set(labelKey(n), n);
  }
  return Array.from(names.values()).sort((a, b) => a.localeCompare(b, "fr"));
}

export const CASE_STATUS_OPTIONS: CaseStatus[] = [
  "Actif",
  "Guéri",
  "Chronique",
  "Surveillance",
];
