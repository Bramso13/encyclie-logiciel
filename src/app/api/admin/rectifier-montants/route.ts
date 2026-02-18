import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { withAuthAndRole } from "@/lib/api-utils";

const prisma = new PrismaClient();

/**
 * POST /api/admin/rectifier-montants
 *
 * Pour toutes les échéances (PaymentInstallment) où amountTTC < amountHT,
 * inverse amountHT et amountTTC (sans exception).
 * Nécessite le rôle ADMIN.
 */
export async function POST() {
  return withAuthAndRole(["ADMIN"], async () => {
    try {
      // Prisma ne permet pas where amountTTC < amountHT (deux colonnes), on charge tout puis filtre.
      const all = await prisma.paymentInstallment.findMany({
        select: { id: true, amountHT: true, amountTTC: true },
      });
      const toSwap = all.filter((row) => row.amountTTC < row.amountHT);

      let updated = 0;
      for (const row of toSwap) {
        await prisma.paymentInstallment.update({
          where: { id: row.id },
          data: {
            amountHT: row.amountTTC,
            amountTTC: row.amountHT,
          },
        });
        updated += 1;
      }

      return NextResponse.json({
        success: true,
        updated,
        total: toSwap.length,
        message: `${updated} échéance(s) rectifiée(s) (amountHT/amountTTC inversés).`,
      });
    } catch (e) {
      console.error("rectifier-montants:", e);
      return NextResponse.json(
        { success: false, error: e instanceof Error ? e.message : "Erreur serveur" },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  });
}
