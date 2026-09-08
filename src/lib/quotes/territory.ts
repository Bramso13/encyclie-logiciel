export const TERRITORY_LABELS: Record<string, string> = {
  metropole: "France métropolitaine",
  "france-metropolitaine": "France métropolitaine",
  martinique: "Martinique",
  guadeloupe: "Guadeloupe",
  guyane: "Guyane",
  reunion: "Réunion",
  "la-reunion": "Réunion",
  mayotte: "Mayotte",
  "st-martin": "Saint-Martin",
  "saint-martin": "Saint-Martin",
  "st-barth": "Saint-Barthélemy",
  "st-barthelemy": "Saint-Barthélemy",
  "saint-barthelemy": "Saint-Barthélemy",
};

export function normalizeTerritory(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[éèê]/g, "e")
    .replace(/\s+/g, "-");
}

export function territoryLabel(value: unknown): string {
  const key = normalizeTerritory(value);
  if (!key) return "Non renseigné";
  return TERRITORY_LABELS[key] ?? String(value);
}

export function periodicityLabel(value: unknown): string {
  const key = String(value || "")
    .trim()
    .toLowerCase();
  if (key.startsWith("mens")) return "Mensuel";
  if (key.startsWith("trim")) return "Trimestriel";
  if (key.startsWith("sem")) return "Semestriel";
  if (key.startsWith("ann")) return "Annuel";
  return key ? String(value) : "Non renseigné";
}
