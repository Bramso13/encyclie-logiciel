/**
 * Configuration bordereau FIDELIDADE v2
 *
 * APPORTEUR : valeur unique pour tous les exports (polices et quittances).
 * Source : variable d'environnement BORDEREAU_APPORTEUR.
 * Valeur par défaut : 2518107500 (utilisée pour toutes les lignes si env non définie).
 */

const DEFAULT_APPORTEUR = "2518107500";

/**
 * Retourne la valeur APPORTEUR pour les CSV bordereau (Feuille 1 Polices et Feuille 2 Quittances).
 * Lecture depuis process.env.BORDEREAU_APPORTEUR.
 * À définir en production (ex. .env : BORDEREAU_APPORTEUR=XXX).
 */
export function getApporteur(): string {
  if (typeof process !== "undefined" && process.env?.BORDEREAU_APPORTEUR) {
    return process.env.BORDEREAU_APPORTEUR.trim();
  }
  return DEFAULT_APPORTEUR;
}
