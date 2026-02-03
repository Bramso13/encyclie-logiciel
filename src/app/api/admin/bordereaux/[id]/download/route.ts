import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import archiver from "archiver";
import { withAuthAndRole } from "@/lib/api-utils";
import {
  generatePolicesCSV,
  generateQuittancesCSV,
  getBordereauZipFileName,
} from "@/lib/bordereau";
import type {
  FidelidadePolicesRow,
  FidelidadeQuittancesRow,
} from "@/lib/bordereau";

const prisma = new PrismaClient();

/**
 * GET /api/admin/bordereaux/[id]/download
 *
 * Re-génère le ZIP (polices + quittances) à partir des données sauvegardées du bordereau.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuthAndRole(["ADMIN"], async () => {
    try {
      const { id } = await params;
      const bordereau = await prisma.bordereau.findUnique({
        where: { id },
      });

      if (!bordereau) {
        return NextResponse.json(
          { success: false, error: "Bordereau introuvable" },
          { status: 404 }
        );
      }

      const policesRows =
        bordereau.csvDataPolices as unknown as FidelidadePolicesRow[];
      const quittancesRows =
        bordereau.csvDataQuittances as unknown as FidelidadeQuittancesRow[];

      const policesCSV = generatePolicesCSV(
        Array.isArray(policesRows) ? policesRows : []
      );
      const quittancesCSV = generateQuittancesCSV(
        Array.isArray(quittancesRows) ? quittancesRows : []
      );

      const month = bordereau.periodEnd.getMonth() + 1;
      const year = bordereau.periodEnd.getFullYear();
      const zipFileName = getBordereauZipFileName(month, year);

      const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
        const archive = archiver("zip", { zlib: { level: 9 } });
        const chunks: Buffer[] = [];
        archive.on("data", (chunk: Buffer) => chunks.push(chunk));
        archive.on("end", () => resolve(Buffer.concat(chunks)));
        archive.on("error", reject);

        archive.append(policesCSV, { name: bordereau.fileNamePolices });
        archive.append(quittancesCSV, { name: bordereau.fileNameQuittances });
        void archive.finalize();
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
      console.error("Error in bordereau download:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Erreur téléchargement",
        },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  });
}
