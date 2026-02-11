/**
 * Tests unitaires pour getPolicesV2 — Feuille 1 Polices (v2).
 * Couvre : mapping, < 8 activités, companyData partiel, pas de codeNAF, ordre/noms colonnes.
 */

import { vi } from "vitest";
import { PrismaClient, QuoteStatus } from "@prisma/client";
import { getPolicesV2 } from "../extractPolicesV2";
import type { BordereauFiltersV2, FidelidadePolicesRow } from "../types";

const POLICES_ROW_KEYS: (keyof FidelidadePolicesRow)[] = [
  "APPORTEUR",
  "IDENTIFIANT_POLICE",
  "DATE_SOUSCRIPTION",
  "DATE_EFFET_CONTRAT",
  "DATE_FIN_CONTRAT",
  "NUMERO_AVENANT",
  "MOTIF_AVENANT",
  "DATE_EFFET_AVENANT",
  "DATE_DEMANDE",
  "STATUT_POLICE",
  "DATE_STAT_POLICE",
  "MOTIF_STATUT",
  "FRACTIONNEMENT",
  "NOM_ENTREPRISE_ASSURE",
  "SIREN",
  "ADRESSE_RISQUE",
  "VILLE_RISQUE",
  "CODE_POSTAL_RISQUE",
  "CA_ENTREPRISE",
  "EFFECTIF_ENTREPRISE",
  "CODE_NAF",
  "LIBELLE_ACTIVITE_1",
  "POIDS_ACTIVITE_1",
  "LIBELLE_ACTIVITE_2",
  "POIDS_ACTIVITE_2",
  "LIBELLE_ACTIVITE_3",
  "POIDS_ACTIVITE_3",
  "LIBELLE_ACTIVITE_4",
  "POIDS_ACTIVITE_4",
  "LIBELLE_ACTIVITE_5",
  "POIDS_ACTIVITE_5",
  "LIBELLE_ACTIVITE_6",
  "POIDS_ACTIVITE_6",
  "LIBELLE_ACTIVITE_7",
  "POIDS_ACTIVITE_7",
  "LIBELLE_ACTIVITE_8",
  "POIDS_ACTIVITE_8",
];

