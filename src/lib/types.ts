export type PatientPhoto = {
  url: string;
  path?: string;
  caption?: string | null;
  created_at: string;
};

export type CaseStatus =
  | "Actif"
  | "Guéri"
  | "Chronique"
  | "Surveillance";

export type Patient = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  gender: string | null;
  medical_history: string | null;
  picture_url: string | null;
  address: string | null;
  city: string | null;
  commune: string | null;
  quartier: string | null;
  allergies: string | null;
  blood_type: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  photos: PatientPhoto[] | null;
};

export type OrderItem = {
  product_id?: string;
  name: string;
  code?: string;
  qty: number;
  price: number;
};

export type Produit = {
  id: string;
  created_at: string;
  name: string;
  code: string | null;
  price: number;
  description: string | null;
  picture_url: string | null;
  active: boolean;
};

export type ProduitInsert = Omit<Produit, "id" | "created_at">;

export type CommandeStatus =
  | "En attente"
  | "Livrée"
  | "Payée"
  | "Annulée";

export type Commande = {
  id: string;
  created_at: string;
  reference_id: string;
  patient_id: string;
  items: OrderItem[];
  total_amount: number;
  status: CommandeStatus | string;
  ordered_by_name: string | null;
  address: string | null;
  delivery_number: string | null;
  disease_to_treat: string | null;
  details: string | null;
  patients?: Pick<
    Patient,
    "id" | "first_name" | "last_name" | "city" | "commune" | "quartier"
  > | null;
};

export type VisitStatus = "Planifiée" | "En cours" | "Terminée";

export type Visite = {
  id: string;
  created_at: string;
  patient_id: string;
  visit_date: string;
  motif: string | null;
  symptoms: string | null;
  blood_pressure: string | null;
  temperature: number | null;
  weight_kg: number | null;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  status: VisitStatus | string;
  case_status: CaseStatus | string | null;
};

export type VisiteInsert = Omit<Visite, "id" | "created_at">;

export type PatientInsert = Omit<Patient, "id" | "created_at">;

export type CommandeInsert = {
  reference_id: string;
  patient_id: string;
  items: OrderItem[];
  total_amount: number;
  status?: string;
  ordered_by_name?: string | null;
  address?: string | null;
  delivery_number?: string | null;
  disease_to_treat?: string | null;
  details?: string | null;
};

/** Commande encore modifiable / supprimable */
export function isOrderEditable(status: string) {
  return status === "En attente";
}

/** Commande livrée et payée = vente */
export const SALE_STATUS = "Payée" as const;

export type DiseaseCaseState = "Croissance" | "Diminution" | "Stable";

export type DiseaseSummary = {
  key: string;
  name: string;
  patientCount: number;
  visitCount: number;
  orderCount: number;
  cities: string[];
  quartiers: string[];
  caseStatus: Record<string, number>;
  trend: DiseaseCaseState;
};

export type CitySummary = {
  key: string;
  name: string;
  patientCount: number;
  visitCount: number;
  orderCount: number;
  diseases: string[];
  communes: string[];
  quartiers: string[];
  caseStatus: Record<string, number>;
};
