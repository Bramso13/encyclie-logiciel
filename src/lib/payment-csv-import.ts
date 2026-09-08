/**
 * Import de paiements depuis CSV (format reglementVinu.csv)
 * Dates : JJ/MM/AAAA
 */

import {
  PrismaClient,
  PaymentScheduleStatus,
  PaymentMethod,
  Prisma,
} from "@prisma/client";

export type CsvRow = {
  nomClient: string;
  bordereau: string;
  dateReglement: Date | null;
  primeReglee: number;
  estPartiel: boolean;
  montantManquant?: number;
  avecOuSansCom: string;
  typeSouscription: string;
  periode: string;
  dateDebutPeriode: Date | null;
  dateFinPeriode: Date | null;
  numeroPolice: string;
  siret: string;
  primeComDeduite: number;
  montantRenouvellement: number;
  montantComCourtier: number;
  territoire: string;
  courtier: string;
};

export type ImportAction =
  | "UPDATED"
  | "CREATED"
  | "DRY_RUN_UPDATE"
  | "DRY_RUN_CREATE"
  | "SKIPPED_ALREADY_PAID"
  | "SKIPPED_DUPLICATE_CSV"
  | "SKIPPED_DUPLICATE_DB"
  | "ERROR";

export type ImportResult = {
  success: boolean;
  created?: boolean;
  message: string;
  rowIndex: number;
  action: ImportAction;
  nomClient: string;
  numeroPolice: string;
  siret: string;
  periode: string;
  dateReglement: string;
  primeReglee: number;
  quoteReference?: string;
  installmentNumber?: number;
  installmentId?: string;
  matchMethod?: string;
  warnings: string[];
  details: string;
};

export type ImportStats = {
  total: number;
  imported: number;
  created: number;
  skipped: number;
  errors: number;
  duplicateCsv: number;
  duplicateDb: number;
};

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

/** Parse une date au format JJ/MM/AAAA (ou J/M/AAAA) */
export function parseCSVDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;

  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;
  if (date.getDate() !== day || date.getMonth() !== month) return null;
  return date;
}

