import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { withAuthAndRole } from "@/lib/api-utils";

const prisma = new PrismaClient();

const DEFAULT_LIMIT = 20;

/**
 * GET /api/admin/bordereaux/history
 *
 * Liste des bordereaux générés avec pagination.
 * Query: page (défaut 1), limit (défaut 20, max 100).
 */
export async function GET(request: NextRequest) {
  return withAuthAndRole(["ADMIN"], async () => {
    try {
      const { searchParams } = new URL(request.url);
      const limitParam = searchParams.get("limit");
      const limit = limitParam
        ? Math.min(parseInt(limitParam, 10) || DEFAULT_LIMIT, 100)
        : DEFAULT_LIMIT;
      const page = parseInt(searchParams.get("page") || "1", 10);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        prisma.bordereau.findMany({
          skip,
          take: limit,
          orderBy: { generatedAt: "desc" },
          include: {
            generatedBy: {
              select: { id: true, name: true },
            },
          },
        }),
        prisma.bordereau.count(),
      ]);

      const list = items.map((b) => {
        const csvPolices = b.csvDataPolices as unknown;
        const csvQuittances = b.csvDataQuittances as unknown;
        return {
          id: b.id,
          generatedAt: b.generatedAt.toISOString(),
          generatedBy: b.generatedBy?.name ?? "—",
          periodStart: b.periodStart.toISOString().slice(0, 10),
          periodEnd: b.periodEnd.toISOString().slice(0, 10),
          countPolices: Array.isArray(csvPolices) ? csvPolices.length : 0,
          countQuittances: Array.isArray(csvQuittances)
            ? csvQuittances.length
            : 0,
          fileNamePolices: b.fileNamePolices,
          fileNameQuittances: b.fileNameQuittances,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          items: list,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error in bordereaux history:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Erreur liste historique",
        },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  });
}
