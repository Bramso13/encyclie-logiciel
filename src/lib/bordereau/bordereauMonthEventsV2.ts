import { PrismaClient, QuoteStatus } from "@prisma/client";
import type { BordereauFiltersV2 } from "./types";

/** Devis avec contrat / échéancier actif (hors brouillon ou rejet). */
export const BORDEREAU_ACTIVE_QUOTE_STATUSES: QuoteStatus[] = [
  QuoteStatus.ACCEPTED,
  QuoteStatus.PRIME_CALL_EMITTED,
  QuoteStatus.INSTALLMENT_IN_PROGRESS,
];

/** Événement du mois retenu pour le bordereau */
export type BordereauMonthEventType =
  | "EMISSION"
  | "REGLEMENT"
  | "RESILIATION";

export interface BordereauMonthEvent<TInst = unknown> {
  installment: TInst;
  eventType: BordereauMonthEventType;
  eventDate: Date;
}

/**
 * Période demi-ouverte [start, end) — end = 1er jour du mois suivant (comme l’UI admin).
 */
export function isDateInBordereauRange(
  date: Date,
  start: Date,
  end: Date,
): boolean {
  return date >= start && date < end;
}

export function isSameCalendarMonth(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth()
  );
}

/**
 * Mois du bordereau où la ligne EMISSION doit figurer.
 * Si l’appel (emissionDate) est dans un mois antérieur au début de période de l’échéance,
 * l’émission est reportée au bordereau du mois de periodStart (période de l’échéance concernée).
 */
export function getEmissionBordereauDate(inst: {
  emissionDate: Date | null;
  periodStart: Date;
  installmentNumber: number;
}): Date | null {
  if (inst.emissionDate) {
    if (!isSameCalendarMonth(inst.emissionDate, inst.periodStart)) {
      return inst.periodStart;
    }
    return inst.emissionDate;
  }

  if (inst.installmentNumber === 1) {
    return inst.periodStart;
  }

  return null;
}

/** DATE_ETAT_POLICE / eventDate affiché sur la ligne EMISSION */
function getEmissionEventDateValue(inst: {
  emissionDate: Date | null;
  periodStart: Date;
}): Date {
  return inst.emissionDate ?? inst.periodStart;
}

function getEmissionEventForMonth(
  inst: {
    emissionDate: Date | null;
    periodStart: Date;
    installmentNumber: number;
  },
  start: Date,
  end: Date,
): { eventDate: Date } | null {
  const bordereauDate = getEmissionBordereauDate(inst);
  if (!bordereauDate || !isDateInBordereauRange(bordereauDate, start, end)) {
    return null;
  }
  return { eventDate: getEmissionEventDateValue(inst) };
}

const EVENT_TYPE_SORT_ORDER: Record<BordereauMonthEventType, number> = {
  EMISSION: 0,
  REGLEMENT: 1,
  RESILIATION: 2,
};

/**
 * Une ligne par événement du mois :
 * - REGLEMENT si paidAt dans le mois (prioritaire : pas d’EMISSION sur la même échéance)
 * - sinon EMISSION si appel de prime (emissionDate) ou repli periodStart (1re échéance)
 * Émission et règlement sur des mois différents → une ligne par bordereau.
 */
export function expandMonthEvents<T extends {
  emissionDate: Date | null;
  paidAt: Date | null;
  periodStart: Date;
  schedule?: { quote?: { reference?: string | null } };
  installmentNumber: number;
}>(
  installments: T[],
  start: Date,
  end: Date,
): BordereauMonthEvent<T>[] {
  const events: BordereauMonthEvent<T>[] = [];

  for (const inst of installments) {
    const paidInMonth =
      inst.paidAt != null && isDateInBordereauRange(inst.paidAt, start, end);

    if (paidInMonth) {
      events.push({
        installment: inst,
        eventType: "REGLEMENT",
        eventDate: inst.paidAt!,
      });
      continue;
    }

    const emission = getEmissionEventForMonth(inst, start, end);
    if (emission) {
      events.push({
        installment: inst,
        eventType: "EMISSION",
        eventDate: emission.eventDate,
      });
    }
  }

  events.sort((a, b) => {
    const refA = a.installment.schedule?.quote?.reference ?? "";
    const refB = b.installment.schedule?.quote?.reference ?? "";
    if (refA !== refB) return refA.localeCompare(refB);
    if (a.installment.installmentNumber !== b.installment.installmentNumber) {
      return a.installment.installmentNumber - b.installment.installmentNumber;
    }
    const dateDiff = a.eventDate.getTime() - b.eventDate.getTime();
    if (dateDiff !== 0) return dateDiff;
    return (
      EVENT_TYPE_SORT_ORDER[a.eventType] - EVENT_TYPE_SORT_ORDER[b.eventType]
    );
  });

  return events;
}

