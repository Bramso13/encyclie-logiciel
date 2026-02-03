/**
 * Tests unitaires pour getQuittancesV2 — Feuille 2 Quittances (v2).
 * Couvre : IDENTIFIANT_QUITTANCE (Q1, Q2...), structure, mapping montants/dates, GARANTIE, APPORTEUR.
 */

import { vi } from "vitest";
import { PrismaClient, PaymentScheduleStatus, PaymentMethod } from "@prisma/client";
import { getQuittancesV2 } from "../extractQuittancesV2";
import type { BordereauFiltersV2, FidelidadeQuittancesRow } from "../types";

const QUITTANCES_ROW_KEYS: (keyof FidelidadeQuittancesRow)[] = [
  "APPORTEUR",
  "IDENTIFIANT_POLICE",
  "NUMERO_AVENANT",
  "IDENTIFIANT_QUITTANCE",
  "DATE_EMISSION_QUITTANCE",
  "DATE_EFFET_QUITTANCE",
  "DATE_FIN_QUITTANCE",
  "DATE_ENCAISSEMENT",
  "STATUT_QUITTANCE",
  "GARANTIE",
  "PRIME_TTC",
  "PRIME_HT",
  "TAXES",
  "TAUX_COMMISSIONS",
  "COMMISSIONS",
  "MODE_PAIEMENT",
];

describe("getQuittancesV2", () => {
  const baseFilters: BordereauFiltersV2 = {
    dateRange: {
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-01-31"),
    },
  };

  const buildMockInstallment = (overrides: Record<string, unknown> = {}) => ({
    id: "pi1",
    scheduleId: "ps1",
    installmentNumber: 1,
    dueDate: new Date("2025-01-15"),
    amountHT: 100,
    taxAmount: 10,
    amountTTC: 110,
    rcdAmount: null,
    pjAmount: null,
    feesAmount: null,
    resumeAmount: null,
    periodStart: new Date("2025-01-01"),
    periodEnd: new Date("2025-03-31"),
    status: PaymentScheduleStatus.PAID,
    paidAt: new Date("2025-01-10"),
    paidAmount: 110,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    paymentReference: null,
    adminNotes: null,
    brokerNotes: null,
    validatedById: null,
    validatedAt: null,
    lastReminderSent: null,
    reminderCount: 0,
    createdAt: new Date("2024-12-01"),
    updatedAt: new Date("2025-01-10"),
    schedule: {
      quote: {
        reference: "REF-Q-001",
        calculatedPremium: null,
      },
    },
    ...overrides,
  });

  describe("structure de sortie", () => {
    it("retourne un tableau d'objets FidelidadeQuittancesRow", async () => {
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([]) },
      } as unknown as PrismaClient;
      const result = await getQuittancesV2(baseFilters, mockPrisma);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("chaque ligne contient toutes les colonnes Feuille 2 (ordre et noms)", async () => {
      const mockInst = buildMockInstallment();
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getQuittancesV2(baseFilters, mockPrisma);
      expect(result).toHaveLength(1);
      const row = result[0];
      for (const key of QUITTANCES_ROW_KEYS) {
        expect(row).toHaveProperty(key);
        expect(typeof row[key]).toBe("string");
      }
      expect(Object.keys(row).sort()).toEqual([...QUITTANCES_ROW_KEYS].sort());
    });

    it("IDENTIFIANT_QUITTANCE = IDENTIFIANT_POLICE + Q + numéro échéance (Q1, Q2)", async () => {
      const inst1 = buildMockInstallment({ installmentNumber: 1 });
      const inst2 = buildMockInstallment({
        id: "pi2",
        installmentNumber: 2,
        schedule: {
          quote: { reference: "REF-Q-001", calculatedPremium: null },
        },
      });
      const mockPrisma = {
        paymentInstallment: {
          findMany: vi.fn().mockResolvedValue([inst1, inst2]),
        },
      } as unknown as PrismaClient;
      const result = await getQuittancesV2(baseFilters, mockPrisma);
      expect(result).toHaveLength(2);
      expect(result[0].IDENTIFIANT_QUITTANCE).toBe("REF-Q-001Q1");
      expect(result[1].IDENTIFIANT_QUITTANCE).toBe("REF-Q-001Q2");
    });

    it("GARANTIE = RC_RCD et APPORTEUR depuis constante", async () => {
      const mockInst = buildMockInstallment();
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getQuittancesV2(baseFilters, mockPrisma);
      expect(result[0].GARANTIE).toBe("RC_RCD");
      expect(typeof result[0].APPORTEUR).toBe("string");
    });

    it("NUMERO_AVENANT vide", async () => {
      const mockInst = buildMockInstallment();
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getQuittancesV2(baseFilters, mockPrisma);
      expect(result[0].NUMERO_AVENANT).toBe("");
    });
  });

  describe("mapping montants et dates", () => {
    it("PRIME_TTC, PRIME_HT, TAXES mappés depuis amountTTC, amountHT, taxAmount", async () => {
      const mockInst = buildMockInstallment({
        amountHT: 500,
        taxAmount: 50,
        amountTTC: 550,
      });
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getQuittancesV2(baseFilters, mockPrisma);
      expect(result[0].PRIME_HT).toBe("500");
      expect(result[0].TAXES).toBe("50");
      expect(result[0].PRIME_TTC).toBe("550");
    });

    it("DATE_EFFET_QUITTANCE, DATE_FIN_QUITTANCE depuis periodStart, periodEnd", async () => {
      const mockInst = buildMockInstallment({
        periodStart: new Date("2025-02-01"),
        periodEnd: new Date("2025-04-30"),
      });
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getQuittancesV2(baseFilters, mockPrisma);
      expect(result[0].DATE_EFFET_QUITTANCE).toBe("01/02/2025");
      expect(result[0].DATE_FIN_QUITTANCE).toBe("30/04/2025");
    });

    it("STATUT_QUITTANCE ENCAISSE quand status PAID", async () => {
      const mockInst = buildMockInstallment({ status: PaymentScheduleStatus.PAID });
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getQuittancesV2(baseFilters, mockPrisma);
      expect(result[0].STATUT_QUITTANCE).toBe("ENCAISSE");
    });

    it("MODE_PAIEMENT VIREMENT quand paymentMethod BANK_TRANSFER", async () => {
      const mockInst = buildMockInstallment({
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      });
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getQuittancesV2(baseFilters, mockPrisma);
      expect(result[0].MODE_PAIEMENT).toBe("VIREMENT");
    });

    it("TAUX_COMMISSIONS et COMMISSIONS (10% de amountHT par défaut)", async () => {
      const mockInst = buildMockInstallment({ amountHT: 100 });
      const mockPrisma = {
        paymentInstallment: { findMany: vi.fn().mockResolvedValue([mockInst]) },
      } as unknown as PrismaClient;
      const result = await getQuittancesV2(baseFilters, mockPrisma);
      expect(result[0].TAUX_COMMISSIONS).toBe("10");
      expect(result[0].COMMISSIONS).toBe("10");
    });
  });
});
