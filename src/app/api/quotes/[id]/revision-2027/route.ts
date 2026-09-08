import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  createApiResponse,
  handleApiError,
  withAuth,
  withAuthAndRole,
} from "@/lib/api-utils";
import { calculateWithMapping } from "@/lib/utils";
import {
  adaptEcheancesForDatabase,
  regenerateScheduleWithPaymentPreservation,
} from "@/lib/payment-schedule-utils";
import {
  activitiesShareSum,
  assertFormDataUnchanged,
  buildRevision2027FormData,
  REVISION_MILLESIME_YEAR,
} from "@/lib/quotes/revision-millesime";
import { findScheduleForQuote } from "@/lib/quotes/payment-schedule-lookup";
import { hydrateTariffOverlaysFromDb } from "@/lib/tarificateurs/tariff-year-service";
import type { ActivityShare, FormData } from "@/lib/types";

const ActivitySchema = z.object({
  code: z.string().min(1),
  caSharePercent: z.number().min(0).max(100),
});

const Revision2027Schema = z.object({
  year: z.number().int().min(2027).optional().default(REVISION_MILLESIME_YEAR),
  chiffreAffaires: z.string().min(1).optional(),
  activities: z.array(ActivitySchema).min(1).optional(),
});

async function loadQuoteOrThrow(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      product: {
        select: {
          mappingFields: true,
          formFields: true,
        },
      },
    },
  });
  if (!quote) {
    throw new ApiError(404, "Devis non trouvé");
  }
  return quote;
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await loadQuoteOrThrow(params.id);
      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      const yearParam = Number(request.nextUrl.searchParams.get("year"));
      const year = Number.isInteger(yearParam) && yearParam >= 2027
        ? yearParam
        : REVISION_MILLESIME_YEAR;

      const formData = (quote.formData ?? {}) as unknown as FormData;
      const vintage = await prisma.quoteVintage.findUnique({
        where: {
          quoteId_year: { quoteId: params.id, year },
        },
      });
      const scheduleOriginal = await findScheduleForQuote(params.id);
      const scheduleYear = await findScheduleForQuote(params.id, year);

      return createApiResponse({
        year,
        original: {
          chiffreAffaires: formData.chiffreAffaires ?? "",
          activities: formData.activities ?? [],
          dateDeffet: formData.dateDeffet ?? "",
          calculatedPremium: quote.calculatedPremium,
          schedule: scheduleOriginal,
        },
        revision: vintage
          ? {
              id: vintage.id,
              year: vintage.year,
              chiffreAffaires: vintage.chiffreAffaires,
              activities: vintage.activities,
              calculatedPremium: vintage.calculatedPremium,
              schedule: scheduleYear,
            }
          : null,
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    return await withAuthAndRole(["ADMIN"], async (userId, userRole) => {
      const body = Revision2027Schema.parse(await request.json());
      const year = body.year;
      if (body.activities && Math.abs(activitiesShareSum(body.activities) - 100) > 0.01) {
        throw new ApiError(400, "La répartition des activités doit totaliser 100 %");
      }

      await hydrateTariffOverlaysFromDb();

      const quote = await loadQuoteOrThrow(params.id);
      const originalFormData = structuredClone(
        quote.formData ?? {},
      ) as unknown as FormData;
      const originalPremium = quote.calculatedPremium;

      const formData2027 = buildRevision2027FormData(
        originalFormData,
        {
          chiffreAffaires: body.chiffreAffaires,
          activities: body.activities as ActivityShare[] | undefined,
        },
        year,
      );

      const mapping = (quote.product.mappingFields ?? {}) as Record<string, string>;
      const formFields = (quote.product.formFields ?? {}) as Record<string, unknown>;
      if (!Object.keys(mapping).length) {
        throw new ApiError(400, "Mapping tarifaire du produit introuvable");
      }

      const calculationResult = calculateWithMapping(
        {
          ...quote,
          formData: {
            ...formData2027,
            dateEffet: formData2027.dateDeffet,
          },
        },
        mapping,
        formFields,
      );
      const echeances = calculationResult?.echeancier?.echeances;
      if (!Array.isArray(echeances) || echeances.length === 0) {
        throw new ApiError(400, `La retarification ${year} n'a produit aucun échéancier`);
      }

      const adapted = adaptEcheancesForDatabase(echeances);
      const totalAmountHT = adapted.reduce((sum, item) => sum + item.amountHT, 0);
      const totalTaxAmount = adapted.reduce((sum, item) => sum + item.taxAmount, 0);
      const totalAmountTTC = adapted.reduce((sum, item) => sum + item.amountTTC, 0);

      const ipAddress =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";

      const result = await prisma.$transaction(async (tx) => {
        const stillOriginal = await tx.quote.findUnique({
          where: { id: params.id },
          select: { formData: true, calculatedPremium: true },
        });
        if (!stillOriginal) {
          throw new ApiError(404, "Devis non trouvé");
        }
        assertFormDataUnchanged(
          originalFormData,
          stillOriginal.formData as unknown as FormData,
        );
        if (
          JSON.stringify(stillOriginal.calculatedPremium) !==
          JSON.stringify(originalPremium)
        ) {
          throw new ApiError(409, "La prime 2026 a changé pendant la révision");
        }

        const vintage = await tx.quoteVintage.upsert({
          where: {
            quoteId_year: { quoteId: params.id, year },
          },
          create: {
            quoteId: params.id,
            year,
            chiffreAffaires: formData2027.chiffreAffaires,
            activities: formData2027.activities as object[],
            calculatedPremium: calculationResult as object,
            createdById: userId,
          },
          update: {
            chiffreAffaires: formData2027.chiffreAffaires,
            activities: formData2027.activities as object[],
            calculatedPremium: calculationResult as object,
          },
        });

        const existing2027 = await tx.paymentSchedule.findFirst({
          where: {
            quoteId: params.id,
            vintageYear: year,
          },
          include: { payments: true },
          orderBy: { createdAt: "asc" },
        });

        let schedule;
        if (existing2027 && existing2027.payments.length > 0) {
          await tx.paymentSchedule.update({
            where: { id: existing2027.id },
            data: {
              totalAmountHT,
              totalTaxAmount,
              totalAmountTTC,
              startDate: adapted[0].periodStart,
              endDate: adapted[adapted.length - 1].periodEnd,
            },
          });
          await regenerateScheduleWithPaymentPreservation(
            tx,
            existing2027.id,
            adapted,
          );
          schedule = await tx.paymentSchedule.findUnique({
            where: { id: existing2027.id },
            include: { payments: { orderBy: { installmentNumber: "asc" } } },
          });
        } else if (existing2027) {
          schedule = await tx.paymentSchedule.update({
            where: { id: existing2027.id },
            data: {
              totalAmountHT,
              totalTaxAmount,
              totalAmountTTC,
              startDate: adapted[0].periodStart,
              endDate: adapted[adapted.length - 1].periodEnd,
              status: "PENDING",
              payments: {
                create: adapted.map((item) => ({
                  ...item,
                  status: "PENDING",
                })),
              },
            },
            include: { payments: { orderBy: { installmentNumber: "asc" } } },
          });
        } else {
          schedule = await tx.paymentSchedule.create({
            data: {
              quoteId: params.id,
              vintageYear: year,
              totalAmountHT,
              totalTaxAmount,
              totalAmountTTC,
              startDate: adapted[0].periodStart,
              endDate: adapted[adapted.length - 1].periodEnd,
              status: "PENDING",
              payments: {
                create: adapted.map((item) => ({
                  ...item,
                  status: "PENDING",
                })),
              },
            },
            include: { payments: { orderBy: { installmentNumber: "asc" } } },
          });
        }

        const lastVersion = await tx.quoteVersion.findFirst({
          where: { quoteId: params.id },
          orderBy: { version: "desc" },
          select: { version: true },
        });

        await tx.quoteVersion.create({
          data: {
            quoteId: params.id,
            version: (lastVersion?.version || 0) + 1,
            status: quote.status,
            companyData: quote.companyData as object,
            formData: originalFormData as object,
            calculatedPremium: originalPremium as object | undefined,
            offerData: quote.offerData as object | undefined,
            validUntil: quote.validUntil,
            submittedAt: quote.submittedAt,
            offerReadyAt: quote.offerReadyAt,
            offerSentAt: quote.offerSentAt,
            acceptedAt: quote.acceptedAt,
            changedById: userId,
            changeReason: `Révision millésime ${year} (avenant)`,
            action: "PREMIUM_UPDATE",
            changes: {
              millesime: {
                year,
                chiffreAffaires: formData2027.chiffreAffaires,
                activities: formData2027.activities,
              },
            } as object,
            userRole,
            ipAddress,
            userAgent,
          },
        });

        const untouched = await tx.quote.findUnique({
          where: { id: params.id },
          select: { formData: true, calculatedPremium: true },
        });
        assertFormDataUnchanged(
          originalFormData,
          untouched?.formData as unknown as FormData,
        );

        return { vintage, schedule, calculationResult };
      });

      return createApiResponse(
        {
          year,
          original: {
            chiffreAffaires: originalFormData.chiffreAffaires,
            activities: originalFormData.activities,
            calculatedPremium: originalPremium,
          },
          revision: {
            id: result.vintage.id,
            year: result.vintage.year,
            chiffreAffaires: result.vintage.chiffreAffaires,
            activities: result.vintage.activities,
            calculatedPremium: result.vintage.calculatedPremium,
            schedule: result.schedule,
          },
        },
        `Révision ${year} enregistrée — appel de prime et échéancier ${year} créés en avenant`,
      );
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleApiError(new ApiError(400, error.issues[0]?.message ?? "Données invalides"));
    }
    return handleApiError(error);
  }
}
