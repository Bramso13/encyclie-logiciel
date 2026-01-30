import { PrismaClient, ContractStatus, QuoteStatus } from "@prisma/client";
import {
  BordereauFilters,
  BordereauDataResult,
  FidelidadeRow,
  ActivityData,
  SourceDataItem,
} from "./types";
import {
  formatDate,
  mapContractStatusToEtatPolice,
  mapQuoteStatusToEtatPolice,
  flattenToSourceData,
} from "./utils";

/**
 * Main service function to extract and transform contract data for FIDELIDADE bordereau
 *
 * @param filters - Filter criteria for contract selection
 * @param prisma - Prisma client instance
 * @returns Structured data ready for CSV generation
 */
export async function getBordereauData(
  filters: BordereauFilters,
  prisma: PrismaClient,
): Promise<BordereauDataResult> {
  const {
    dateRange,
    brokerIds,
    contractStatus,
    productType,
    includeQuotes = true,
  } = filters;

  const includeRelations = {
    quote: {
      include: {
        broker: { include: { brokerProfile: true } },
        paymentSchedule: {
          include: {
            payments: {
              where: {
                dueDate: {
                  gte: dateRange.startDate,
                  lte: dateRange.endDate,
                },
              },
              orderBy: { dueDate: "asc" as const },
            },
          },
        },
      },
    },
    product: true,
    broker: { include: { brokerProfile: true } },
  } as const;

  // 1) Primary query: contracts that have at least one payment installment in the date range
  let contracts = await prisma.insuranceContract.findMany({
    where: {
      ...(contractStatus?.length ? { status: { in: contractStatus } } : {}),
      ...(brokerIds?.length ? { brokerId: { in: brokerIds } } : {}),
      ...(productType ? { product: { code: productType } } : {}),
      quote: {
        paymentSchedule: {
          payments: {
            some: {
              dueDate: {
                gte: dateRange.startDate,
                lte: dateRange.endDate,
              },
            },
          },
        },
      },
    },
    include: includeRelations,
  });

  // 2) Fallback: if no contracts with échéances in range, include contracts whose period overlaps the date range (even without payment schedule)
  if (contracts.length === 0) {
    contracts = await prisma.insuranceContract.findMany({
      where: {
        ...(contractStatus?.length ? { status: { in: contractStatus } } : {}),
        ...(brokerIds?.length ? { brokerId: { in: brokerIds } } : {}),
        ...(productType ? { product: { code: productType } } : {}),
        startDate: { lte: dateRange.endDate },
        endDate: { gte: dateRange.startDate },
      },
      include: includeRelations,
    });
  }

  // Transform each contract into FIDELIDADE rows + source data per row (for drag & drop)
  const rows: FidelidadeRow[] = [];
  const sourceDataPerRow: SourceDataItem[][] = [];

  for (const contract of contracts) {
    const quote = contract.quote;
    const brokerProfile = contract.broker.brokerProfile;
    const paymentSchedule = quote.paymentSchedule;

    if (!brokerProfile) {
      console.warn(`Contract ${contract.id} has no broker profile, skipping`);
      continue;
    }

    const companyData = quote.companyData as any;
    const formData = quote.formData as any;

    const buildSourceData = (): SourceDataItem[] => {
      const items: SourceDataItem[] = [];
      if (companyData && typeof companyData === "object") {
        items.push(...flattenToSourceData(companyData, "companyData"));
      }
      if (formData && typeof formData === "object") {
        items.push(...flattenToSourceData(formData, "formData"));
      }
      const calc = quote.calculatedPremium as unknown;
      if (calc && typeof calc === "object") {
        items.push(...flattenToSourceData(calc, "calculatedPremium"));
      }
      items.push(
        ...flattenToSourceData(
          {
            startDate: contract.startDate,
            endDate: contract.endDate,
            status: contract.status,
            reference: contract.reference,
          },
          "contract",
        ),
      );
      return items;
    };

    // If we have payment schedule with installments in range, one row per installment
    if (paymentSchedule?.payments?.length) {
      for (const payment of paymentSchedule.payments) {
        rows.push(
          transformToFidelidadeRow({
            contract,
            quote,
            brokerCode: brokerProfile.code,
            companyData,
            formData,
            paymentDueDate: payment.dueDate,
            paymentPeriodStart: payment.periodStart,
            paymentPeriodEnd: payment.periodEnd,
          }),
        );
        sourceDataPerRow.push(buildSourceData());
      }
      continue;
    }

    // Fallback: one row per contract (no payment schedule or no installments in range)
    rows.push(
      transformToFidelidadeRow({
        contract,
        quote,
        brokerCode: brokerProfile.code,
        companyData,
        formData,
        paymentDueDate: contract.startDate,
        paymentPeriodStart: contract.startDate,
        paymentPeriodEnd: contract.endDate,
      }),
    );
    sourceDataPerRow.push(buildSourceData());
  }

  // 3) Optionally include quotes (devis): filter by createdAt, all statuses; two lines when quote has contract
  let totalQuotes = 0;
  if (includeQuotes) {
    const quotes = await prisma.quote.findMany({
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
        ...(brokerIds?.length ? { brokerId: { in: brokerIds } } : {}),
        ...(productType ? { product: { code: productType } } : {}),
      },
      include: {
        broker: { include: { brokerProfile: true } },
        product: true,
        paymentSchedule: {
          include: {
            payments: {
              where: {
                dueDate: {
                  gte: dateRange.startDate,
                  lte: dateRange.endDate,
                },
              },
              orderBy: { dueDate: "asc" as const },
            },
          },
        },
      },
    });

    totalQuotes = quotes.length;

    for (const quote of quotes) {
      const brokerProfile = quote.broker.brokerProfile;
      if (!brokerProfile) {
        console.warn(`Quote ${quote.id} has no broker profile, skipping`);
        continue;
      }
      const companyData = quote.companyData as any;
      const formData = quote.formData as any;
      const paymentSchedule = quote.paymentSchedule;

      const buildQuoteSourceData = (): SourceDataItem[] => {
        const items: SourceDataItem[] = [];
        if (companyData && typeof companyData === "object") {
          items.push(...flattenToSourceData(companyData, "companyData"));
        }
        if (formData && typeof formData === "object") {
          items.push(...flattenToSourceData(formData, "formData"));
        }
        const calc = quote.calculatedPremium as unknown;
        if (calc && typeof calc === "object") {
          items.push(...flattenToSourceData(calc, "calculatedPremium"));
        }
        items.push(
          ...flattenToSourceData(
            {
              id: quote.id,
              reference: quote.reference,
              status: quote.status,
              submittedAt: quote.submittedAt,
              createdAt: quote.createdAt,
            },
            "quote",
          ),
        );
        return items;
      };

      if (paymentSchedule?.payments?.length) {
        for (const payment of paymentSchedule.payments) {
          rows.push(
            transformQuoteToFidelidadeRow({
              quote,
              brokerCode: brokerProfile.code,
              companyData,
              formData,
              paymentDueDate: payment.dueDate,
              paymentPeriodStart: payment.periodStart,
              paymentPeriodEnd: payment.periodEnd,
            }),
          );
          sourceDataPerRow.push(buildQuoteSourceData());
        }
      } else {
        rows.push(
          transformQuoteToFidelidadeRow({
            quote,
            brokerCode: brokerProfile.code,
            companyData,
            formData,
            paymentDueDate: quote.createdAt,
            paymentPeriodStart: quote.createdAt,
            paymentPeriodEnd: quote.createdAt,
          }),
        );
        sourceDataPerRow.push(buildQuoteSourceData());
      }
    }
  }

  return {
    rows,
    sourceDataPerRow,
    metadata: {
      totalContracts: contracts.length,
      ...(includeQuotes && { totalQuotes }),
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      generatedAt: new Date(),
    },
  };
}