function parsePeriode(periodeStr: string): { debut: Date | null; fin: Date | null } {
  if (!periodeStr) return { debut: null, fin: null };

  const match = periodeStr.match(
    /(\d{1,2}\/\d{1,2}\/\d{4})\s*AU\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  if (!match) return { debut: null, fin: null };

  return {
    debut: parseCSVDate(match[1]),
    fin: parseCSVDate(match[2]),
  };
}

function parseMontant(montantStr: string): {
  montant: number;
  estPartiel: boolean;
  manquant?: number;
} {
  if (!montantStr) return { montant: 0, estPartiel: false };

  const str = montantStr.toString().trim();

  const partielMatch = str.match(
    /([\d\s\u00A0\u202F,\.]+)\s*€?\s*,?\s*manque\s+([\d\s\u00A0\u202F,\.]+)\s*€?/i,
  );
  if (partielMatch) {
    const paye = parseFloat(
      partielMatch[1].replace(/[\s\u00A0\u202F]/g, "").replace(",", "."),
    );
    const manquant = parseFloat(
      partielMatch[2].replace(/[\s\u00A0\u202F]/g, "").replace(",", "."),
    );
    return {
      montant: Number.isNaN(paye) ? 0 : paye,
      estPartiel: true,
      manquant: Number.isNaN(manquant) ? undefined : manquant,
    };
  }

  const cleaned = str
    .replace(/€/g, "")
    .replace(/[\s\u00A0\u202F]/g, "")
    .replace(/,/g, ".");

  const parts = cleaned.split(".");
  if (parts.length > 2) {
    const lastPart = parts.pop();
    const montant = parseFloat(parts.join("") + "." + lastPart);
    return { montant: Number.isNaN(montant) ? 0 : montant, estPartiel: false };
  }

  const montant = parseFloat(cleaned);
  return { montant: Number.isNaN(montant) ? 0 : montant, estPartiel: false };
}

export function formatDateFr(date: Date | null | undefined): string {
  if (!date) return "—";
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function csvRowKey(row: CsvRow): string {
  return [
    row.numeroPolice.trim().toUpperCase(),
    row.siret.replace(/\D/g, ""),
    formatDateFr(row.dateDebutPeriode),
    formatDateFr(row.dateFinPeriode),
  ].join("|");
}

export function extractSiren(siret: string): string | null {
  const cleaned = siret.replace(/\s/g, "").replace(/\D/g, "");
  if (cleaned.length >= 9) {
    return cleaned.substring(0, 9);
  }
  return null;
}

export function siretsMatch(siret1: string, siret2: string): boolean {
  const s1 = siret1.replace(/\s/g, "").replace(/\D/g, "");
  const s2 = siret2.replace(/\s/g, "").replace(/\D/g, "");

  if (s1 === s2) return true;
  if (s1.startsWith(s2) || s2.startsWith(s1)) return true;

  const siren1 = s1.substring(0, 9);
  const siren2 = s2.substring(0, 9);
  if (siren1 === siren2 && siren1.length === 9) return true;

  return false;
}

function findSiretInData(data: unknown, targetSiret: string): boolean {
  if (!data || typeof data !== "object") return false;

  const targetSiren = extractSiren(targetSiret);
  const fields = [
    "siret",
    "siretNumber",
    "siren",
    "sirenNumber",
    "numeroSiret",
    "siretClient",
  ];

  for (const field of fields) {
    const value = (data as Record<string, unknown>)[field];
    if (typeof value === "string") {
      if (siretsMatch(value, targetSiret)) return true;
      if (targetSiren && siretsMatch(value, targetSiren)) return true;
    }
  }

  return false;
}

function periodMatches(
  periodStart: Date,
  periodEnd: Date,
  targetStart: Date,
  targetEnd: Date,
): boolean {
  const pStart = new Date(periodStart);
  pStart.setHours(0, 0, 0, 0);
  const pEnd = new Date(periodEnd);
  pEnd.setHours(0, 0, 0, 0);
  const tStart = new Date(targetStart);
  tStart.setHours(0, 0, 0, 0);
  const tEnd = new Date(targetEnd);
  tEnd.setHours(0, 0, 0, 0);
  return (
    pStart.getTime() === tStart.getTime() && pEnd.getTime() === tEnd.getTime()
  );
}

export function parseCSV(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length < 14) continue;

    const periodeStr = values[6] || "";
    const periode = parsePeriode(periodeStr);
    const primeInfo = parseMontant(values[3] || "0");

    const siretRaw = values[8] || "";
    const siret = siretRaw.replace(/\s/g, "");

    const row: CsvRow = {
      nomClient: values[0] || "",
      bordereau: values[1] || "",
      dateReglement: parseCSVDate(values[2]),
      primeReglee: primeInfo.montant,
      estPartiel: primeInfo.estPartiel,
      montantManquant: primeInfo.manquant,
      avecOuSansCom: values[4] || "",
      typeSouscription: values[5] || "",
      periode: periodeStr,
      dateDebutPeriode: periode.debut,
      dateFinPeriode: periode.fin,
      numeroPolice: (values[7] || "").trim(),
      siret,
      primeComDeduite: parseMontant(values[9]).montant,
      montantRenouvellement: parseMontant(values[10]).montant,
      montantComCourtier: parseMontant(values[11]).montant,
      territoire: values[12] || "",
      courtier: values[13] || "",
    };

    if (row.siret && row.dateDebutPeriode && row.dateFinPeriode) {
      rows.push(row);
    }
  }

  return rows;
}

function detectPaymentMethod(_csvRow: CsvRow): PaymentMethod {
  return "OTHER";
}

function buildBaseResult(
  csvRow: CsvRow,
  rowIndex: number,
  action: ImportAction,
): Omit<ImportResult, "success" | "message" | "details" | "warnings"> {
  return {
    rowIndex,
    action,
    nomClient: csvRow.nomClient,
    numeroPolice: csvRow.numeroPolice,
    siret: csvRow.siret,
    periode: csvRow.periode,
    dateReglement: formatDateFr(csvRow.dateReglement),
    primeReglee: csvRow.primeReglee,
  };
}

export async function findQuoteForCsvRow(
  prisma: PrismaClient,
  csvRow: CsvRow,
) {
  const ref = csvRow.numeroPolice.trim();
  if (ref) {
    const byRef = await prisma.quote.findFirst({
      where: { reference: ref },
      include: { paymentSchedule: { include: { payments: true } } },
    });
    if (byRef) return byRef;
  }

  return findQuoteBySiret(prisma, csvRow.siret);
}

