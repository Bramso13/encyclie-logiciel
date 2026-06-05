import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuthAndRole,
  ApiError,
} from "@/lib/api-utils";
import { importCSV } from "@/lib/payment-csv-import";

/**
 * POST /api/admin/import-payments
 * Importe des paiements depuis un fichier CSV
 *
 * Body: multipart/form-data avec:
 *   - file: le fichier CSV
 *   - dryRun: "true" ou "false" (optionnel, default false)
 */
export async function POST(request: NextRequest) {
  try {
    return await withAuthAndRole(["ADMIN"], async (userId, _userRole) => {
      // Récupérer le fichier CSV
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const dryRun = formData.get("dryRun") === "true";

      if (!file) {
        throw new ApiError(400, "Fichier CSV requis");
      }

      // Vérifier le type de fichier
      if (!file.name.toLowerCase().endsWith(".csv")) {
        throw new ApiError(
          400,
          "Le fichier doit être au format CSV (.csv)"
        );
      }

      // Lire le contenu du fichier
      const content = await file.text();
      if (!content.trim()) {
        throw new ApiError(400, "Le fichier CSV est vide");
      }

      // Importer les paiements
      const { results, stats } = await importCSV(
        prisma,
        content,
        userId,
        dryRun
      );

      return createApiResponse(
        {
          fileName: file.name,
          dryRun,
          stats,
          results,
        },
        dryRun
          ? "Simulation terminée - Aucune modification appliquée"
          : `${stats.imported + stats.created} paiements importés avec succès`
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}
