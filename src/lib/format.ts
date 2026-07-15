import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM yyyy", { locale: fr });
  } catch {
    return value;
  }
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM yyyy · HH:mm", { locale: fr });
  } catch {
    return value;
  }
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function patientFullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}
