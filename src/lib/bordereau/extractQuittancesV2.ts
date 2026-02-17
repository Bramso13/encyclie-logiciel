import { PrismaClient, QuoteStatus } from "@prisma/client";
import { getTaxeByRegion } from "@/lib/tarificateurs/rcd";
import type { BordereauFiltersV2, FidelidadeQuittancesRow } from "./types";
import { getApporteur } from "./config";
import {
  formatDate,
  mapPaymentStatusToStatutQuittance,
  mapPaymentMethodToModePaiement,
} from "./utils";

const DEFAULT_STRING = "";
const GARANTIE_RC_RCD = "RC_RCD";

/** Commission = PrimeHT * 0.24 */
const TAUX_COMMISSION = 0.24;

/** SIREN = 9 premiers caractères du SIRET (formData.siret ou companyData.siret). */
function getSiren(
  formData: Record<string, unknown>,
  companyData: Record<string, unknown> | null,
): string {
  const siret =
    (formData?.siret as string) ?? (companyData?.siret as string) ?? "";
  const s =
    typeof siret === "string" ? siret.replace(/\D/g, "").slice(0, 9) : "";
  return s;
}

/**
 * Taux de taxe selon la région (formData.territory) via getTaxeByRegion.
 * Retourné multiplié par 100 (ex. 0.09 → "9").
 */
function computeTauxTaxe(formData: Record<string, unknown>): string {
  const region = formData.territory ?? formData.region;
  if (region == null || typeof region !== "string") return DEFAULT_STRING;
  const rate = getTaxeByRegion(region);
  if (rate == null) return DEFAULT_STRING;
  return String(Math.round(rate * 100 * 100) / 100);
}

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
    select: {
      periodStart: true,
      periodEnd: true,
      dueDate: true,
      amountHT: true,
      amountTTC: true,
      taxAmount: true,
      paidAt: true,
      status: true,
      installmentNumber: true,
      paymentMethod: true,
      schedule: {
        select: {
          quote: {
            select: {
              reference: true,
              formData: true,
              companyData: true,
            },
          },
        },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { method: true },
      },
    },
  });

  installments.sort((a, b) => {
    const refA = a.schedule.quote.reference ?? "";
    const refB = b.schedule.quote.reference ?? "";
    if (refA !== refB) return refA.localeCompare(refB);
    return a.installmentNumber - b.installmentNumber;
  });

  const withSiren: {
    siren: string;
    row: FidelidadeQuittancesRow;
    periodStart: Date;
    periodEnd: Date;
  }[] = [];

  for (const inst of installments) {
    const quote = inst.schedule.quote;
    const formData = (quote.formData ?? {}) as Record<string, unknown>;
    const companyData = (quote.companyData ?? null) as Record<
      string,
      unknown
    > | null;
    const siren = getSiren(formData, companyData);
    const identifiantPolice = quote.reference ?? DEFAULT_STRING;
    const identifiantQuittance = `${identifiantPolice}Q${inst.installmentNumber}-${inst.dueDate.toISOString().split("T")[0].split("-")[0]}`;
    const commission = Math.round(inst.amountHT * TAUX_COMMISSION * 100) / 100;
    const tauxTaxe = computeTauxTaxe(formData);
    const fromTransaction = inst.transactions?.[0]?.method;
    let paymentMethod:
      | import("@prisma/client").PaymentMethod
      | null
      | undefined =
      inst.paymentMethod ??
      (fromTransaction as import("@prisma/client").PaymentMethod | undefined);
    if (inst.status === "PAID" && !paymentMethod) {
      paymentMethod = "OTHER";
    }

    const row = mapInstallmentToQuittancesRow({
      inst,
      identifiantPolice,
      identifiantQuittance,
      apporteur,
      commission: String(commission),
      tauxTaxe,
      paymentMethod,
    });
    withSiren.push({
      siren,
      row,
      periodStart: inst.periodStart,
      periodEnd: inst.periodEnd,
    });
  }

  return deduplicateQuittancesBySiren(withSiren);
}

