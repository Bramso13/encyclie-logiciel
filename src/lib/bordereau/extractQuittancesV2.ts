import { PrismaClient, QuoteStatus } from "@prisma/client";
import type { BordereauFiltersV2, FidelidadeQuittancesRow } from "./types";
import { getApporteur } from "./config";
import {
  formatDate,
  mapPaymentStatusToStatutQuittance,
  mapPaymentMethodToModePaiement,
} from "./utils";

const DEFAULT_STRING = "";
const GARANTIE_RC_RCD = "RC_RCD";

/**
 * Taux de commission par défaut (10%) — aligné BrokerCommissionsTab.
 * Source : calcul (totalHT - fraisGestion - pj - reprise) * 0.1.
 * Sur PaymentInstallment on n'a pas le détail ; on utilise amountHT * 0.1.
 * Dev Notes: si calculatedPremium disponible, on pourrait matcher par installmentNumber.
 */
const TAUX_COMMISSION_DEFAUT = 10;

/**
 * Règle périmètre : PaymentInstallment dont dueDate OU (periodStart/periodEnd)
 * chevauche la période filtre. Quote ACCEPTED uniquement (aligné Feuille 1).
 */
export async function getQuittancesV2(
  filters: BordereauFiltersV2,
  prisma: PrismaClient,
): Promise<FidelidadeQuittancesRow[]> {
  const { dateRange } = filters;
  const apporteur = getApporteur();

  const installments = await prisma.paymentInstallment.findMany({
    where: {
      schedule: {
        quote: { status: QuoteStatus.ACCEPTED },
      },
      OR: [
        {
          dueDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
        },
        {
          AND: [
            { periodStart: { lte: dateRange.endDate } },
            { periodEnd: { gte: dateRange.startDate } },
          ],
        },
      ],
    },
    include: {
      schedule: {
        include: {
          quote: {
            select: {
              reference: true,
              calculatedPremium: true,
            },
          },
        },
      },
    },
  });

  // Trier par reference quote puis numéro d'échéance
  installments.sort((a, b) => {
    const refA = a.schedule.quote.reference ?? "";
    const refB = b.schedule.quote.reference ?? "";
    if (refA !== refB) return refA.localeCompare(refB);
    return a.installmentNumber - b.installmentNumber;
  });

  const rows: FidelidadeQuittancesRow[] = [];

  for (const inst of installments) {
    const quote = inst.schedule.quote;
    const identifiantPolice = quote.reference ?? DEFAULT_STRING;
    const identifiantQuittance = `${identifiantPolice}Q${inst.installmentNumber}`;

    const commissions = computeCommissions(inst, quote.calculatedPremium);

    rows.push(
      mapInstallmentToQuittancesRow({
        inst,
        identifiantPolice,
        identifiantQuittance,
        apporteur,
        commissions,
      }),
    );
  }

  return rows;
}

function computeCommissions(
  inst: {
    installmentNumber: number;
    amountHT: number;
  },
  calculatedPremium: unknown,
): { taux: string; montant: string } {
  // Essayer calculatedPremium.echeancier.echeances[installmentNumber-1]
  const calc = calculatedPremium as Record<string, unknown> | null;
  const echeances = calc?.echeancier as { echeances?: Array<{ totalHT?: number; fraisGestion?: number; pj?: number; reprise?: number }> } | undefined;
  const echeance = echeances?.echeances?.[inst.installmentNumber - 1];

  if (echeance && typeof echeance.totalHT === "number") {
    const base =
      echeance.totalHT -
      (echeance.fraisGestion ?? 0) -
      (echeance.pj ?? 0) -
      (echeance.reprise ?? 0);
    const montant = Math.round(base * 0.1 * 100) / 100;
    return { taux: String(TAUX_COMMISSION_DEFAUT), montant: String(montant) };
  }

  // Fallback : 10% de amountHT
  const montant = Math.round(inst.amountHT * 0.1 * 100) / 100;
  return { taux: String(TAUX_COMMISSION_DEFAUT), montant: String(montant) };
}

function mapInstallmentToQuittancesRow(params: {
  inst: {
    periodStart: Date;
    periodEnd: Date;
    amountTTC: number;
    amountHT: number;
    taxAmount: number;
    paidAt: Date | null;
    status: import("@prisma/client").PaymentScheduleStatus;
    paymentMethod: import("@prisma/client").PaymentMethod | null;
    createdAt: Date;
    dueDate: Date;
  };
  identifiantPolice: string;
  identifiantQuittance: string;
  apporteur: string;
  commissions: { taux: string; montant: string };
}): FidelidadeQuittancesRow {
  const { inst, identifiantPolice, identifiantQuittance, apporteur, commissions } =
    params;

  const dateEffet = formatDate(inst.periodStart);
  const dateFin = formatDate(inst.periodEnd);
  const dateEncaissement = inst.paidAt
    ? formatDate(inst.paidAt)
    : DEFAULT_STRING;
  const dateEmission = inst.paidAt
    ? formatDate(inst.paidAt)
    : formatDate(inst.dueDate);

  return {
    APPORTEUR: apporteur,
    IDENTIFIANT_POLICE: identifiantPolice,
    NUMERO_AVENANT: DEFAULT_STRING,
    IDENTIFIANT_QUITTANCE: identifiantQuittance,
    DATE_EMISSION_QUITTANCE: dateEmission,
    DATE_EFFET_QUITTANCE: dateEffet,
    DATE_FIN_QUITTANCE: dateFin,
    DATE_ENCAISSEMENT: dateEncaissement,
    STATUT_QUITTANCE: mapPaymentStatusToStatutQuittance(inst.status),
    GARANTIE: GARANTIE_RC_RCD,
    PRIME_TTC: String(inst.amountTTC),
    PRIME_HT: String(inst.amountHT),
    TAXES: String(inst.taxAmount),
    TAUX_COMMISSIONS: commissions.taux,
    COMMISSIONS: commissions.montant,
    MODE_PAIEMENT: mapPaymentMethodToModePaiement(inst.paymentMethod),
  };
}
