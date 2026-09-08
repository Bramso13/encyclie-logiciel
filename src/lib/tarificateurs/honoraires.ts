/**
 * Honoraires de gestion courtier (saisie dossier, montant €).
 * Une seule source : honoraireCourtier prime sur le mapping produit.
 * 0 / vide = comportement historique (mapping ou 0).
 */
export function resolveHonoraireGestion(
  honoraireCourtier: unknown,
  mappedHonoraireGestion = 0,
): number {
  if (honoraireCourtier === undefined || honoraireCourtier === null) {
    return Number(mappedHonoraireGestion) || 0;
  }
  const raw = String(honoraireCourtier).trim();
  if (raw === "") {
    return Number(mappedHonoraireGestion) || 0;
  }
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed === 0) {
    return Number(mappedHonoraireGestion) || 0;
  }
  return parsed;
}
