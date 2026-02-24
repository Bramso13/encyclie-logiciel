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
export interface BordereauInclusionOptions {
  /** Inclure seulement les échéances ayant une date d'émission (défaut : true) */
  requireEmission?: boolean;
  /** Inclure N > 1 seulement si l'échéance précédente est payée (défaut : true) */
  requirePrevPaid?: boolean;
}

export async function getPolicesV2(
  filters: BordereauFiltersV2,
  prisma: PrismaClient,
  options?: BordereauInclusionOptions,
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

  // Filtrer les échéances post-résiliation.
  // resiliationDate sera disponible sur le schedule après migration + prisma generate.
  const filteredInstallments = (installments as any[]).filter((inst) => {
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

  filteredInstallments.sort((a: any, b: any) => {
    const refA = a.schedule.quote.reference ?? "";
    const refB = b.schedule.quote.reference ?? "";
    if (refA !== refB) return refA.localeCompare(refB);
    return a.installmentNumber - b.installmentNumber;
  });

  // ── Filtre d'inclusion bordereau (contrôlé par options) ──────────────────────
  const doRequireEmission = options?.requireEmission !== false; // true par défaut
  const doRequirePrevPaid = options?.requirePrevPaid !== false; // true par défaut

  // 1. Filtre emissionDate
  const withEmission = doRequireEmission
    ? (filteredInstallments as any[]).filter((i: any) => !!i.emissionDate)
    : (filteredInstallments as any[]);

  // 2. Filtre échéance précédente payée (uniquement si les deux options sont actives)
  const prevPaidMap = new Map<string, boolean>();
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
        prevPaidMap.set(key, prev.status === "PAID" || prev.paidAt !== null);
      }
    }
  }

  const bordereauInstallments = withEmission.filter((inst: any) => {
    if (!doRequirePrevPaid) return true;
    if (inst.installmentNumber === 1) return true;
    const key = `${inst.scheduleId}-${inst.installmentNumber - 1}`;
    return prevPaidMap.get(key) === true;
  });

  const rows: FidelidadePolicesRow[] = [];

  for (const inst of bordereauInstallments as any[]) {
    const quote = inst.schedule.quote;
    const contract = quote.contract;
    const companyData = (quote.companyData ?? {}) as Record<string, unknown>;
    const formData = (quote.formData ?? {}) as Record<string, unknown>;

    const resiliationDate: Date | null = inst.schedule?.resiliationDate ?? null;

    rows.push(
      mapInstallmentToPolicesRow({
        inst: {
          periodStart: inst.periodStart,
          periodEnd: inst.periodEnd,
          dueDate: inst.dueDate,
          status: inst.status,
          paidAt: inst.paidAt,
          emissionDate: inst.emissionDate ?? null,
          installmentNumber: inst.installmentNumber,
        },
        quote,
        contract,
        companyData,
        formData,
        apporteur,
        resiliationDate,
      }),
    );
  }

  // Déduplication par SIREN — même logique que pour les Quittances :
  // une seule ligne par SIREN (première occurrence après tri).
  // Si pas de SIREN, on utilise l'IDENTIFIANT_POLICE comme clé de fallback.
  const seenSiren = new Set<string>();
  const deduped: FidelidadePolicesRow[] = [];

  rows.sort((a, b) =>
    (a.IDENTIFIANT_POLICE || "").localeCompare(b.IDENTIFIANT_POLICE || ""),
  );

  for (const row of rows) {
    const sirenKey = row.SIREN?.trim();
    const key = sirenKey ? sirenKey : `_${row.IDENTIFIANT_POLICE}`;
    if (seenSiren.has(key)) continue;
    seenSiren.add(key);
    deduped.push(row);
  }

  return deduped;
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
  resiliationDate?: Date | null;
}): FidelidadePolicesRow {
  const { inst, quote, contract, companyData, formData, apporteur, resiliationDate } = params;
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

  // DATE_SOUSCRIPTION = date d'effet du formulaire
  const dateDeffetRaw =
    formData.dateDeffet ??
    formData.dateEffet ??
    formData.dateDebut ??
    formData.startDate;
  const dateSouscription =
    dateDeffetRaw != null
      ? formatDate(dateDeffetRaw as Date | string)
      : DEFAULT_STRING;

  // DATE_EFFET_CONTRAT = début de période de l'échéance
  const dateEffet = formatDate(inst.periodStart);

  // DATE_FIN_CONTRAT = fin de période de l'échéance
  const dateFin = formatDate(inst.periodEnd);

  const dateDemande = inst.dueDate ? formatDate(inst.dueDate) : DEFAULT_STRING;

  // ETAT_POLICE : RESILIE > SOUSCRIPTION (1re échéance) > EN COURS (autres)
  const statutPolice = resiliationDate
    ? "RESILIE"
    : inst.installmentNumber === 1
    ? "SOUSCRIPTION"
    : "EN COURS";

  // DATE_ETAT_POLICE = paidAt si payé, sinon emissionDate (date d'émission d'appel de prime)
  const dateStatPolice =
    inst.paidAt != null
      ? formatDate(inst.paidAt)
      : inst.emissionDate != null
      ? formatDate(inst.emissionDate)
      : DEFAULT_STRING;

  const fractionnement = toStr(
    formData.periodicity ??
      formData.periodicite ??
      formData.fractionnementPrime,
  );

  // MOTIF_ETAT : RESILIATION / REGLEMENT / EMISSION
  const motifEtat = resiliationDate
    ? "RESILIATION"
    : inst.status === "PAID" || inst.paidAt != null
    ? "REGLEMENT"
    : "EMISSION";

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
    MOTIF_ETAT: motifEtat,
    MOTIF_STATUT: motifEtat,
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
