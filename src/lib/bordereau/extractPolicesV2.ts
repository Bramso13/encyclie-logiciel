import { PrismaClient, QuoteStatus } from "@prisma/client";
import { tableauTax } from "@/lib/tarificateurs/rcd";
import type { BordereauFiltersV2, FidelidadePolicesRow } from "./types";
import { getApporteur } from "./config";
import {
  formatDate,
  mapContractStatusToEtatPolice,
  mapQuoteStatusToStatutPolice,
} from "./utils";

const DEFAULT_STRING = "";

/** Map code activité (1–20) → libellé (title) depuis le tableau RCD */
const activiteCodeToTitle = new Map(tableauTax.map((t) => [t.code, t.title]));
function getActiviteTitleByCode(code: string | number): string {
  const n = typeof code === "string" ? parseInt(code, 10) : code;
  if (Number.isNaN(n)) return String(code);
  return activiteCodeToTitle.get(n) ?? String(code);
}

/**
 * Règle périmètre : contrat dont la période (startDate, endDate) chevauche la période filtre.
 * Quote ACCEPTED sans contrat : retenue si acceptedAt dans la période (devis accepté seul).
 */
export async function getPolicesV2(
  filters: BordereauFiltersV2,
  prisma: PrismaClient
): Promise<FidelidadePolicesRow[]> {
  const { dateRange } = filters;
  const apporteur = getApporteur();

  const includeQuoteProduct = {
    quote: {
      include: {
        product: true,
      },
    },
    product: true,
  } as const;

  // 1) Contrats dont la quote est ACCEPTED et période contrat chevauche la période filtre
  const contracts = await prisma.insuranceContract.findMany({
    where: {
      quote: { status: QuoteStatus.ACCEPTED },
      startDate: { lte: dateRange.endDate },
      endDate: { gte: dateRange.startDate },
    },
    include: includeQuoteProduct,
  });

  const rows: FidelidadePolicesRow[] = [];

  for (const contract of contracts) {
    const quote = contract.quote;
    const companyData = (quote.companyData ?? {}) as Record<string, unknown>;
    const formData = (quote.formData ?? {}) as Record<string, unknown>;
    const productName = contract.product?.name ?? quote.product?.name ?? "";
    rows.push(
      mapContractToPolicesRow({
        quote,
        contract,
        companyData,
        formData,
        apporteur,
        productName,
      })
    );
  }

  // 2) Quotes ACCEPTED sans contrat (devis accepté seul) dont acceptedAt dans la période
  const standaloneQuotes = await prisma.quote.findMany({
    where: {
      status: QuoteStatus.ACCEPTED,
      contract: null,
      acceptedAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    },
    include: { product: true },
  });

  for (const quote of standaloneQuotes) {
    const companyData = (quote.companyData ?? {}) as Record<string, unknown>;
    const formData = (quote.formData ?? {}) as Record<string, unknown>;
    rows.push(
      mapQuoteOnlyToPolicesRow({
        quote,
        companyData,
        formData,
        apporteur,
      })
    );
  }

  return rows;
}

function mapContractToPolicesRow(params: {
  quote: {
    reference: string;
    submittedAt: Date | null;
    codeNAF: string | null;
    status: QuoteStatus;
    updatedAt: Date;
  };
  contract: { startDate: Date; endDate: Date; status: string; updatedAt: Date };
  companyData: Record<string, unknown>;
  formData: Record<string, unknown>;
  apporteur: string;
  productName: string;
}): FidelidadePolicesRow {
  const { quote, contract, companyData, formData, apporteur, productName } =
    params;
  const activityCols = buildActivityColumnsFromFormData(formData);
  const formFields = getFormDataFieldsForPolices(
    formData,
    companyData,
    quote.codeNAF
  );

  const dateSouscription = quote.submittedAt
    ? formatDate(quote.submittedAt)
    : DEFAULT_STRING;
  const dateEffet = contract.startDate
    ? formatDate(contract.startDate)
    : DEFAULT_STRING;
  const dateFin = contract.endDate
    ? formatDate(contract.endDate)
    : DEFAULT_STRING;
  const dateDemande = dateSouscription;
  const statutPolice = mapContractStatusToEtatPolice(
    contract.status as
      | "ACTIVE"
      | "SUSPENDED"
      | "EXPIRED"
      | "CANCELLED"
      | "PENDING_RENEWAL"
  );
  const dateStatPolice = contract.updatedAt
    ? formatDate(contract.updatedAt)
    : DEFAULT_STRING;

  return {
    APPORTEUR: apporteur,
    IDENTIFIANT_POLICE: quote.reference ?? DEFAULT_STRING,
    DATE_SOUSCRIPTION: dateSouscription,
    DATE_EFFET_CONTRAT: dateEffet,
    DATE_FIN_CONTRAT: dateFin,
    NUMERO_AVENANT: DEFAULT_STRING,
    MOTIF_AVENANT: DEFAULT_STRING,
    DATE_EFFET_AVENANT: DEFAULT_STRING,
    DATE_DEMANDE: dateDemande,
    STATUT_POLICE: statutPolice,
    DATE_STAT_POLICE: dateStatPolice,
    MOTIF_STATUT: DEFAULT_STRING,
    TYPE_CONTRAT: productName,
    COMPAGNIE: productName,
    NOM_ENTREPRISE_ASSURE: formFields.nomEntrepriseAssure,
    SIREN: formFields.siren,
    ACTIVITE: DEFAULT_STRING,
    ADRESSE_RISQUE: formFields.adresseRisque,
    VILLE_RISQUE: formFields.villeRisque,
    CODE_POSTAL_RISQUE: formFields.codePostalRisque,
    CA_ENTREPRISE: formFields.caEntreprise,
    EFFECTIF_ENTREPRISE: formFields.effectifEntreprise,
    CODE_NAF: formFields.codeNaf,
    ...activityCols,
  } as FidelidadePolicesRow;
}