export async function findQuoteBySiret(prisma: PrismaClient, siret: string) {
  const quotes = await prisma.quote.findMany({
    where: {
      paymentSchedule: { some: {} },
    },
    include: {
      paymentSchedule: { include: { payments: true } },
    },
  });

  const matching = quotes.filter((quote) => {
    const companyData = quote.companyData as Record<string, unknown> | null;
    const formData = quote.formData as Record<string, unknown> | null;
    return (
      (companyData && findSiretInData(companyData, siret)) ||
      (formData && findSiretInData(formData, siret))
    );
  });

  if (matching.length === 0) return null;
  return matching[0];
}

type QuoteWithSchedules = NonNullable<
  Awaited<ReturnType<typeof findQuoteForCsvRow>>
>;
type QuoteSchedule = QuoteWithSchedules["paymentSchedule"][number];

type InstallmentMatch = {
  quote: QuoteWithSchedules;
  schedule: QuoteSchedule;
  installment: QuoteSchedule["payments"][number];
  matchMethod: string;
  warnings: string[];
};

export async function findInstallmentForCsvRow(
  prisma: PrismaClient,
  csvRow: CsvRow,
): Promise<InstallmentMatch | null> {
  const warnings: string[] = [];
  const quote = await findQuoteForCsvRow(prisma, csvRow);

  if (!quote?.paymentSchedule?.length) return null;

  const periodStart = csvRow.dateDebutPeriode!;
  const periodEnd = csvRow.dateFinPeriode!;
  const matchingPairs = quote.paymentSchedule.flatMap((schedule) =>
    schedule.payments
      .filter((p) =>
        periodMatches(p.periodStart, p.periodEnd, periodStart, periodEnd),
      )
      .map((installment) => ({ schedule, installment })),
  );

  if (matchingPairs.length === 0) return null;

  const matchingPayments = matchingPairs.map((pair) => pair.installment);

  if (matchingPayments.length === 0) return null;

  let matchMethod = csvRow.numeroPolice
    ? "NUMERO_POLICE + PERIODE"
    : "SIRET + PERIODE";

  if (matchingPayments.length > 1) {
    warnings.push(
      `${matchingPayments.length} échéances en base pour la même période (${formatDateFr(periodStart)} → ${formatDateFr(periodEnd)}) — sélection de la première non payée`,
    );
    matchMethod += " (doublon DB)";
  }

  const unpaid = matchingPayments.filter(
    (p) => p.status !== "PAID" && p.status !== "PARTIALLY_PAID",
  );
  const installment =
    unpaid.sort((a, b) => a.installmentNumber - b.installmentNumber)[0] ??
    matchingPayments.sort((a, b) => a.installmentNumber - b.installmentNumber)[0];
  const schedule =
    matchingPairs.find((pair) => pair.installment.id === installment.id)
      ?.schedule ?? matchingPairs[0].schedule;

  return {
    quote,
    schedule,
    installment,
    matchMethod,
    warnings,
  };
}

/** @deprecated Utiliser findInstallmentForCsvRow */
export async function findInstallmentBySiretAndPeriod(
  prisma: PrismaClient,
  siret: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const found = await findInstallmentForCsvRow(prisma, {
    nomClient: "",
    bordereau: "",
    dateReglement: null,
    primeReglee: 0,
    estPartiel: false,
    avecOuSansCom: "",
    typeSouscription: "",
    periode: "",
    dateDebutPeriode: periodStart,
    dateFinPeriode: periodEnd,
    numeroPolice: "",
    siret,
    primeComDeduite: 0,
    montantRenouvellement: 0,
    montantComCourtier: 0,
    territoire: "",
    courtier: "",
  });
  if (!found) return null;
  return {
    quote: found.quote,
    schedule: found.schedule,
    installment: found.installment,
  };
}

