import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuthAndRole,
  ApiError,
} from "@/lib/api-utils";

/** Durée du contrat en années selon le nom du produit (ex. RC Décennale = 10 ans). */
function getContractDurationYears(productName: string): number {
  const name = (productName ?? "").toLowerCase();
  if (name.includes("décennale") || name.includes("decennale")) return 10;
  return 1;
}

/** Calcule endDate à partir de startDate + durée produit. */
function computeEndDate(startDate: Date, productName: string): Date {
  const years = getContractDurationYears(productName);
  const end = new Date(startDate);
  end.setFullYear(end.getFullYear() + years);
  return end;
}

/** Extrait la prime annuelle depuis calculatedPremium (primeTotal ou totalTTC). */
function getAnnualPremiumFromCalculated(calculatedPremium: unknown): number {
  const calc = calculatedPremium as Record<string, unknown> | null;
  if (!calc) return 0;
  const primeTotal = calc.primeTotal;
  const totalTTC = calc.totalTTC;
  if (typeof primeTotal === "number" && primeTotal >= 0) return primeTotal;
  if (typeof totalTTC === "number" && totalTTC >= 0) return totalTTC;
  return 0;
}

/**
 * POST /api/quotes/[id]/approve-and-create-contract
 *
 * Approuve l'offre (quote → ACCEPTED, acceptedAt) et crée l'InsuranceContract
 * avec la startDate fournie. endDate est dérivée (ex. RC Décennale : startDate + 10 ans).
 * Body: { startDate: string } (ISO date).
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuthAndRole(["ADMIN"], async (userId) => {
      const body = await request.json();
      const { startDate: startDateStr } = body as { startDate?: string };

      if (!startDateStr) {
        throw new ApiError(400, "startDate est requis (format ISO)");
      }

      const startDate = new Date(startDateStr);
      if (Number.isNaN(startDate.getTime())) {
        throw new ApiError(400, "startDate invalide");
      }

      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: {
          product: { select: { id: true, name: true } },
          contract: { select: { id: true } },
        },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      if (quote.contract) {
        throw new ApiError(409, "Un contrat existe déjà pour ce devis");
      }

      const productName = quote.product?.name ?? "";
      const endDate = computeEndDate(startDate, productName);
      const annualPremium = getAnnualPremiumFromCalculated(
        quote.calculatedPremium
      );

      const [contract] = await prisma.$transaction([
        prisma.insuranceContract.create({
          data: {
            quoteId: quote.id,
            brokerId: quote.brokerId,
            productId: quote.productId,
            reference: quote.reference,
            status: "ACTIVE",
            startDate,
            endDate,
            annualPremium,
            paymentStatus: "PENDING",
          },
        }),
        prisma.quote.update({
          where: { id: params.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        }),
      ]);

      return createApiResponse(
        { contract: { id: contract.id, reference: contract.reference } },
        "Contrat créé et offre approuvée avec succès"
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}
