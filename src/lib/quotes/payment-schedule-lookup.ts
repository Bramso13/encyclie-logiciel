import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const scheduleInclude = {
  payments: {
    include: {
      validatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      transactions: {
        include: {
          validatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" as const },
      },
    },
    orderBy: { installmentNumber: "asc" as const },
  },
} satisfies Prisma.PaymentScheduleInclude;

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function listSchedulesForQuote(
  quoteId: string,
  client: DbClient = prisma,
) {
  return client.paymentSchedule.findMany({
    where: { quoteId },
    include: scheduleInclude,
    orderBy: { vintageYear: "asc" },
  });
}

export async function findScheduleForQuote(
  quoteId: string,
  vintageYear?: number,
  client: DbClient = prisma,
) {
  if (vintageYear != null) {
    return client.paymentSchedule.findFirst({
      where: { quoteId, vintageYear },
      include: scheduleInclude,
      orderBy: { createdAt: "asc" },
    });
  }
  return client.paymentSchedule.findFirst({
    where: { quoteId },
    include: scheduleInclude,
    orderBy: { vintageYear: "asc" },
  });
}

export function asScheduleList<T>(
  schedule: T | T[] | null | undefined,
): T[] {
  if (!schedule) return [];
  return Array.isArray(schedule) ? schedule : [schedule];
}

export function flattenSchedulePayments<
  T extends { payments?: unknown[]; vintageYear?: number; id?: string },
>(schedule: T | T[] | null | undefined): unknown[] {
  if (!schedule) return [];
  const list = Array.isArray(schedule) ? schedule : [schedule];
  return list.flatMap((item) => {
    const payments = Array.isArray(item.payments) ? item.payments : [];
    return payments.map((payment) =>
      payment && typeof payment === "object"
        ? {
            ...(payment as object),
            vintageYear: item.vintageYear,
            scheduleId: item.id,
          }
        : payment,
    );
  });
}
