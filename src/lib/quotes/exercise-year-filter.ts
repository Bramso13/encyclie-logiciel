import type { Prisma } from "@prisma/client";

export function calendarYear(now = new Date()): number {
  return now.getFullYear();
}

/**
 * Filtre additif : n'exclut les dossiers que lorsqu'un exercice est demandé.
 * Brouillons sans échéancier restent visibles pour l'année civile (prod actuelle).
 */
export function quoteInExerciseYearWhere(
  year: number,
  now = new Date(),
): Prisma.QuoteWhereInput {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const yearStr = String(year);

  const matched: Prisma.QuoteWhereInput = {
    OR: [
      { paymentSchedule: { some: { vintageYear: year } } },
      {
        paymentSchedule: {
          some: {
            payments: {
              some: { dueDate: { gte: start, lt: end } },
            },
          },
        },
      },
      { vintages: { some: { year } } },
      {
        formData: {
          path: ["dateDeffet"],
          string_contains: yearStr,
        },
      },
      {
        formData: {
          path: ["dateEffet"],
          string_contains: yearStr,
        },
      },
    ],
  };

  if (year === calendarYear(now)) {
    return {
      OR: [matched, { paymentSchedule: { none: {} } }],
    };
  }

  return matched;
}
