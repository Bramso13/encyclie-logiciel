import { describe, expect, it } from "vitest";
import {
  calendarYear,
  quoteInExerciseYearWhere,
} from "../exercise-year-filter";

describe("quoteInExerciseYearWhere", () => {
  it("pour l'année civile, conserve les dossiers sans échéancier", () => {
    const now = new Date(2026, 5, 1);
    const where = quoteInExerciseYearWhere(2026, now);
    expect(where).toEqual(
      expect.objectContaining({
        OR: expect.arrayContaining([{ paymentSchedule: { none: {} } }]),
      }),
    );
  });

  it("pour une autre année, ne rajoute pas le filet des brouillons", () => {
    const now = new Date(2026, 5, 1);
    const where = quoteInExerciseYearWhere(2027, now);
    expect(JSON.stringify(where)).not.toContain('"none"');
    expect(calendarYear(now)).toBe(2026);
  });
});