/**
 * Transform quote-only (devis) data into a FIDELIDADE CSV row (no contract)
 */
interface TransformQuoteParams {
  quote: any;
  brokerCode: string;
  companyData: any;
  formData: any;
  paymentDueDate: Date;
  paymentPeriodStart: Date;
  paymentPeriodEnd: Date;
}

function transformQuoteToFidelidadeRow(
  params: TransformQuoteParams,
): FidelidadeRow {
  const {
    quote,
    brokerCode,
    companyData,
    formData,
    paymentDueDate,
    paymentPeriodStart,
    paymentPeriodEnd,
  } = params;

  const activities: ActivityData[] = formData.activites || [];
  const activityColumns: Record<string, string> = {};
  for (let i = 1; i <= 8; i++) {
    const activity = activities[i - 1];
    activityColumns[`LIBELLE_ACTIVITE_${i}`] = activity
      ? String(activity.code)
      : "";
    activityColumns[`POID_ACTIVITE_${i}`] = activity
      ? String(activity.caSharePercent)
      : "";
  }

  const dateEffet =
    formData.dateEffet ?? formData.dateDebut ?? formData.startDate;
  const dateFin =
    formData.dateFin ?? formData.dateFinContrat ?? formData.endDate;

  return {
    APPORTEUR: brokerCode,
    IDENTIFIANT_POLICE: formData.identifiantPolice ?? "",
    DATE_SOUSCRIPTION: quote.submittedAt ? formatDate(quote.submittedAt) : "",
    DATE_EFFET_CONTRAT: dateEffet ? formatDate(dateEffet) : "",
    DATE_FIN_CONTRAT: dateFin ? formatDate(dateFin) : "",
    DATE_ECHEANCE: formatDate(paymentDueDate),
    NUMERO_AVENANT: "",
    MOTIF_AVENANT: "",
    DATE_EFFET_AVENANT: "",
    ETAT_POLICE: mapQuoteStatusToEtatPolice(quote.status as QuoteStatus),
    DATE_ETAT_POLICE: quote.updatedAt ? formatDate(quote.updatedAt) : "",
    MOTIF_ETAT: "",
    FRANCTIONNEMENT: "",
    SIREN: companyData.siret ? companyData.siret.substring(0, 9) : "",
    ADRESSE_RISQUE: companyData.address ?? "",
    VILLE_RISQUE: companyData.city ?? "",
    CODE_POSTAL_RISQUE: companyData.postalCode ?? "",
    CA_ENTREPRISE: companyData.revenue ? String(companyData.revenue) : "",
    EFFECTIF_ENTREPRISE: companyData.employeeCount
      ? String(companyData.employeeCount)
      : "",
    CODE_NAF: formData.codeNaf ?? "",
    ...activityColumns,
  } as FidelidadeRow;
}