export async function createMissingInstallment(
  tx: Prisma.TransactionClient,
  csvRow: CsvRow,
  quoteId: string,
  adminId: string,
): Promise<{
  scheduleId: string;
  installmentId: string;
  alreadyExisted: boolean;
}> {
  const vintageYear = csvRow.dateDebutPeriode
    ? csvRow.dateDebutPeriode.getFullYear()
    : new Date().getFullYear();
  let schedule = await tx.paymentSchedule.findFirst({
    where: { quoteId, vintageYear },
    include: { payments: true },
    orderBy: { createdAt: "asc" },
  });

  if (!schedule) {
    schedule = await tx.paymentSchedule.create({
      data: {
        quoteId,
        vintageYear,
        totalAmountHT: csvRow.primeReglee,
        totalTaxAmount: 0,
        totalAmountTTC: csvRow.primeReglee,
        startDate: csvRow.dateDebutPeriode!,
        endDate: csvRow.dateFinPeriode!,
        status: csvRow.estPartiel ? "PARTIALLY_PAID" : "PAID",
      },
      include: { payments: true },
    });
  }

  const existing = schedule.payments.find((p) =>
    periodMatches(
      p.periodStart,
      p.periodEnd,
      csvRow.dateDebutPeriode!,
      csvRow.dateFinPeriode!,
    ),
  );

  if (existing) {
    return {
      scheduleId: schedule.id,
      installmentId: existing.id,
      alreadyExisted: true,
    };
  }

  const lastInstallment = await tx.paymentInstallment.findFirst({
    where: { scheduleId: schedule.id },
    orderBy: { installmentNumber: "desc" },
  });
  const nextNumber = (lastInstallment?.installmentNumber ?? 0) + 1;

  const status: PaymentScheduleStatus = csvRow.estPartiel
    ? "PARTIALLY_PAID"
    : "PAID";

  const installment = await tx.paymentInstallment.create({
    data: {
      scheduleId: schedule.id,
      installmentNumber: nextNumber,
      dueDate: csvRow.dateReglement || csvRow.dateDebutPeriode!,
      amountHT: csvRow.primeReglee,
      taxAmount: 0,
      amountTTC: csvRow.primeReglee,
      periodStart: csvRow.dateDebutPeriode!,
      periodEnd: csvRow.dateFinPeriode!,
      status,
      paidAt: csvRow.dateReglement || new Date(),
      paidAmount: csvRow.primeReglee,
      paymentMethod: detectPaymentMethod(csvRow),
      paymentReference: `CSV-${csvRow.bordereau}`,
      validatedById: adminId,
      validatedAt: new Date(),
      adminNotes: `Import CSV - Créé automatiquement - ${csvRow.nomClient} - ${csvRow.courtier}`,
    },
  });

  return {
    scheduleId: schedule.id,
    installmentId: installment.id,
    alreadyExisted: false,
  };
}

function makeResult(
  csvRow: CsvRow,
  rowIndex: number,
  params: {
    success: boolean;
    action: ImportAction;
    message: string;
    details: string;
    created?: boolean;
    quoteReference?: string;
    installmentNumber?: number;
    installmentId?: string;
    matchMethod?: string;
    warnings?: string[];
  },
): ImportResult {
  return {
    ...buildBaseResult(csvRow, rowIndex, params.action),
    success: params.success,
    created: params.created,
    message: params.message,
    details: params.details,
    quoteReference: params.quoteReference,
    installmentNumber: params.installmentNumber,
    installmentId: params.installmentId,
    matchMethod: params.matchMethod,
    warnings: params.warnings ?? [],
  };
}

