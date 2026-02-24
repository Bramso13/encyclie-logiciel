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

/**
 * Lettre pour IDENTIFIANT_QUITTANCE selon fractionnement :
 * trimestriel → Q, mensuel → M, semestriel → S, annuel → rien.
 */
function getQuittanceLetter(formData: Record<string, unknown>): string {
  const raw =
    formData.periodicity ??
    formData.periodicite ??
    formData.fractionnementPrime;
  const s = raw != null ? String(raw).toLowerCase().trim() : "";
  if (s.includes("trimestre") || s === "trimestriel") return "Q";
  if (s.includes("mensuel") || s === "mensuel") return "M";
  if (s.includes("semestre") || s === "semestriel") return "S";
  return "";
}

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
  options?: import("./extractPolicesV2").BordereauInclusionOptions,
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
      scheduleId: true,
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
          // resiliationDate sera disponible après migration + prisma generate
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
    } as any,
  });

  // Filtrer les échéances strictement post-résiliation.
  const filteredByResiliation = (installments as any[]).filter((inst) => {
    const resiliationDate: Date | null = inst.schedule?.resiliationDate ?? null;
    if (!resiliationDate) return true;
    const endOfResiliationMonth = new Date(
      resiliationDate.getFullYear(),
      resiliationDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    return inst.periodStart <= endOfResiliationMonth;
  });

  // ── Filtre d'inclusion bordereau (contrôlé par options) ──────────────────────
  const doRequireEmission = options?.requireEmission !== false;
  const doRequirePrevPaid = options?.requirePrevPaid !== false;

  const withEmission = doRequireEmission
    ? filteredByResiliation.filter((i: any) => !!i.emissionDate)
    : filteredByResiliation;

  const prevPaidMapQ = new Map<string, boolean>();
  if (doRequirePrevPaid) {
    const toCheckPrev = withEmission
      .filter((i: any) => i.installmentNumber > 1)
      .map((i: any) => ({ scheduleId: i.scheduleId, prevNum: i.installmentNumber - 1 }));

    if (toCheckPrev.length > 0) {
      const scheduleToNums = new Map<string, Set<number>>();
      for (const p of toCheckPrev) {
        if (!scheduleToNums.has(p.scheduleId))
          scheduleToNums.set(p.scheduleId, new Set());
        scheduleToNums.get(p.scheduleId)!.add(p.prevNum);
      }
      const prevInsts = await prisma.paymentInstallment.findMany({
        where: {
          OR: [...scheduleToNums.entries()].map(([scheduleId, nums]) => ({
            scheduleId,
            installmentNumber: { in: [...nums] },
          })),
        },
        select: { scheduleId: true, installmentNumber: true, status: true, paidAt: true },
      });
      for (const prev of prevInsts) {
        const key = `${prev.scheduleId}-${prev.installmentNumber}`;
        prevPaidMapQ.set(key, prev.status === "PAID" || prev.paidAt !== null);
      }
    }
  }

  const filteredInstallments = withEmission.filter((inst: any) => {
    if (!doRequirePrevPaid) return true;
    if (inst.installmentNumber === 1) return true;
    const key = `${inst.scheduleId}-${inst.installmentNumber - 1}`;
    return prevPaidMapQ.get(key) === true;
  });

  filteredInstallments.sort((a: any, b: any) => {
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

  for (const inst of filteredInstallments as any[]) {
    const quote = inst.schedule.quote;
    const formData = (quote.formData ?? {}) as Record<string, unknown>;
    const companyData = (quote.companyData ?? null) as Record<
      string,
      unknown
    > | null;
    const siren = getSiren(formData, companyData);
    const identifiantPolice = quote.reference ?? DEFAULT_STRING;
    const letter = getQuittanceLetter(formData);
    const year = inst.dueDate.toISOString().split("T")[0].split("-")[0];
    const identifiantQuittance = letter
      ? `${identifiantPolice}${letter}${inst.installmentNumber}-${year}`
      : `${identifiantPolice}${inst.installmentNumber}-${year}`;
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

/** Une ligne par SIREN : garde uniquement la première occurrence, sans regrouper. */
function deduplicateQuittancesBySiren(
  withSiren: {
    siren: string;
    row: FidelidadeQuittancesRow;
    periodStart: Date;
    periodEnd: Date;
  }[],
): FidelidadeQuittancesRow[] {
  const seenSiren = new Set<string>();
  const out: FidelidadeQuittancesRow[] = [];

  for (const item of withSiren) {
    const sirenKey = item.siren?.trim();
    const key = sirenKey ? sirenKey : `_${item.row.IDENTIFIANT_QUITTANCE}`;
    if (seenSiren.has(key)) continue;
    seenSiren.add(key);
    out.push(item.row);
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
    TAXE_POURCENTAGE: tauxTaxe,
    COMMISSIONS: commission,
    MODE_PAIEMENT: modePaiement,
  };
}