/**
 * Transform contract and quote data into a single FIDELIDADE CSV row
 */
interface TransformParams {
  contract: any;
  quote: any;
  brokerCode: string;
  companyData: any;
  formData: any;
  paymentDueDate: Date;
  paymentPeriodStart: Date;
  paymentPeriodEnd: Date;
}

function transformToFidelidadeRow(params: TransformParams): FidelidadeRow {
  const {
    contract,
    quote,
    brokerCode,
    companyData,
    formData,
    paymentDueDate,
    paymentPeriodStart,
    paymentPeriodEnd,
  } = params;

  // Extract activities (up to 8)
  const activities: ActivityData[] = formData.activites || [];

  // Create activity columns (fill up to 8, empty strings for missing)
  const activityColumns: Record<string, string> = {};
  for (let i = 1; i <= 8; i++) {
    const activity = activities[i - 1];
    activityColumns[`LIBELLE_ACTIVITE_${i}`] = activity
      ? String(activity.code)
      : "";
    activityColumns[`POID_ACTIVITE_${i}`] = activity
      ? String(activity.caSharePercent)
      : "";
  }

  // Build the FIDELIDADE row
  const row: FidelidadeRow = {
    // Broker and policy identification
    APPORTEUR: brokerCode,
    IDENTIFIANT_POLICE: formData.identifiantPolice || "",

    // Dates
    DATE_SOUSCRIPTION: quote.submittedAt ? formatDate(quote.submittedAt) : "",
    DATE_EFFET_CONTRAT: contract.startDate
      ? formatDate(contract.startDate)
      : "",
    DATE_FIN_CONTRAT: contract.endDate ? formatDate(contract.endDate) : "",
    DATE_ECHEANCE: formatDate(paymentDueDate),

    // Avenant fields (empty for now as per requirements)
    NUMERO_AVENANT: "",
    MOTIF_AVENANT: "",
    DATE_EFFET_AVENANT: "",

    // Policy status
    ETAT_POLICE: mapContractStatusToEtatPolice(contract.status),
    DATE_ETAT_POLICE: contract.updatedAt ? formatDate(contract.updatedAt) : "",
    MOTIF_ETAT: "",
    FRANCTIONNEMENT: "", // Will be defined based on payment schedule frequency

    // Company information
    SIREN: companyData.siret ? companyData.siret.substring(0, 9) : "",
    ADRESSE_RISQUE: companyData.address || "",
    VILLE_RISQUE: companyData.city || "",
    CODE_POSTAL_RISQUE: companyData.postalCode || "",
    CA_ENTREPRISE: companyData.revenue ? String(companyData.revenue) : "",
    EFFECTIF_ENTREPRISE: companyData.employeeCount
      ? String(companyData.employeeCount)
      : "",
    CODE_NAF: formData.codeNaf || "",

    // Activities (spread the activity columns)
    ...activityColumns,
  } as FidelidadeRow;

  return row;
}
