import { PrismaClient, QuoteStatus } from "@prisma/client";
import type { PaymentScheduleStatus } from "@prisma/client";
import { tableauTax } from "@/lib/tarificateurs/rcd";
import type { BordereauFiltersV2, FidelidadePolicesRow } from "./types";
import { getApporteur } from "./config";
import {
  getBordereauMonthEvents,
  type BordereauMonthEventType,
} from "./bordereauMonthEventsV2";
import { formatDate } from "./utils";

const DEFAULT_STRING = "";

/** Map code activité (1–20) → libellé (title) depuis le tableau RCD */
const activiteCodeToTitle = new Map(tableauTax.map((t) => [t.code, t.title]));
function getActiviteTitleByCode(code: string | number): string {
  const n = typeof code === "string" ? parseInt(code, 10) : code;
  if (Number.isNaN(n)) return String(code);
  return activiteCodeToTitle.get(n) ?? String(code);
}

/**
 * Options historiques (UI admin) — ignorées : périmètre = événements du mois uniquement.
 */
export interface BordereauInclusionOptions {
  requireEmission?: boolean;
  requirePrevPaid?: boolean;
  /** Quittances : exclure PJ, reprise et frais de gestion des 1res échéances annuelles. */
  deductPremierEcheanceSupplements?: boolean;
}

export async function getPolicesV2(
  filters: BordereauFiltersV2,
  prisma: PrismaClient,
  _options?: BordereauInclusionOptions,
): Promise<FidelidadePolicesRow[]> {
  const apporteur = getApporteur();
  const events = await getBordereauMonthEvents(prisma, filters);
  const etatPoliceByQuote = buildEtatPoliceByQuote(events);

  const rows = events.map(({ installment: inst, eventType, eventDate }) => {
    const quote = inst.schedule.quote;
    const contract = quote.contract;
    const companyData = (quote.companyData ?? {}) as Record<string, unknown>;
    const formData = (quote.formData ?? {}) as Record<string, unknown>;
    const quoteRef = quote.reference ?? DEFAULT_STRING;

    return mapInstallmentToPolicesRow({
      inst: {
        periodStart: inst.periodStart,
        periodEnd: inst.periodEnd,
        dueDate: inst.dueDate,
        status: inst.status,
        paidAt: inst.paidAt,
        emissionDate: inst.emissionDate ?? null,
        installmentNumber: inst.installmentNumber,
      },
      eventType,
      eventDate,
      etatPolice: etatPoliceByQuote.get(quoteRef) ?? "EN COURS",
      quote,
      contract,
      companyData,
      formData,
      apporteur,
    });
  });

  return rows;
}

/**
 * Un seul ETAT_POLICE par devis (IDENTIFIANT_POLICE) sur tout le bordereau du mois.
 */
function buildEtatPoliceByQuote(
  events: Awaited<ReturnType<typeof getBordereauMonthEvents>>,
): Map<string, string> {
  const byQuote = new Map<
    string,
    { resiliationDate: Date | null; maxInstallmentNumber: number }
  >();

  for (const { installment: inst } of events) {
    const quoteRef = inst.schedule?.quote?.reference ?? DEFAULT_STRING;
    const resiliationDate: Date | null = inst.schedule?.resiliationDate ?? null;
    const prev = byQuote.get(quoteRef);
    if (!prev) {
      byQuote.set(quoteRef, {
        resiliationDate,
        maxInstallmentNumber: inst.installmentNumber,
      });
    } else {
      prev.maxInstallmentNumber = Math.max(
        prev.maxInstallmentNumber,
        inst.installmentNumber,
      );
      if (resiliationDate) prev.resiliationDate = resiliationDate;
    }
  }

  const etatByQuote = new Map<string, string>();
  for (const [quoteRef, meta] of byQuote) {
    if (meta.resiliationDate) {
      etatByQuote.set(quoteRef, "RESILIE");
    } else if (meta.maxInstallmentNumber === 1) {
      etatByQuote.set(quoteRef, "SOUSCRIPTION");
    } else {
      etatByQuote.set(quoteRef, "EN COURS");
    }
  }
  return etatByQuote;
}