describe("getPolicesV2", () => {
  const baseFilters: BordereauFiltersV2 = {
    dateRange: {
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
    },
  };

  describe("structure de sortie", () => {
    it("retourne un tableau d’objets FidelidadePolicesRow", async () => {
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([]) },
      } as unknown as PrismaClient;
      const result = await getPolicesV2(baseFilters, mockPrisma);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("chaque ligne contient toutes les colonnes Feuille 1 (ordre et noms)", async () => {
      const mockInst = {
        id: "pi1",
        scheduleId: "ps1",
        installmentNumber: 1,
        periodEnd: new Date("2025-03-31"),
        schedule: {
          quote: {
            reference: "Q-REF-001",
            submittedAt: new Date("2024-12-01"),
            codeNAF: "4120A",
            status: QuoteStatus.ACCEPTED,
            updatedAt: new Date("2025-01-10"),
            acceptedAt: new Date("2025-01-05"),
            product: { name: "RC Décennale" },
            companyData: { companyName: "Société A", siret: "12345678901234", address: "1 rue X", city: "Paris", postalCode: "75001", revenue: 100000, employeeCount: 5 },
            formData: {
              dateDeffet: new Date("2025-01-01"),
              periodicity: "trimestriel",
              activites: [
                { code: 1, caSharePercent: 60 },
                { code: 2, caSharePercent: 40 },
              ],
            },
            contract: { startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31"), status: "ACTIVE", updatedAt: new Date("2025-01-15") },
          },
        },
      };
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getPolicesV2(baseFilters, mockPrisma);
      expect(result).toHaveLength(1);
      const row = result[0];
      for (const key of POLICES_ROW_KEYS) {
        expect(row).toHaveProperty(key);
        expect(typeof row[key]).toBe("string");
      }
      expect(Object.keys(row).sort()).toEqual([...POLICES_ROW_KEYS].sort());
    });

    it("IDENTIFIANT_POLICE = Quote.reference", async () => {
      const mockInst = {
        id: "pi1",
        scheduleId: "ps1",
        installmentNumber: 1,
        periodEnd: new Date("2025-03-31"),
        schedule: {
          quote: {
            reference: "REF-POL-123",
            submittedAt: new Date("2024-12-01"),
            codeNAF: null,
            status: QuoteStatus.ACCEPTED,
            updatedAt: new Date("2025-01-10"),
            acceptedAt: null,
            product: null,
            companyData: {},
            formData: { dateDeffet: new Date("2025-01-01") },
            contract: null,
          },
        },
      };
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getPolicesV2(baseFilters, mockPrisma);
      expect(result[0].IDENTIFIANT_POLICE).toBe("REF-POL-123");
    });

    it("DATE_SOUSCRIPTION = formData.dateDeffet, DATE_FIN_CONTRAT = periodEnd échéance, FRACTIONNEMENT = periodicity", async () => {
      const mockInst = {
        id: "pi1",
        scheduleId: "ps1",
        installmentNumber: 1,
        periodEnd: new Date("2025-03-31"),
        schedule: {
          quote: {
            reference: "Q1",
            submittedAt: new Date("2024-12-01"),
            codeNAF: null,
            status: QuoteStatus.ACCEPTED,
            updatedAt: new Date("2025-01-10"),
            acceptedAt: null,
            product: null,
            companyData: {},
            formData: { dateDeffet: new Date("2025-01-15"), periodicity: "trimestriel" },
            contract: null,
          },
        },
      };
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getPolicesV2(baseFilters, mockPrisma);
      expect(result[0].DATE_SOUSCRIPTION).toBe("15/01/2025");
      expect(result[0].DATE_FIN_CONTRAT).toBe("31/03/2025");
      expect(result[0].FRACTIONNEMENT).toBe("trimestriel");
    });

    it("NUMERO_AVENANT, MOTIF_AVENANT, DATE_EFFET_AVENANT, MOTIF_STATUT sont vides", async () => {
      const mockInst = {
        id: "pi1",
        scheduleId: "ps1",
        installmentNumber: 1,
        periodEnd: new Date("2025-03-31"),
        schedule: {
          quote: {
            reference: "Q1",
            submittedAt: new Date("2024-12-01"),
            codeNAF: null,
            status: QuoteStatus.ACCEPTED,
            updatedAt: new Date("2025-01-10"),
            acceptedAt: null,
            product: null,
            companyData: {},
            formData: { dateDeffet: new Date("2025-01-01") },
            contract: null,
          },
        },
      };
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getPolicesV2(baseFilters, mockPrisma);
      expect(result[0].NUMERO_AVENANT).toBe("");
      expect(result[0].MOTIF_AVENANT).toBe("");
      expect(result[0].DATE_EFFET_AVENANT).toBe("");
      expect(result[0].MOTIF_STATUT).toBe("");
    });
  });

  describe("moins de 8 activités", () => {
    it("complète à 8 paires avec chaînes vides pour les activités manquantes", async () => {
      const mockInst = {
        id: "pi1",
        scheduleId: "ps1",
        installmentNumber: 1,
        periodEnd: new Date("2025-03-31"),
        schedule: {
          quote: {
            reference: "Q2",
            submittedAt: new Date("2024-12-01"),
            codeNAF: null,
            status: QuoteStatus.ACCEPTED,
            updatedAt: new Date("2025-01-10"),
            acceptedAt: null,
            product: null,
            companyData: {},
            formData: {
              dateDeffet: new Date("2025-01-01"),
              activites: [
                { code: 1, caSharePercent: 70 },
                { code: 2, caSharePercent: 30 },
              ],
            },
            contract: null,
          },
        },
      };
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getPolicesV2(baseFilters, mockPrisma);
      const row = result[0];
      expect(row.POIDS_ACTIVITE_1).toBe("70");
      expect(row.POIDS_ACTIVITE_2).toBe("30");
      expect(row.LIBELLE_ACTIVITE_3).toBe("");
      expect(row.POIDS_ACTIVITE_3).toBe("");
      expect(row.LIBELLE_ACTIVITE_4).toBe("");
      expect(row.POIDS_ACTIVITE_4).toBe("");
    });
  });

  describe("companyData partiel", () => {
    it("retourne chaîne vide pour champs manquants (SIREN, CA_ENTREPRISE, etc.)", async () => {
      const mockInst = {
        id: "pi1",
        scheduleId: "ps1",
        installmentNumber: 1,
        periodEnd: new Date("2025-03-31"),
        schedule: {
          quote: {
            reference: "Q3",
            submittedAt: new Date("2024-12-01"),
            codeNAF: null,
            status: QuoteStatus.ACCEPTED,
            updatedAt: new Date("2025-01-10"),
            acceptedAt: null,
            product: null,
            companyData: { companyName: "Only Name" },
            formData: { dateDeffet: new Date("2025-01-01") },
            contract: null,
          },
        },
      };
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getPolicesV2(baseFilters, mockPrisma);
      const row = result[0];
      expect(row.NOM_ENTREPRISE_ASSURE).toBe("Only Name");
      expect(row.SIREN).toBe("");
      expect(row.ADRESSE_RISQUE).toBe("");
      expect(row.VILLE_RISQUE).toBe("");
      expect(row.CODE_POSTAL_RISQUE).toBe("");
      expect(row.CA_ENTREPRISE).toBe("");
      expect(row.EFFECTIF_ENTREPRISE).toBe("");
    });
  });

  describe("pas de codeNAF", () => {
    it("retourne chaîne vide pour CODE_NAF si quote.codeNAF et formData.codeNaf absents", async () => {
      const mockInst = {
        id: "pi1",
        scheduleId: "ps1",
        installmentNumber: 1,
        periodEnd: new Date("2025-03-31"),
        schedule: {
          quote: {
            reference: "Q4",
            submittedAt: new Date("2024-12-01"),
            codeNAF: null,
            status: QuoteStatus.ACCEPTED,
            updatedAt: new Date("2025-01-10"),
            acceptedAt: null,
            product: null,
            companyData: {},
            formData: { dateDeffet: new Date("2025-01-01") },
            contract: null,
          },
        },
      };
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getPolicesV2(baseFilters, mockPrisma);
      expect(result[0].CODE_NAF).toBe("");
    });

    it("utilise quote.codeNAF si présent", async () => {
      const mockInst = {
        id: "pi1",
        scheduleId: "ps1",
        installmentNumber: 1,
        periodEnd: new Date("2025-03-31"),
        schedule: {
          quote: {
            reference: "Q5",
            submittedAt: new Date("2024-12-01"),
            codeNAF: "6201Z",
            status: QuoteStatus.ACCEPTED,
            updatedAt: new Date("2025-01-10"),
            acceptedAt: null,
            product: null,
            companyData: {},
            formData: { dateDeffet: new Date("2025-01-01") },
            contract: null,
          },
        },
      };
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getPolicesV2(baseFilters, mockPrisma);
      expect(result[0].CODE_NAF).toBe("6201Z");
    });
  });

  describe("pas de valeurs undefined", () => {
    it("tous les champs sont des chaînes (pas undefined)", async () => {
      const mockInst = {
        id: "pi1",
        scheduleId: "ps1",
        installmentNumber: 1,
        periodEnd: new Date("2025-03-31"),
        schedule: {
          quote: {
            reference: "Q6",
            submittedAt: null,
            codeNAF: null,
            status: QuoteStatus.ACCEPTED,
            updatedAt: new Date("2025-01-10"),
            acceptedAt: null,
            product: null,
            companyData: null,
            formData: null,
            contract: null,
          },
        },
      };
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getPolicesV2(baseFilters, mockPrisma);
      const row = result[0];
      for (const key of POLICES_ROW_KEYS) {
        expect(row[key]).toBeDefined();
        expect(typeof row[key]).toBe("string");
      }
    });
  });
});
