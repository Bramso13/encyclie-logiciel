export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  BROKER: "Courtier",
  UNDERWRITER: "Souscripteur",
  CLIENT: "Assuré",
};

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  INCOMPLETE: "À compléter",
  SUBMITTED: "Soumis",
  IN_PROGRESS: "En cours",
  COMPLEMENT_REQUIRED: "Complément demandé",
  OFFER_READY: "Offre prête",
  OFFER_SENT: "Offre envoyée",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  EXPIRED: "Expirée",
};

export const QUOTE_STATUS_TONES: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700",
  INCOMPLETE: "bg-amber-100 text-amber-900",
  SUBMITTED: "bg-sky-100 text-sky-900",
  IN_PROGRESS: "bg-amber-100 text-amber-900",
  COMPLEMENT_REQUIRED: "bg-orange-100 text-orange-900",
  OFFER_READY: "bg-emerald-100 text-emerald-900",
  OFFER_SENT: "bg-sky-100 text-sky-900",
  ACCEPTED: "bg-emerald-100 text-emerald-900",
  REJECTED: "bg-rose-100 text-rose-900",
  EXPIRED: "bg-zinc-100 text-zinc-600",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  EXPIRED: "Expiré",
  CANCELLED: "Résilié",
  PENDING_RENEWAL: "Renouvellement en cours",
};

export const VERSION_ACTION_LABELS: Record<string, string> = {
  STATUS_CHANGE: "Changement de statut",
  DATA_UPDATE: "Modification des données",
  PREMIUM_UPDATE: "Mise à jour de la prime",
  OFFER_UPDATE: "Mise à jour de l'offre",
  ADMIN_CORRECTION: "Correction administrateur",
  BROKER_MODIFICATION: "Modification courtier",
};

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export function labelOf(
  map: Record<string, string>,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return map[value] ?? value;
}

export function roleLabel(role: string | null | undefined): string {
  return labelOf(ROLE_LABELS, role);
}

export function quoteStatusLabel(status: string | null | undefined): string {
  return labelOf(QUOTE_STATUS_LABELS, status);
}

export function quoteStatusTone(status: string | null | undefined): string {
  if (!status) return "bg-zinc-100 text-zinc-700";
  return QUOTE_STATUS_TONES[status] ?? "bg-zinc-100 text-zinc-700";
}

export function contractStatusLabel(status: string | null | undefined): string {
  return labelOf(CONTRACT_STATUS_LABELS, status);
}

export function versionActionLabel(action: string | null | undefined): string {
  return labelOf(VERSION_ACTION_LABELS, action);
}

export function formatEur(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

export function formatDateFr(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR");
}
