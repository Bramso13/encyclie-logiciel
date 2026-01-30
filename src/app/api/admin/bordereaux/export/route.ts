import { NextRequest, NextResponse } from "next/server";
import { generateCSV, generateFileName } from "@/lib/bordereau";
import type { FidelidadeRow } from "@/lib/bordereau";

/**
 * POST /api/admin/bordereaux/export
 *
 * Generate and download CSV file from bordereau data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract the rows data (potentially edited by the user)
    const { rows, fileName } = body as {
      rows: FidelidadeRow[];
      fileName?: string;
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No data provided for CSV generation",
        },
        { status: 400 }
      );
    }

    // Generate CSV content
    const csvContent = generateCSV(rows);

    // Generate file name
    const csvFileName = fileName || generateFileName();

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=utf-8;",
        "Content-Disposition": `attachment; filename="${csvFileName}"`,
      },
    });
  } catch (error) {
    console.error("Error in bordereau export:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate CSV export",
      },
      { status: 500 }
    );
  }
}