export async function importPaymentRow(
  prisma: PrismaClient,
  csvRow: CsvRow,
  adminId: string,
  rowIndex: number,
  dryRun: boolean = false,
  options?: { skipDuplicateCsv?: boolean },
): Promise<ImportResult> {
  if (options?.skipDuplicateCsv) {
    return makeResult(csvRow, rowIndex, {
      success: false,
      action: "SKIPPED_DUPLICATE_CSV",
      message: "Ligne en double dans le CSV (même police + SIRET + période)",
      details: `Clé : ${csvRowKey(csvRow)}`,
    });
  }

  const found = await findInstallmentForCsvRow(prisma, csvRow);

  if (!found) {
    const quote = await findQuoteForCsvRow(prisma, csvRow);

    if (!quote) {
      return makeResult(csvRow, rowIndex, {
        success: false,
        action: "ERROR",
        message: `Devis introuvable — police ${csvRow.numeroPolice || "—"}, SIRET ${csvRow.siret}`,
        details: `Client : ${csvRow.nomClient} | Période : ${csvRow.periode}`,
      });
    }

    if (dryRun) {
      return makeResult(csvRow, rowIndex, {
        success: true,
        action: "DRY_RUN_CREATE",
        created: true,
        quoteReference: quote.reference,
        message: `[SIMULATION] Créerait une échéance sur ${quote.reference}`,
        details: `Période ${formatDateFr(csvRow.dateDebutPeriode)} → ${formatDateFr(csvRow.dateFinPeriode)} | ${csvRow.primeReglee.toFixed(2)} € le ${formatDateFr(csvRow.dateReglement)}`,
      });
    }

    const txResult = await prisma.$transaction(async (tx) => {
      const result = await createMissingInstallment(tx, csvRow, quote.id, adminId);

      if (result.alreadyExisted) {
        const inst = await tx.paymentInstallment.findUnique({
          where: { id: result.installmentId },
        });
        if (
          inst &&
          (inst.status === "PAID" || inst.status === "PARTIALLY_PAID")
        ) {
          return { type: "already_paid" as const, inst, result };
        }
        await tx.paymentInstallment.update({
          where: { id: result.installmentId },
          data: {
            status: csvRow.estPartiel ? "PARTIALLY_PAID" : "PAID",
            paidAt: csvRow.dateReglement || new Date(),
            paidAmount: csvRow.primeReglee,
            paymentMethod: detectPaymentMethod(csvRow),
            paymentReference: `CSV-${csvRow.bordereau}`,
            validatedById: adminId,
            validatedAt: new Date(),
            adminNotes: `Import CSV - ${csvRow.nomClient} - ${csvRow.courtier}`,
          },
        });
        await tx.paymentTransaction.create({
          data: {
            installmentId: result.installmentId,
            amount: csvRow.primeReglee,
            method: detectPaymentMethod(csvRow),
            reference: `Import CSV - ${csvRow.bordereau}`,
            validatedById: adminId,
            validatedAt: csvRow.dateReglement || new Date(),
            notes: `Importé depuis CSV (échéance existante réutilisée). Client: ${csvRow.nomClient}`,
          },
        });
        return { type: "updated_existing" as const, inst, result };
      }

      await tx.paymentTransaction.create({
        data: {
          installmentId: result.installmentId,
          amount: csvRow.primeReglee,
          method: detectPaymentMethod(csvRow),
          reference: `Import CSV - ${csvRow.bordereau}`,
          validatedById: adminId,
          validatedAt: csvRow.dateReglement || new Date(),
          notes: `Importé depuis CSV (échéance créée). Client: ${csvRow.nomClient}`,
        },
      });
      return { type: "created" as const, result };
    });

    if (txResult.type === "already_paid" && txResult.inst) {
      return makeResult(csvRow, rowIndex, {
        success: false,
        action: "SKIPPED_ALREADY_PAID",
        quoteReference: quote.reference,
        installmentNumber: txResult.inst.installmentNumber,
        installmentId: txResult.inst.id,
        message: `Échéance déjà payée (évitée création doublon)`,
        details: `Éch. #${txResult.inst.installmentNumber} | Payé le ${formatDateFr(txResult.inst.paidAt)} | ${txResult.inst.paidAmount ?? 0} €`,
        warnings: [
          "Une échéance existait déjà pour cette période — pas de nouvelle ligne créée",
        ],
      });
    }

    if (txResult.type === "updated_existing" && txResult.inst) {
      return makeResult(csvRow, rowIndex, {
        success: true,
        action: "UPDATED",
        quoteReference: quote.reference,
        installmentNumber: txResult.inst.installmentNumber,
        installmentId: txResult.inst.id,
        matchMethod: "PERIODE_EXISTANTE",
        message: `Paiement appliqué sur échéance existante #${txResult.inst.installmentNumber}`,
        details: `${quote.reference} | ${csvRow.primeReglee.toFixed(2)} € le ${formatDateFr(csvRow.dateReglement)}`,
        warnings: [
          "Échéance déjà présente en base pour cette période — mise à jour, pas de doublon",
        ],
      });
    }

    const inst = await prisma.paymentInstallment.findUnique({
      where: { id: txResult.result.installmentId },
    });

    return makeResult(csvRow, rowIndex, {
      success: true,
      action: "CREATED",
      created: true,
      quoteReference: quote.reference,
      installmentNumber: inst?.installmentNumber,
      installmentId: txResult.result.installmentId,
      matchMethod: "NOUVELLE_ECHEANCE",
      message: `Échéance créée et payée sur ${quote.reference}`,
      details: `Éch. #${inst?.installmentNumber ?? "?"} | ${csvRow.primeReglee.toFixed(2)} € le ${formatDateFr(csvRow.dateReglement)}`,
    });
  }

  const { installment, schedule, quote, matchMethod, warnings } = found;

  if (installment.status === "PAID" || installment.status === "PARTIALLY_PAID") {
    return makeResult(csvRow, rowIndex, {
      success: false,
      action: "SKIPPED_ALREADY_PAID",
      quoteReference: quote.reference,
      installmentNumber: installment.installmentNumber,
      installmentId: installment.id,
      matchMethod,
      message: `Déjà payée — éch. #${installment.installmentNumber} sur ${quote.reference}`,
      details: `Payé le ${formatDateFr(installment.paidAt)} | Montant en base : ${installment.paidAmount ?? 0} € | CSV : ${csvRow.primeReglee.toFixed(2)} €`,
      warnings,
    });
  }

  if (dryRun) {
    return makeResult(csvRow, rowIndex, {
      success: true,
      action: "DRY_RUN_UPDATE",
      quoteReference: quote.reference,
      installmentNumber: installment.installmentNumber,
      installmentId: installment.id,
      matchMethod,
      message: `[SIMULATION] Mettrait à jour éch. #${installment.installmentNumber} sur ${quote.reference}`,
      details: `${csvRow.primeReglee.toFixed(2)} € le ${formatDateFr(csvRow.dateReglement)} | Période ${csvRow.periode}`,
      warnings,
    });
  }

  const status: PaymentScheduleStatus = csvRow.estPartiel
    ? "PARTIALLY_PAID"
    : "PAID";

  await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.create({
      data: {
        installmentId: installment.id,
        amount: csvRow.primeReglee,
        method: detectPaymentMethod(csvRow),
        reference: `Import CSV - ${csvRow.bordereau}`,
        validatedById: adminId,
        validatedAt: csvRow.dateReglement || new Date(),
        notes: `Importé depuis CSV. Client: ${csvRow.nomClient}`,
      },
    });

    await tx.paymentInstallment.update({
      where: { id: installment.id },
      data: {
        status,
        paidAt: csvRow.dateReglement || new Date(),
        paidAmount: csvRow.primeReglee,
        paymentMethod: detectPaymentMethod(csvRow),
        paymentReference: `CSV-${csvRow.bordereau}`,
        validatedById: adminId,
        validatedAt: new Date(),
        adminNotes: `Import CSV - ${csvRow.nomClient} - ${csvRow.courtier}`,
      },
    });

    const remainingUnpaid = await tx.paymentInstallment.count({
      where: {
        scheduleId: schedule.id,
        status: { notIn: ["PAID", "PARTIALLY_PAID"] },
      },
    });

    if (remainingUnpaid === 0) {
      await tx.paymentSchedule.update({
        where: { id: schedule.id },
        data: { status: "PAID" },
      });
    }
  });

  return makeResult(csvRow, rowIndex, {
    success: true,
    action: "UPDATED",
    quoteReference: quote.reference,
    installmentNumber: installment.installmentNumber,
    installmentId: installment.id,
    matchMethod,
    message: `Paiement importé — éch. #${installment.installmentNumber} sur ${quote.reference}`,
    details: `${csvRow.primeReglee.toFixed(2)} € le ${formatDateFr(csvRow.dateReglement)} | ${matchMethod}`,
    warnings,
  });
}