function mapQuoteOnlyToPolicesRow(params: {
  quote: {
    reference: string;
    submittedAt: Date | null;
    acceptedAt: Date | null;
    codeNAF: string | null;
    status: QuoteStatus;
    updatedAt: Date;
    product?: { name?: string };
  };
  companyData: Record<string, unknown>;
  formData: Record<string, unknown>;
  apporteur: string;
}): FidelidadePolicesRow {
  const { quote, companyData, formData, apporteur } = params;
  const activityCols = buildActivityColumnsFromFormData(formData);
  const formFields = getFormDataFieldsForPolices(
    formData,
    companyData,
    quote.codeNAF
  );

  const dateSouscription = quote.submittedAt
    ? formatDate(quote.submittedAt)
    : DEFAULT_STRING;
  const dateEffet =
    formData.dateEffet ??
    formData.dateDeffet ??
    formData.dateDebut ??
    formData.startDate;
  const dateFin =
    formData.dateFin ?? formData.dateFinContrat ?? formData.endDate;
  const dateDemande = dateSouscription;
  const statutPolice = mapQuoteStatusToStatutPolice(quote.status);
  const dateStatPolice = quote.updatedAt
    ? formatDate(quote.updatedAt)
    : quote.acceptedAt
    ? formatDate(quote.acceptedAt)
    : DEFAULT_STRING;

  return {
    APPORTEUR: apporteur,
    IDENTIFIANT_POLICE: quote.reference ?? DEFAULT_STRING,
    DATE_SOUSCRIPTION: dateSouscription,
    DATE_EFFET_CONTRAT:
      dateEffet != null ? formatDate(dateEffet as Date) : DEFAULT_STRING,
    DATE_FIN_CONTRAT:
      dateFin != null ? formatDate(dateFin as Date) : DEFAULT_STRING,
    NUMERO_AVENANT: DEFAULT_STRING,
    MOTIF_AVENANT: DEFAULT_STRING,
    DATE_EFFET_AVENANT: DEFAULT_STRING,
    DATE_DEMANDE: dateDemande,
    STATUT_POLICE: statutPolice,
    DATE_STAT_POLICE: dateStatPolice,
    MOTIF_STATUT: DEFAULT_STRING,
    TYPE_CONTRAT: quote.product?.name ?? DEFAULT_STRING,
    COMPAGNIE: quote.product?.name ?? DEFAULT_STRING,
    NOM_ENTREPRISE_ASSURE: formFields.nomEntrepriseAssure,
    SIREN: formFields.siren,
    ACTIVITE: DEFAULT_STRING,
    ADRESSE_RISQUE: formFields.adresseRisque,
    VILLE_RISQUE: formFields.villeRisque,
    CODE_POSTAL_RISQUE: formFields.codePostalRisque,
    CA_ENTREPRISE: formFields.caEntreprise,
    EFFECTIF_ENTREPRISE: formFields.effectifEntreprise,
    CODE_NAF: formFields.codeNaf,
    ...activityCols,
  } as FidelidadePolicesRow;
}

/** formData.activities ou formData.activites ; LIBELLE = title RCD (code→title), POIDS = caSharePercent */
function buildActivityColumnsFromFormData(
  formData: Record<string, unknown>
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
    out[`POIDS_ACTIVITE_${i}`] =
      a != null && a.caSharePercent != null
        ? String(a.caSharePercent)
        : DEFAULT_STRING;
  }
  return out;
}

/**
 * Champs Polices remplis depuis formData (priorité) puis companyData.
 * Aligné sur la structure formData réelle : city, postalCode, address, companyName, siret,
 * chiffreAffaires, nombreSalaries, codeNaf, activities.
 */
function getFormDataFieldsForPolices(
  formData: Record<string, unknown>,
  companyData: Record<string, unknown>,
  quoteCodeNaf: string | null
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
    siretRaw != null ? String(siretRaw).substring(0, 9) : DEFAULT_STRING;
  return {
    villeRisque: toStr(formData.city ?? companyData.city ?? companyData.ville),
    codePostalRisque: toStr(
      formData.postalCode ?? companyData.postalCode ?? companyData.codePostal
    ),
    adresseRisque: toStr(
      formData.address ?? companyData.address ?? companyData.adresse
    ),
    nomEntrepriseAssure: toStr(
      formData.companyName ??
        companyData.companyName ??
        companyData.name ??
        companyData.raisonSociale
    ),
    siren,
    caEntreprise: toStr(
      formData.chiffreAffaires ?? companyData.revenue ?? companyData.ca
    ),
    effectifEntreprise: toStr(
      formData.nombreSalaries ??
        companyData.employeeCount ??
        companyData.effectif
    ),
    codeNaf: toStr(quoteCodeNaf ?? formData.codeNaf),
  };
}

function toStr(v: unknown): string {
  return v != null ? String(v) : DEFAULT_STRING;
}
