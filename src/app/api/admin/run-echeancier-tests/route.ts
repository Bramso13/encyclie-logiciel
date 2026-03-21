import { NextResponse } from "next/server";
import { runEcheancierUnitTests } from "@/lib/tarificateurs/runEcheancierTests";
import { withAuthAndRole } from "@/lib/api-utils";

/**
 * GET /api/admin/run-echeancier-tests
 * Exécute les tests unitaires de genererEcheancier et retourne les résultats.
 */
export async function GET() {
  try {
    return await withAuthAndRole(["ADMIN"], async () => {
      const results = runEcheancierUnitTests();
      const passed = results.filter((r) => r.ok).length;
      const total = results.length;
      return NextResponse.json({
        success: true,
        data: {
          results,
          summary: { passed, total, allPassed: passed === total },
        },
      });
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