export async function importCSV(
  prisma: PrismaClient,
  content: string,
  adminId: string,
  dryRun: boolean = false,
): Promise<{ results: ImportResult[]; stats: ImportStats }> {
  const rows = parseCSV(content);
  const results: ImportResult[] = [];

  const seenKeys = new Map<string, number>();

  let imported = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;
  let duplicateCsv = 0;
  let duplicateDb = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const key = csvRowKey(row);
    const isDuplicateCsv = seenKeys.has(key);
    if (!isDuplicateCsv) {
      seenKeys.set(key, i);
    } else {
      duplicateCsv++;
    }

    const result = await importPaymentRow(prisma, row, adminId, i, dryRun, {
      skipDuplicateCsv: isDuplicateCsv,
    });
    results.push(result);

    if (result.warnings.some((w) => w.includes("doublon DB"))) {
      duplicateDb++;
    }

    switch (result.action) {
      case "UPDATED":
      case "DRY_RUN_UPDATE":
        imported++;
        break;
      case "CREATED":
      case "DRY_RUN_CREATE":
        created++;
        break;
      case "SKIPPED_ALREADY_PAID":
      case "SKIPPED_DUPLICATE_CSV":
      case "SKIPPED_DUPLICATE_DB":
        skipped++;
        break;
      case "ERROR":
        errors++;
        break;
    }
  }

  return {
    results,
    stats: {
      total: rows.length,
      imported,
      created,
      skipped,
      errors,
      duplicateCsv,
      duplicateDb,
    },
  };
}
