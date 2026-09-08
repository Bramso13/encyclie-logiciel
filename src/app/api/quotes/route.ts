import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CreateQuoteSchema,
  PaginationSchema,
  QuoteFiltersSchema,
} from "@/lib/validations";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  validatePagination,
  buildWhereClause,
  generateReference,
} from "@/lib/api-utils";
import {
  calendarYear,
  quoteInExerciseYearWhere,
} from "@/lib/quotes/exercise-year-filter";

// GET /api/quotes - List quotes for authenticated user
export async function GET(request: NextRequest) {
  try {
    return await withAuth(async (userId, userRole) => {
      const { searchParams } = new URL(request.url);

      // Validate pagination
      const { page, limit, skip, take } = validatePagination(searchParams);

      // Validate filters
      const filters = QuoteFiltersSchema.parse({
        status: searchParams.get("status") || undefined,
        productId: searchParams.get("productId") || undefined,
        brokerId: searchParams.get("brokerId") || undefined,
        dateFrom: searchParams.get("dateFrom") || undefined,
        dateTo: searchParams.get("dateTo") || undefined,
        search: searchParams.get("search") || undefined,
      });

      const { search, ...clauseFilters } = filters;
      const where = buildWhereClause(clauseFilters);
      const searchQuery = search?.trim();
      if (searchQuery) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          {
            OR: [
              { reference: { contains: searchQuery, mode: "insensitive" } },
              {
                companyData: {
                  path: ["companyName"],
                  string_contains: searchQuery,
                },
              },
              {
                formData: {
                  path: ["companyName"],
                  string_contains: searchQuery,
                },
              },
            ],
          },
        ];
      }

      // Add role-based filtering
      if (userRole === "BROKER") {
        where.brokerId = userId;
      } else if (userRole === "UNDERWRITER") {
        // Underwriters can see quotes in progress
        where.status = {
          in: ["SUBMITTED", "IN_PROGRESS", "COMPLEMENT_REQUIRED"],
        };
      }
      // ADMIN can see all quotes

      // Filtre optionnel : uniquement les devis qui ont un échéancier
      const hasPaymentSchedule =
        searchParams.get("hasPaymentSchedule") === "true";
      if (hasPaymentSchedule) {
        where.paymentSchedule = { some: {} };
      }

      const exerciseYearRaw = searchParams.get("exerciseYear");
      const exerciseYear = exerciseYearRaw ? Number(exerciseYearRaw) : NaN;
      // Courtiers / année civile : même liste qu'aujourd'hui. Le filtre
      // ne s'applique que si un admin choisit un autre exercice.
      if (
        userRole === "ADMIN" &&
        Number.isInteger(exerciseYear) &&
        exerciseYear !== calendarYear()
      ) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          quoteInExerciseYearWhere(exerciseYear),
        ];
      }

      const includeBase = {
        product: {
          select: { name: true, code: true, requiredDocs: true },
        },
        broker: {
          select: { name: true, companyName: true },
        },
        documents: {
          select: {
            id: true,
            fileName: true,
            documentType: true,
            uploadedAt: true,
          },
        },
        _count: {
          select: { documents: true },
        },
      };

      const includeWithSchedule = hasPaymentSchedule
        ? {
            ...includeBase,
            paymentSchedule: {
              include: {
                payments: { orderBy: { installmentNumber: "asc" as const } },
              },
            },
          }
        : includeBase;

      // Get quotes with relations
      const [quotes, total] = await Promise.all([
        prisma.quote.findMany({
          where,
          skip,
          take,
          include: includeWithSchedule,
          orderBy: { createdAt: "desc" },
        }),
        prisma.quote.count({ where }),
      ]);

      return createApiResponse({
        quotes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/quotes - Create new quote
export async function POST(request: NextRequest) {
  try {
    return await withAuth(async (userId, userRole) => {
      const body = await request.json();
      const validatedData = CreateQuoteSchema.parse(body);

      // Verify product exists and is active
      const product = await prisma.insuranceProduct.findFirst({
        where: {
          id: validatedData.productId,
          isActive: true,
        },
      });

      if (!product) {
        return createApiResponse(
          null,
          "Produit d'assurance non trouvé ou inactif",
          404
        );
      }

      // Generate unique reference
      const reference = generateReference(
        product.code === "RC_DECENNALE" ? "RCD" : "RCP"
      );

      // Create quote
      const quote = await prisma.quote.create({
        data: {
          reference,
          productId: validatedData.productId,
          brokerId: userId,
          companyData: validatedData.companyData,
          formData: validatedData.formData,
          status: validatedData.status,
        },
        include: {
          product: {
            select: { name: true, code: true },
          },
          broker: {
            select: { name: true, companyName: true },
          },
        },
      });
      // Test
      return createApiResponse(
        quote,
        "Demande de devis créée avec succès",
        201
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}