function mapInstallmentToPolicesRow(params: {
  inst: {
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
    status: PaymentScheduleStatus;
    paidAt: Date | null;
    emissionDate: Date | null;
    installmentNumber: number;
  };
  eventType: BordereauMonthEventType;
  eventDate: Date;
  /** État unique pour toutes les lignes du même devis */
  etatPolice: string;
  quote: {
    reference: string;
    submittedAt: Date | null;
    status: QuoteStatus;
    updatedAt: Date;
    acceptedAt: Date | null;
    product?: { name?: string } | null;
  };
  contract: {
    startDate: Date;
    endDate: Date;
    status: string;
    updatedAt: Date;
  } | null;
  companyData: Record<string, unknown>;
  formData: Record<string, unknown>;
  apporteur: string;
}): FidelidadePolicesRow {
  const {
    inst,
    eventType,
    eventDate,
    etatPolice,
    quote,
    companyData,
    formData,
    apporteur,
  } = params;
  const activityCols = buildActivityColumnsFromFormData(formData);
  const quoteCodeNaf =
    (formData.code_naf as string | null | undefined) ??
    (quote as { codeNAF?: string | null }).codeNAF ??
    null;
  const formFields = getFormDataFieldsForPolices(
    formData,
    companyData,
    quoteCodeNaf,
  );

  const dateDeffetRaw =
    formData.dateDeffet ??
    formData.dateEffet ??
    formData.dateDebut ??
    formData.startDate;
  const dateSouscription =
    dateDeffetRaw != null
      ? formatDate(dateDeffetRaw as Date | string)
      : DEFAULT_STRING;

  const dateEffet = formatDate(inst.periodStart);
  const dateFin = formatDate(inst.periodEnd);
  const dateDemande = dateEffet;

  const fractionnement = toStr(
    formData.periodicity ??
      formData.periodicite ??
      formData.fractionnementPrime,
  );

  return {
    APPORTEUR: apporteur,
    IDENTIFIANT_POLICE: quote.reference ?? DEFAULT_STRING,
    DATE_SOUSCRIPTION: dateSouscription,
    DATE_EFFET_CONTRAT: dateEffet,
    DATE_FIN_CONTRAT: dateFin,
    NUMERO_AVENANT: DEFAULT_STRING,
    MOTIF_AVENANT: DEFAULT_STRING,
    DATE_EFFET_AVENANT: DEFAULT_STRING,
    DATE_ECHEANCE: dateDemande,
    ETAT_POLICE: etatPolice,
    DATE_ETAT_POLICE: formatDate(eventDate),
    MOTIF_ETAT: etatPolice === "RESILIE" ? "RESILIATION" : eventType,

    FRACTIONNEMENT: fractionnement,
    NOM_ENTREPRISE_ASSURE: formFields.nomEntrepriseAssure,
    SIREN: formFields.siren,
    ADRESSE_RISQUE: formFields.adresseRisque,
    VILLE_RISQUE: formFields.villeRisque,
    CODE_POSTAL_RISQUE: formFields.codePostalRisque,
    CA_ENTREPRISE: formFields.caEntreprise,
    EFFECTIF_ENTREPRISE: formFields.effectifEntreprise,
    CODE_NAF: formFields.codeNaf,
    ...activityCols,
  } as unknown as FidelidadePolicesRow;
}

/** formData.activities ou formData.activites ; LIBELLE = title RCD (code→title), POID = caSharePercent */
function buildActivityColumnsFromFormData(
  formData: Record<string, unknown>,
): Record<string, string> {
  const raw = formData.activities ?? formData.activites;
  const activities = Array.isArray(raw) ? raw : [];
  const out: Record<string, string> = {};
  for (let i = 1; i <= 8; i++) {
    const a = activities[i - 1] as
      | { code?: string | number; caSharePercent?: string | number }
      | undefined;
    out[`LIBELLE_ACTIVITE_${i}`] =
      a != null && a.code != null
        ? getActiviteTitleByCode(a.code)
        : DEFAULT_STRING;
    out[`POID_ACTIVITE_${i}`] =
      a != null && a.caSharePercent != null
        ? String(a.caSharePercent)
        : DEFAULT_STRING;
  }
  return out;
}

function getFormDataFieldsForPolices(
  formData: Record<string, unknown>,
  companyData: Record<string, unknown>,
  quoteCodeNaf: string | null,
): {
  villeRisque: string;
  codePostalRisque: string;
  adresseRisque: string;
  nomEntrepriseAssure: string;
  siren: string;
  caEntreprise: string;
  effectifEntreprise: string;
  codeNaf: string;
} {
  const siretRaw = formData.siret ?? companyData.siret;
  const siren =
    siretRaw != null
      ? String(siretRaw).replace(/\D/g, "").slice(0, 9)
      : DEFAULT_STRING;
  return {
    villeRisque: toStr(formData.city ?? companyData.city ?? companyData.ville),
    codePostalRisque: toStr(
      formData.postalCode ?? companyData.postalCode ?? companyData.codePostal,
    ),
    adresseRisque: toStr(
      formData.address ?? companyData.address ?? companyData.adresse,
    ),
    nomEntrepriseAssure: toStr(
      formData.companyName ??
        companyData.companyName ??
        companyData.name ??
        companyData.raisonSociale,
    ),
    siren,
    caEntreprise: toStr(
      formData.chiffreAffaires ?? companyData.revenue ?? companyData.ca,
    ),
    effectifEntreprise: toStr(
      formData.nombreSalaries ??
        companyData.employeeCount ??
        companyData.effectif,
    ),
    codeNaf: toStr(quoteCodeNaf ?? formData.code_naf),
  };
}

function toStr(v: unknown): string {
  return v != null ? String(v) : DEFAULT_STRING;
}