/**
 * Une ligne par SIREN : agrégation des montants (PRIME_HT, PRIME_TTC, TAXES, COMMISSIONS),
 * DATE_EFFET_QUITTANCE = min(periodStart), DATE_FIN_QUITTANCE = max(periodEnd).
 * IDENTIFIANT_POLICE / IDENTIFIANT_QUITTANCE = première occurrence du groupe.
 */
function deduplicateQuittancesBySiren(
  withSiren: {
    siren: string;
    row: FidelidadeQuittancesRow;
    periodStart: Date;
    periodEnd: Date;
  }[],
): FidelidadeQuittancesRow[] {
  const bySiren = new Map<string, typeof withSiren>();
  for (const item of withSiren) {
    const sirenKey = item.siren?.trim();
    const key = sirenKey ? sirenKey : `_${item.row.IDENTIFIANT_QUITTANCE}`;
    if (!bySiren.has(key)) bySiren.set(key, []);
    bySiren.get(key)!.push(item);
  }

  const out: FidelidadeQuittancesRow[] = [];
  for (const [, group] of bySiren) {
    const first = group[0].row;
    if (group.length === 1) {
      out.push(first);
      continue;
    }
    let primeHT = 0;
    let primeTTC = 0;
    let taxes = 0;
    let commissions = 0;
    let minStart: Date = group[0].periodStart;
    let maxEnd: Date = group[0].periodEnd;
    for (const { row, periodStart, periodEnd } of group) {
      primeHT += Number(row.PRIME_HT) || 0;
      primeTTC += Number(row.PRIME_TTC) || 0;
      taxes += Number(row.TAXES) || 0;
      commissions += Number(row.COMMISSIONS) || 0;
      if (periodStart < minStart) minStart = periodStart;
      if (periodEnd > maxEnd) maxEnd = periodEnd;
    }
    out.push({
      ...first,
      IDENTIFIANT_QUITTANCE: `${first.IDENTIFIANT_POLICE}QT`,
      DATE_EFFET_QUITTANCE: formatDate(minStart),
      DATE_FIN_QUITTANCE: formatDate(maxEnd),
      PRIME_HT: String(Math.round(primeHT * 100) / 100),
      PRIME_TTC: String(Math.round(primeTTC * 100) / 100),
      TAXES: String(Math.round(taxes * 100) / 100),
      COMMISSIONS: String(Math.round(commissions * 100) / 100),
    });
  }

  out.sort((a, b) =>
    (a.IDENTIFIANT_POLICE || "").localeCompare(b.IDENTIFIANT_POLICE || ""),
  );
  return out;
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
    dueDate: Date;
  };
  identifiantPolice: string;
  identifiantQuittance: string;
  apporteur: string;
  commission: string;
  tauxTaxe: string;
  paymentMethod: import("@prisma/client").PaymentMethod | null | undefined;
}): FidelidadeQuittancesRow {
  const {
    inst,
    identifiantPolice,
    identifiantQuittance,
    apporteur,
    commission,
    tauxTaxe,
    paymentMethod,
  } = params;

  const dateEffet = formatDate(inst.periodStart);
  const dateFin = formatDate(inst.periodEnd);
  const dateEncaissement = inst.paidAt
    ? formatDate(inst.paidAt)
    : DEFAULT_STRING;

  let modePaiement = mapPaymentMethodToModePaiement(paymentMethod);
  if (inst.status === "PAID" && (!modePaiement || modePaiement.length < 2)) {
    modePaiement = "VIREMENT";
  }

  return {
    APPORTEUR: apporteur,
    IDENTIFIANT_POLICE: identifiantPolice,
    NUMERO_AVENANT: DEFAULT_STRING,
    IDENTIFIANT_QUITTANCE: identifiantQuittance,
    DATE_EFFET_QUITTANCE: dateEffet,
    DATE_FIN_QUITTANCE: dateFin,
    DATE_ENCAISSEMENT: dateEncaissement,
    STATUT_QUITTANCE: mapPaymentStatusToStatutQuittance(inst.status),
    GARANTIE: GARANTIE_RC_RCD,
    PRIME_TTC: String(inst.amountTTC),
    PRIME_HT: String(inst.amountHT),
    TAXES: String(inst.taxAmount),
    TAUX_TAXE: tauxTaxe,
    COMMISSIONS: commission,
    MODE_PAIEMENT: modePaiement,
  };
}
