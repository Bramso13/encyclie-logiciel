import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getBordereauData } from "@/lib/bordereau";
import type { BordereauFilters } from "@/lib/bordereau";

const prisma = new PrismaClient();

/**
 * POST /api/admin/bordereaux/preview
 *
 * Preview bordereau data based on filters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract and validate filters
    const { dateRange, brokerIds, contractStatus, productType, includeQuotes } =
      body;

    if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Date range is required (startDate and endDate)",
        },
        { status: 400 },
      );
    }

    // Build filters (includeQuotes defaults to true)
    const filters: BordereauFilters = {
      dateRange: {
        startDate: new Date(dateRange.startDate),
        endDate: new Date(dateRange.endDate),
      },
      ...(brokerIds && brokerIds.length > 0 ? { brokerIds } : {}),
      ...(contractStatus && contractStatus.length > 0
        ? { contractStatus }
        : {}),
      ...(productType ? { productType } : {}),
      includeQuotes: includeQuotes !== false,
    };

    // Get bordereau data
    const result = await getBordereauData(filters, prisma);

    return NextResponse.json({
      success: true,
      data: result.rows,
      sourceDataPerRow: result.sourceDataPerRow,
      metadata: {
        totalContracts: result.metadata.totalContracts,
        totalQuotes: result.metadata.totalQuotes,
        totalRows: result.rows.length,
        dateRange: result.metadata.dateRange,
        generatedAt: result.metadata.generatedAt,
      },
    });
  } catch (error) {
    console.error("Error in bordereau preview:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate bordereau preview",
      },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
