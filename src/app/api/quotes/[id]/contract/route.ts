import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateContractSchema } from "@/lib/validations";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";
import { ContractStatus } from "@prisma/client";

// GET /api/quotes/[id]/contract - Get the contract linked to this quote
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: { id: true, brokerId: true },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      const contract = await prisma.insuranceContract.findUnique({
        where: { quoteId: params.id },
        select: {
          id: true,
          reference: true,
          status: true,
          startDate: true,
          endDate: true,
          updatedAt: true,
        },
      });

      if (!contract) {
        return createApiResponse(null, "Aucun contrat associé");
      }

      return createApiResponse(contract);
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/quotes/[id]/contract - Create a contract for this quote (if none exists)
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          brokerId: true,
          reference: true,
          formData: true,
          productId: true,
          contract: { select: { id: true } },
        },
      });

      if (!quote) throw new ApiError(404, "Devis non trouvé");
      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }
      if (quote.contract) {
        throw new ApiError(409, "Un contrat est déjà associé à ce devis");
      }

      const body = await request.json();
      const { startDate } = body as { startDate: string };

      if (!startDate) throw new ApiError(400, "La date d'effet (startDate) est obligatoire");

      const start = new Date(startDate);
      // endDate par défaut = startDate + 1 an
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);

      // Calcul de la prime annuelle depuis formData si disponible
      const formData = (quote.formData ?? {}) as Record<string, any>;
      const annualPremium =
        Number(formData.primeTTC ?? formData.primeAnnuelleTTC ?? formData.totalTTC ?? 0);

      // Référence contrat = référence devis (garantit l'unicité si déjà unique)
      const reference = `${quote.reference ?? params.id}-C`;

      const contract = await prisma.insuranceContract.create({
        data: {
          reference,
          quoteId: params.id,
          brokerId: quote.brokerId,
          productId: quote.productId,
          startDate: start,
          endDate: end,
          annualPremium,
          status: "ACTIVE",
        },
        select: {
          id: true,
          reference: true,
          status: true,
          startDate: true,
          endDate: true,
          updatedAt: true,
        },
      });

      return createApiResponse(contract, "Contrat créé avec succès");
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/quotes/[id]/contract - Update the contract linked to this quote
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: { id: true, brokerId: true },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      const contract = await prisma.insuranceContract.findUnique({
        where: { quoteId: params.id },
        select: { id: true, reference: true, status: true },
      });

      if (!contract) {
        throw new ApiError(404, "Contrat non trouvé pour ce devis");
      }

      const body = await request.json();
      const validatedData = UpdateContractSchema.parse(body);

      const updateData: { reference?: string; status?: ContractStatus } = {};

      if (validatedData.reference !== undefined) {
        if (validatedData.reference !== contract.reference) {
          const existing = await prisma.insuranceContract.findUnique({
            where: { reference: validatedData.reference },
            select: { id: true },
          });
          if (existing) {
            throw new ApiError(400, "Cette référence de contrat existe déjà");
          }
        }
        updateData.reference = validatedData.reference;
      }

      if (validatedData.status !== undefined) {
        updateData.status = validatedData.status;
      }

      if (Object.keys(updateData).length === 0) {
        return createApiResponse(contract, "Aucune modification");
      }

      const updated = await prisma.insuranceContract.update({
        where: { id: contract.id },
        data: updateData,
      });

      return createApiResponse(updated, "Contrat mis à jour");
    });
  } catch (error) {
    return handleApiError(error);
  }
}