export function endOfResiliationMonth(resiliationDate: Date): Date {
  return new Date(
    resiliationDate.getFullYear(),
    resiliationDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

function filterPostResiliation(installments: any[]): any[] {
  return installments.filter((inst) => {
    const resiliationDate: Date | null = inst.schedule?.resiliationDate ?? null;
    if (!resiliationDate) return true;
    return inst.periodStart <= endOfResiliationMonth(resiliationDate);
  });
}

/** Dernière échéance encore couverte à la date de résiliation. */
export function pickInstallmentForResiliation<
  T extends { periodStart: Date; installmentNumber: number },
>(installments: T[], resiliationDate: Date): T | null {
  const end = endOfResiliationMonth(resiliationDate);
  const eligible = installments.filter((i) => i.periodStart <= end);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, cur) =>
    cur.installmentNumber > best.installmentNumber ? cur : best,
  );
}

const installmentInclude = {
  schedule: {
    include: {
      payments: {
        orderBy: { installmentNumber: "asc" as const },
        select: {
          installmentNumber: true,
          periodStart: true,
          amountHT: true,
          amountTTC: true,
          taxAmount: true,
          rcdAmount: true,
          pjAmount: true,
          feesAmount: true,
          resumeAmount: true,
        },
      },
      quote: {
        include: {
          product: true,
          contract: true,
        },
      },
    },
  },
  transactions: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { method: true },
  },
};

function sortMonthEvents(events: BordereauMonthEvent<any>[]): BordereauMonthEvent<any>[] {
  return [...events].sort((a, b) => {
    const refA = a.installment.schedule?.quote?.reference ?? "";
    const refB = b.installment.schedule?.quote?.reference ?? "";
    if (refA !== refB) return refA.localeCompare(refB);
    if (a.installment.installmentNumber !== b.installment.installmentNumber) {
      return a.installment.installmentNumber - b.installment.installmentNumber;
    }
    return a.eventDate.getTime() - b.eventDate.getTime();
  });
}

async function appendResiliationMonthEvents(
  prisma: PrismaClient,
  events: BordereauMonthEvent<any>[],
  startDate: Date,
  endDate: Date,
): Promise<BordereauMonthEvent<any>[]> {
  const quoteIdsWithEvent = new Set(
    events
      .map((e) => e.installment.schedule?.quote?.id)
      .filter((id): id is string => !!id),
  );

  const schedules = await prisma.paymentSchedule.findMany({
    where: {
      resiliationDate: { gte: startDate, lt: endDate },
      quote: { status: { in: BORDEREAU_ACTIVE_QUOTE_STATUSES } },
    },
    include: {
      quote: true,
      payments: {
        include: installmentInclude,
        orderBy: { installmentNumber: "asc" },
      },
    },
  });

  const extra: BordereauMonthEvent<any>[] = [];
  for (const schedule of schedules) {
    if (!schedule.resiliationDate || quoteIdsWithEvent.has(schedule.quoteId)) {
      continue;
    }
    const inst = pickInstallmentForResiliation(
      schedule.payments,
      schedule.resiliationDate,
    );
    if (!inst) continue;
    extra.push({
      installment: inst,
      eventType: "RESILIATION",
      eventDate: schedule.resiliationDate,
    });
    quoteIdsWithEvent.add(schedule.quoteId);
  }

  if (extra.length === 0) return events;
  return sortMonthEvents([...events, ...extra]);
}

/**
 * Charge les échéances + événements du mois (source unique polices / quittances).
 */
export async function getBordereauMonthEvents(
  prisma: PrismaClient,
  filters: BordereauFiltersV2,
): Promise<BordereauMonthEvent<any>[]> {
  const { startDate, endDate } = filters.dateRange;

  const installments = await prisma.paymentInstallment.findMany({
    where: {
      schedule: {
        quote: { status: { in: BORDEREAU_ACTIVE_QUOTE_STATUSES } },
      },
      OR: [
        { paidAt: { gte: startDate, lt: endDate } },
        { emissionDate: { gte: startDate, lt: endDate } },
        {
          AND: [
            { emissionDate: null },
            { periodStart: { gte: startDate, lt: endDate } },
          ],
        },
        // Appel daté avant le mois de la période → EMISSION au mois de periodStart
        {
          AND: [
            { emissionDate: { not: null } },
            { periodStart: { gte: startDate, lt: endDate } },
          ],
        },
      ],
    },
    include: installmentInclude,
  });

  const filtered = filterPostResiliation(installments);
  const events = expandMonthEvents(filtered, startDate, endDate);
  return appendResiliationMonthEvents(prisma, events, startDate, endDate);
}
