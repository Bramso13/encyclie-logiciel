import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import archiver from "archiver";
import { withAuthAndRole } from "@/lib/api-utils";
import {
  getPolicesV2,
  getQuittancesV2,
  generatePolicesCSV,
  generateQuittancesCSV,
  getPolicesFileName,
  getQuittancesFileName,
  getBordereauZipFileName,
} from "@/lib/bordereau";
import type { BordereauInclusionOptions } from "@/lib/bordereau";

const prisma = new PrismaClient();

/**
 * POST /api/admin/bordereaux/export-v2
 *
 * Génère les deux CSV (polices + quittances) pour la période et les retourne en ZIP.
 * Nécessite le rôle ADMIN.
 */
export async function POST(request: NextRequest) {
  return withAuthAndRole(["ADMIN"], async (userId) => {
    try {
      const body = await request.json();
      const {
        dateRange,
        polices: policesOverride,
        quittances: quittancesOverride,
        inclusionOptions,
      } = body as {
        dateRange?: { startDate: string; endDate: string };
        polices?: import("@/lib/bordereau").FidelidadePolicesRow[];
        quittances?: import("@/lib/bordereau").FidelidadeQuittancesRow[];
        inclusionOptions?: BordereauInclusionOptions;
      };

      if (!dateRange?.startDate || !dateRange?.endDate) {
        return NextResponse.json(
          {
            success: false,
            error: "dateRange.startDate et dateRange.endDate requis",
          },
          { status: 400 },
        );
      }

      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const month = endDate.getMonth() + 1;
      const year = endDate.getFullYear();

      let policesRows = policesOverride;
      let quittancesRows = quittancesOverride;

      if (!policesRows || !quittancesRows) {
        const filters = { dateRange: { startDate, endDate } };
        const [p, q] = await Promise.all([
          getPolicesV2(filters, prisma, inclusionOptions),
          getQuittancesV2(filters, prisma, inclusionOptions),
        ]);
        policesRows = policesRows ?? p;
        quittancesRows = quittancesRows ?? q;
      }

      const policesCSV = generatePolicesCSV(policesRows);
      const quittancesCSV = generateQuittancesCSV(quittancesRows);

      const policesFileName = getPolicesFileName(month, year);
      const quittancesFileName = getQuittancesFileName(month, year);
      const zipFileName = getBordereauZipFileName(month, year);

      const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
        const archive = archiver("zip", { zlib: { level: 9 } });
        const chunks: Buffer[] = [];
        archive.on("data", (chunk: Buffer) => chunks.push(chunk));
        archive.on("end", () => resolve(Buffer.concat(chunks)));
        archive.on("error", reject);

        archive.append(policesCSV, { name: policesFileName });
        archive.append(quittancesCSV, { name: quittancesFileName });
        void archive.finalize();
      });

      await prisma.bordereau.create({
        data: {
          generatedById: userId,
          periodStart: startDate,
          periodEnd: endDate,
          filterCriteria: {
            dateRange: {
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
            },
            inclusionOptions: (inclusionOptions ?? {
              requireEmission: true,
              requirePrevPaid: true,
            }) as Record<string, boolean>,
          },
          csvDataPolices: policesRows as unknown as object,
          csvDataQuittances: quittancesRows as unknown as object,
          fileNamePolices: policesFileName,
          fileNameQuittances: quittancesFileName,
        },
      });

      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${zipFileName}"`,
          "Content-Length": String(zipBuffer.length),
        },
      });
    } catch (error) {
      console.error("Error in bordereau export-v2:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Échec de l'export bordereau",
        },
        { status: 500 },
      );
    } finally {
      await prisma.$disconnect();
    }
  });
}
