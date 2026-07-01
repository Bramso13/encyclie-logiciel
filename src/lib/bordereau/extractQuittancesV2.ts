import { PrismaClient } from "@prisma/client";
import { getTaxeByRegion } from "@/lib/tarificateurs/rcd";
import type { BordereauFiltersV2, FidelidadeQuittancesRow } from "./types";
import { getApporteur } from "./config";
import {
  getBordereauMonthEvents,
  type BordereauMonthEventType,
} from "./bordereauMonthEventsV2";
import {
  formatDate,
  mapPaymentMethodToModePaiement,
} from "./utils";
import { computeBordereauQuittanceAmounts } from "./quittanceAmountsV2";
import type { BordereauInclusionOptions } from "./extractPolicesV2";

const DEFAULT_STRING = "";
const GARANTIE_RC_RCD = "RC_RCD";
const TAUX_COMMISSION = 0.24;

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

function computeTauxTaxe(formData: Record<string, unknown>): string {
  const region = formData.territory ?? formData.region;
  if (region == null || typeof region !== "string") return DEFAULT_STRING;
  const rate = getTaxeByRegion(region);
  if (rate == null) return DEFAULT_STRING;
  return String(Math.round(rate * 100 * 100) / 100);
}

export async function getQuittancesV2(
  filters: BordereauFiltersV2,
  prisma: PrismaClient,
  options?: BordereauInclusionOptions,
): Promise<FidelidadeQuittancesRow[]> {
  const apporteur = getApporteur();
  const events = await getBordereauMonthEvents(prisma, filters);
  const deductAnnualSupplements = options?.deductPremierEcheanceSupplements === true;

  return events.map(({ installment: inst, eventType, eventDate }) => {
    const quote = inst.schedule.quote;
    const formData = (quote.formData ?? {}) as Record<string, unknown>;
    const identifiantPolice = quote.reference ?? DEFAULT_STRING;
    const letter = getQuittanceLetter(formData);
    const year = inst.dueDate.toISOString().split("T")[0].split("-")[0];
    const baseId = letter
      ? `${identifiantPolice}${letter}${inst.installmentNumber}-${year}`
      : `${identifiantPolice}${inst.installmentNumber}-${year}`;
    const quittanceSuffix =
      eventType === "EMISSION"
        ? "EM"
        : eventType === "REGLEMENT"
          ? "RG"
          : "RL";
    const identifiantQuittance = `${baseId}-${quittanceSuffix}`;

    const modifieAlaMain = quote.modifieAlaMain === true;
    const region = formData.territory ?? formData.region;
    const tauxTaxeDecimal =
      region != null && typeof region === "string"
        ? getTaxeByRegion(region)
        : null;
    const schedulePayments =
      inst.schedule?.payments?.map(
        (p: { installmentNumber: number; periodStart: Date }) => ({
          installmentNumber: p.installmentNumber,
          periodStart: p.periodStart,
        }),
      ) ?? [];
    const scheduleInstallments =
      inst.schedule?.payments?.map(
        (p: {
          installmentNumber: number;
          periodStart: Date;
          periodEnd: Date;
          amountHT: number;
          amountTTC: number;
          taxAmount: number;
          rcdAmount: number | null;
          pjAmount: number | null;
          feesAmount: number | null;
          resumeAmount: number | null;
        }) => ({
          installmentNumber: p.installmentNumber,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          amountHT: p.amountHT,
          amountTTC: p.amountTTC,
          taxAmount: p.taxAmount,
          rcdAmount: p.rcdAmount,
          pjAmount: p.pjAmount,
          feesAmount: p.feesAmount,
          resumeAmount: p.resumeAmount,
        }),
      ) ?? [];

    const calculatedPremium = (quote.calculatedPremium ?? {}) as {
      fraisGestion?: number;
    };
    const fraisGestionGlobal = calculatedPremium.fraisGestion ?? null;

    const { primeHT, primeTTC, taxAmount } = computeBordereauQuittanceAmounts({
      inst: {
        installmentNumber: inst.installmentNumber,
        periodStart: inst.periodStart,
        periodEnd: inst.periodEnd,
        amountHT: inst.amountHT,
        amountTTC: inst.amountTTC,
        taxAmount: inst.taxAmount,
        rcdAmount: inst.rcdAmount,
        pjAmount: inst.pjAmount,
        feesAmount: inst.feesAmount,
        resumeAmount: inst.resumeAmount,
      },
      modifieAlaMain,
      deductAnnualSupplements,
      schedulePayments,
      scheduleInstallments,
      tauxTaxeDecimal,
      fraisGestionGlobal,
      formData,
    });

    const commission = Math.round(primeHT * TAUX_COMMISSION * 100) / 100;
    const tauxTaxe = computeTauxTaxe(formData);
    const fromTransaction = inst.transactions?.[0]?.method;
    let paymentMethod:
      | import("@prisma/client").PaymentMethod
      | null
      | undefined =
      inst.paymentMethod ??
      (fromTransaction as import("@prisma/client").PaymentMethod | undefined);
    if (eventType === "REGLEMENT" && !paymentMethod) {
      paymentMethod = "OTHER";
    }

    const dateEmissionSource =
      eventType === "EMISSION"
        ? eventDate
        : (inst.emissionDate ?? quote.acceptedAt ?? null);

    return mapInstallmentToQuittancesRow({
      inst: {
        periodStart: inst.periodStart,
        periodEnd: inst.periodEnd,
        amountTTC: primeTTC,
        amountHT: primeHT,
        taxAmount,
        paidAt: inst.paidAt,
        status: inst.status,
        dueDate: inst.dueDate,
      },
      eventType,
      eventDate,
      dateEmissionQuittance: dateEmissionSource,
      identifiantPolice,
      identifiantQuittance,
      apporteur,
      commission: String(commission),
      tauxTaxe,
      paymentMethod,
    });
  });
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
  eventType: BordereauMonthEventType;
  eventDate: Date;
  dateEmissionQuittance: Date | null;
  identifiantPolice: string;
  identifiantQuittance: string;
  apporteur: string;
  commission: string;
  tauxTaxe: string;
  paymentMethod: import("@prisma/client").PaymentMethod | null | undefined;
}): FidelidadeQuittancesRow {
  const {
    inst,
    eventType,
    eventDate,
    dateEmissionQuittance,
    identifiantPolice,
    identifiantQuittance,
    apporteur,
    commission,
    tauxTaxe,
    paymentMethod,
  } = params;

  const dateEffet = formatDate(inst.periodStart);
  const dateFin = formatDate(inst.periodEnd);
  const dateEmission = dateEmissionQuittance
    ? formatDate(dateEmissionQuittance)
    : DEFAULT_STRING;
  const dateEncaissement =
    eventType === "REGLEMENT" ? formatDate(eventDate) : DEFAULT_STRING;

  const statutQuittance =
    eventType === "REGLEMENT" ? "ENCAISSE" : "EMISE";

  let modePaiement = DEFAULT_STRING;
  if (eventType === "REGLEMENT") {
    modePaiement = mapPaymentMethodToModePaiement(paymentMethod);
    if (!modePaiement || modePaiement.length < 2) {
      modePaiement = "VIREMENT";
    }
  }

  return {
    APPORTEUR: apporteur,
    IDENTIFIANT_POLICE: identifiantPolice,
    NUMERO_AVENANT: DEFAULT_STRING,
    IDENTIFIANT_QUITTANCE: identifiantQuittance,
    DATE_EFFET_QUITTANCE: dateEffet,
    DATE_FIN_QUITTANCE: dateFin,
    DATE_EMISSION_QUITTANCE: dateEmission,
    DATE_ENCAISSEMENT: dateEncaissement,
    STATUT_QUITTANCE: statutQuittance,
    GARANTIE: GARANTIE_RC_RCD,
    PRIME_TTC: String(inst.amountTTC),
    PRIME_HT: String(inst.amountHT),
    TAXES: String(inst.taxAmount),
    TAXE_POURCENTAGE: tauxTaxe,
    COMMISSIONS: commission,
    MODE_PAIEMENT: modePaiement,
  };
}
