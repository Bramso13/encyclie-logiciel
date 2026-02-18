import { PrismaClient, QuoteStatus } from "@prisma/client";
import type { PaymentScheduleStatus } from "@prisma/client";
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
 * Règle périmètre : une ligne par SIREN (jamais deux lignes avec le même SIREN).
 * On construit une ligne par échéance puis on déduplique par SIREN (DATE_FIN_CONTRAT = max des periodEnd du groupe).
 */
export async function getPolicesV2(
  filters: BordereauFiltersV2,
  prisma: PrismaClient,
): Promise<FidelidadePolicesRow[]> {
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
            include: {
              product: true,
              contract: true,
            },
          },
        },
      },
    },
  });

  installments.sort((a, b) => {
    const refA = a.schedule.quote.reference ?? "";
    const refB = b.schedule.quote.reference ?? "";
    if (refA !== refB) return refA.localeCompare(refB);
    return a.installmentNumber - b.installmentNumber;
  });

  const rows: FidelidadePolicesRow[] = [];

  for (const inst of installments) {
    const quote = inst.schedule.quote;
    const contract = quote.contract;
    const companyData = (quote.companyData ?? {}) as Record<string, unknown>;
    const formData = (quote.formData ?? {}) as Record<string, unknown>;

    rows.push(
      mapInstallmentToPolicesRow({
        inst: {
          periodEnd: inst.periodEnd,
          dueDate: inst.dueDate,
          status: inst.status,
          paidAt: inst.paidAt,
        },
        quote,
        contract,
        companyData,
        formData,
        apporteur,
      }),
    );
  }

  return deduplicatePolicesBySiren(rows);
}

/** Une ligne par SIREN : garde uniquement la première occurrence, sans regrouper. */
function deduplicatePolicesBySiren(
  rows: FidelidadePolicesRow[],
): FidelidadePolicesRow[] {
  const seenSiren = new Set<string>();
  const out: FidelidadePolicesRow[] = [];

  for (const row of rows) {
    const sirenKey = (row.SIREN ?? "").trim();
    const key = sirenKey
      ? sirenKey
      : `_${row.IDENTIFIANT_POLICE}_${row.DATE_FIN_CONTRAT}`;
    if (seenSiren.has(key)) continue;
    seenSiren.add(key);
    out.push(row);
  }

  out.sort((a, b) =>
    (a.IDENTIFIANT_POLICE || "").localeCompare(b.IDENTIFIANT_POLICE || ""),
  );
  return out;
}

function mapInstallmentToPolicesRow(params: {
  inst: {
    periodEnd: Date;
    dueDate: Date;
    status: PaymentScheduleStatus;
    paidAt: Date | null;
  };
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
  const { inst, quote, contract, companyData, formData, apporteur } = params;
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

  // date_souscription = formData.dateDeffet
  const dateDeffetRaw =
    formData.dateDeffet ??
    formData.dateEffet ??
    formData.dateDebut ??
    formData.startDate;
  const dateSouscription =
    dateDeffetRaw != null
      ? formatDate(dateDeffetRaw as Date | string)
      : DEFAULT_STRING;

  const dateEffet = contract
    ? formatDate(contract.startDate)
    : dateDeffetRaw != null
      ? formatDate(dateDeffetRaw as Date | string)
      : DEFAULT_STRING;

  // Date fin contrat = date fin période de l'échéance
  const dateFin = formatDate(inst.periodEnd);

  const dateDemande = inst.dueDate ? formatDate(inst.dueDate) : DEFAULT_STRING;

  const statutPolice = contract
    ? mapContractStatusToEtatPolice(
        contract.status as
          | "ACTIVE"
          | "SUSPENDED"
          | "EXPIRED"
          | "CANCELLED"
          | "PENDING_RENEWAL",
      )
    : mapQuoteStatusToStatutPolice(quote.status);

  // DATE_STAT_POLICE = dateDeffet
  const dateStatPolice =
    dateDeffetRaw != null
      ? formatDate(dateDeffetRaw as Date | string)
      : DEFAULT_STRING;

  const fractionnement = toStr(
    formData.periodicity ??
      formData.periodicite ??
      formData.fractionnementPrime,
  );

  const motifStatut =
    inst.status === "PAID" || inst.paidAt != null ? "REGLEMENT" : "EN_COURS";

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
    ETAT_POLICE: statutPolice,
    DATE_ETAT_POLICE: dateStatPolice,
    MOTIF_ETAT: DEFAULT_STRING,
    MOTIF_STATUT: motifStatut,
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

/**
 * Champs Polices remplis depuis formData (priorité) puis companyData.
 */
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
    siretRaw != null ? String(siretRaw).substring(0, 9) : DEFAULT_STRING;
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
