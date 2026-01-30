/**
 * Unit tests for bordereau utility functions
 *
 * NOTE: Test infrastructure (Jest/Vitest) needs to be set up in package.json
 * Run: npm install -D jest @types/jest ts-jest
 * Or: npm install -D vitest
 */

import { ContractStatus } from "@prisma/client";
import {
  formatDate,
  mapContractStatusToEtatPolice,
  safeExtract,
} from "../utils";

describe("formatDate", () => {
  it("should format a Date object to DD/MM/YYYY", () => {
    const date = new Date("2025-01-15");
    expect(formatDate(date)).toBe("15/01/2025");
  });

  it("should format a date string to DD/MM/YYYY", () => {
    expect(formatDate("2025-12-31")).toBe("31/12/2025");
  });

  it("should handle single-digit days and months with zero padding", () => {
    const date = new Date("2025-03-05");
    expect(formatDate(date)).toBe("05/03/2025");
  });

  it("should return empty string for invalid date", () => {
    expect(formatDate("invalid-date")).toBe("");
  });
});

describe("mapContractStatusToEtatPolice", () => {
  it("should map ACTIVE to EN COURS", () => {
    expect(mapContractStatusToEtatPolice(ContractStatus.ACTIVE)).toBe(
      "EN COURS"
    );
  });

  it("should map SUSPENDED to SUSPENDU", () => {
    expect(mapContractStatusToEtatPolice(ContractStatus.SUSPENDED)).toBe(
      "SUSPENDU"
    );
  });

  it("should map EXPIRED to EXPIRE", () => {
    expect(mapContractStatusToEtatPolice(ContractStatus.EXPIRED)).toBe(
      "EXPIRE"
    );
  });

  it("should map CANCELLED to RESILIE", () => {
    expect(mapContractStatusToEtatPolice(ContractStatus.CANCELLED)).toBe(
      "RESILIE"
    );
  });

  it("should map PENDING_RENEWAL to EN ATTENTE DE RENOUVELLEMENT", () => {
    expect(mapContractStatusToEtatPolice(ContractStatus.PENDING_RENEWAL)).toBe(
      "EN ATTENTE DE RENOUVELLEMENT"
    );
  });
});

describe("safeExtract", () => {
  const testObj = {
    level1: {
      level2: {
        value: "test-value",
      },
      nullValue: null,
      undefinedValue: undefined,
    },
  };

  it("should extract nested value successfully", () => {
    expect(safeExtract(testObj, "level1.level2.value")).toBe("test-value");
  });

  it("should return default value for missing path", () => {
    expect(safeExtract(testObj, "level1.missing.path", "default")).toBe(
      "default"
    );
  });

  it("should return empty string as default when not specified", () => {
    expect(safeExtract(testObj, "nonexistent")).toBe("");
  });

  it("should return default value for null value", () => {
    expect(safeExtract(testObj, "level1.nullValue", "default")).toBe(
      "default"
    );
  });

  it("should return default value for undefined value", () => {
    expect(safeExtract(testObj, "level1.undefinedValue", "default")).toBe(
      "default"
    );
  });

  it("should handle numeric values", () => {
    const obj = { number: 123 };
    expect(safeExtract(obj, "number")).toBe("123");
  });
});
