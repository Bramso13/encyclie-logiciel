/**
 * Tests unitaires pour generatePolicesCSV et generateQuittancesCSV (v2.4).
 * Couvre : en-tête, ordre des colonnes, échappement CSV, validation structure.
 */

import { describe, it, expect } from "vitest";
import {
  generatePolicesCSV,
  generateQuittancesCSV,
  validatePolicesCSVStructure,
  validateQuittancesCSVStructure,
  escapeCsvValue,
} from "../generateCSV";
import type { FidelidadePolicesRow, FidelidadeQuittancesRow } from "../types";

const emptyPolicesRow: FidelidadePolicesRow = {
  APPORTEUR: "",
  IDENTIFIANT_POLICE: "",
  DATE_SOUSCRIPTION: "",
  DATE_EFFET_CONTRAT: "",
  DATE_FIN_CONTRAT: "",
  NUMERO_AVENANT: "",
  MOTIF_AVENANT: "",
  DATE_EFFET_AVENANT: "",
  DATE_DEMANDE: "",
  STATUT_POLICE: "",
  DATE_STAT_POLICE: "",
  MOTIF_STATUT: "",
  FRACTIONNEMENT: "",
  NOM_ENTREPRISE_ASSURE: "",
  SIREN: "",
  ADRESSE_RISQUE: "",
  VILLE_RISQUE: "",
  CODE_POSTAL_RISQUE: "",
  CA_ENTREPRISE: "",
  EFFECTIF_ENTREPRISE: "",
  CODE_NAF: "",
  LIBELLE_ACTIVITE_1: "",
  POIDS_ACTIVITE_1: "",
  LIBELLE_ACTIVITE_2: "",
  POIDS_ACTIVITE_2: "",
  LIBELLE_ACTIVITE_3: "",
  POIDS_ACTIVITE_3: "",
  LIBELLE_ACTIVITE_4: "",
  POIDS_ACTIVITE_4: "",
  LIBELLE_ACTIVITE_5: "",
  POIDS_ACTIVITE_5: "",
  LIBELLE_ACTIVITE_6: "",
  POIDS_ACTIVITE_6: "",
  LIBELLE_ACTIVITE_7: "",
  POIDS_ACTIVITE_7: "",
  LIBELLE_ACTIVITE_8: "",
  POIDS_ACTIVITE_8: "",
};

const emptyQuittancesRow: FidelidadeQuittancesRow = {
  APPORTEUR: "",
  IDENTIFIANT_POLICE: "",
  NUMERO_AVENANT: "",
  IDENTIFIANT_QUITTANCE: "",
  DATE_EFFET_QUITTANCE: "",
  DATE_FIN_QUITTANCE: "",
  DATE_ENCAISSEMENT: "",
  STATUT_QUITTANCE: "",
  GARANTIE: "",
  PRIME_TTC: "",
  PRIME_HT: "",
  TAXES: "",
  TAUX_TAXE: "",
  COMMISSIONS: "",
  MODE_PAIEMENT: "",
};

describe("generatePolicesCSV", () => {
  it("produit un en-tête avec les colonnes Feuille 1", () => {
    const csv = generatePolicesCSV([]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("APPORTEUR");
    expect(lines[0]).toContain("IDENTIFIANT_POLICE");
    expect(lines[0]).toContain("LIBELLE_ACTIVITE_8");
    expect(lines[0]).toContain("POIDS_ACTIVITE_8");
  });

  it("produit une ligne de données par row", () => {
    const csv = generatePolicesCSV([
      { ...emptyPolicesRow, IDENTIFIANT_POLICE: "REF-1" },
      { ...emptyPolicesRow, IDENTIFIANT_POLICE: "REF-2" },
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // header + 2 data
    expect(lines[1]).toContain("REF-1");
    expect(lines[2]).toContain("REF-2");
  });

  it("échappe les virgules dans les valeurs", () => {
    const csv = generatePolicesCSV([
      { ...emptyPolicesRow, NOM_ENTREPRISE_ASSURE: "Société, SARL" },
    ]);
    expect(csv).toContain('"Société, SARL"');
  });

  it("valide la structure générée", () => {
    const csv = generatePolicesCSV([emptyPolicesRow]);
    expect(validatePolicesCSVStructure(csv)).toBe(true);
  });
});

describe("generateQuittancesCSV", () => {
  it("produit un en-tête avec les colonnes Feuille 2", () => {
    const csv = generateQuittancesCSV([]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("APPORTEUR");
    expect(lines[0]).toContain("IDENTIFIANT_QUITTANCE");
    expect(lines[0]).toContain("GARANTIE");
    expect(lines[0]).toContain("MODE_PAIEMENT");
  });

  it("produit une ligne par row", () => {
    const csv = generateQuittancesCSV([
      { ...emptyQuittancesRow, IDENTIFIANT_QUITTANCE: "REF-Q1" },
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("REF-Q1");
  });

  it("valide la structure générée", () => {
    const csv = generateQuittancesCSV([emptyQuittancesRow]);
    expect(validateQuittancesCSVStructure(csv)).toBe(true);
  });
});

describe("escapeCsvValue", () => {
  it("échappe les guillemets en double", () => {
    expect(escapeCsvValue('Texte "citation"')).toBe('"Texte ""citation"""');
  });

  it("échappe les retours à la ligne", () => {
    expect(escapeCsvValue("ligne1\nligne2")).toContain('"');
  });
});
