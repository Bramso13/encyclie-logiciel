/**
 * Librairie d'import de paiements depuis CSV
 * Partagée entre le script CLI et l'API web
 */

import { PrismaClient, PaymentScheduleStatus, PaymentMethod, Prisma } from "@prisma/client";

// Type pour une ligne du CSV parsée
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

// Type pour le résultat d'import
export type ImportResult = {
  success: boolean;
  created?: boolean;
  message: string;
  rowIndex: number;
};

// Type pour les statistiques d'import
export type ImportStats = {
  total: number;
  imported: number;
  created: number;
  skipped: number;
  errors: number;
};

/**
 * Parse une ligne CSV en respectant les guillemets
 */
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

/**
 * Parse une date au format M/D/YYYY ou MM/DD/YYYY
 */
function parseCSVDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return null;

  const month = parseInt(parts[0], 10) - 1;
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Parse une période au format "01/01/2026 AU 31/03/2026"
 */
function parsePeriode(periodeStr: string): { debut: Date | null; fin: Date | null } {
  if (!periodeStr) return { debut: null, fin: null };

  const match = periodeStr.match(/(\d{2}\/\d{2}\/\d{4})\s*AU\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (!match) return { debut: null, fin: null };

  const [, debutStr, finStr] = match;

  const parseFrDate = (str: string): Date | null => {
    const parts = str.split("/");
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  };

  return {
    debut: parseFrDate(debutStr),
    fin: parseFrDate(finStr),
  };
}

/**
 * Parse un montant en euros
 */
function parseMontant(montantStr: string): { montant: number; estPartiel: boolean; manquant?: number } {
  if (!montantStr) return { montant: 0, estPartiel: false };

  const str = montantStr.toString().trim();

  // Détecter si c'est un paiement partiel
  const partielMatch = str.match(/([\d\s,\.]+)\s*€?\s*,?\s*manque\s+([\d\s,\.]+)\s*€?/i);
  if (partielMatch) {
    const paye = parseFloat(partielMatch[1].replace(/\s/g, "").replace(",", "."));
    const manquant = parseFloat(partielMatch[2].replace(/\s/g, "").replace(",", "."));
    return {
      montant: isNaN(paye) ? 0 : paye,
      estPartiel: true,
      manquant: isNaN(manquant) ? undefined : manquant,
    };
  }

  // Montant simple
  const cleaned = str
    .replace(/€/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".");

  const parts = cleaned.split(".");
  if (parts.length > 2) {
    const lastPart = parts.pop();
    const montant = parseFloat(parts.join("") + "." + lastPart);
    return { montant: isNaN(montant) ? 0 : montant, estPartiel: false };
  }

  const montant = parseFloat(cleaned);
  return { montant: isNaN(montant) ? 0 : montant, estPartiel: false };
}

/**
 * Extrait le SIREN (9 chiffres) d'un numéro SIRET
 */
export function extractSiren(siret: string): string | null {
  const cleaned = siret.replace(/\s/g, "").replace(/\D/g, "");
  if (cleaned.length >= 9) {
    return cleaned.substring(0, 9);
  }
  return null;
}

/**
 * Vérifie si deux numéros SIRET/SIREN correspondent
 */
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

/**
 * Cherche le SIRET/SIREN dans un objet JSON
 */
function findSiretInData(data: unknown, targetSiret: string): boolean {
  if (!data || typeof data !== "object") return false;

  const targetSiren = extractSiren(targetSiret);
  const fields = ["siret", "siretNumber", "siren", "sirenNumber", "numeroSiret", "siretClient"];

  for (const field of fields) {
    const value = (data as Record<string, unknown>)[field];
    if (typeof value === "string") {
      if (siretsMatch(value, targetSiret)) return true;
      if (targetSiren && siretsMatch(value, targetSiren)) return true;
    }
  }

  return false;
}

/**
 * Parse un fichier CSV complet
 */
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
      numeroPolice: values[7] || "",
      siret: siret,
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

/**
 * Détermine la méthode de paiement
 */
function detectPaymentMethod(_csvRow: CsvRow): PaymentMethod {
  return "OTHER";
}

/**
 * Cherche un devis par SIRET/SIREN
 */
export async function findQuoteBySiret(prisma: PrismaClient, siret: string) {
  const quotes = await prisma.quote.findMany({
    where: {
      paymentSchedule: { isNot: null },
    },
  });

  return quotes.find((quote) => {
    const companyData = quote.companyData as Record<string, unknown> | null;
    const formData = quote.formData as Record<string, unknown> | null;

    const matchCompany = companyData && findSiretInData(companyData, siret);
    const matchForm = formData && findSiretInData(formData, siret);

    return matchCompany || matchForm;
  }) || null;
}

/**
 * Trouve une échéance par SIRET/SIREN et période
 */
export async function findInstallmentBySiretAndPeriod(
  prisma: PrismaClient,
  siret: string,
  periodStart: Date,
  periodEnd: Date
) {
  const quotes = await prisma.quote.findMany({
    where: {
      paymentSchedule: { isNot: null },
    },
    include: {
      paymentSchedule: {
        include: {
          payments: true,
        },
      },
    },
  });

  const matchingQuotes = quotes.filter((quote) => {
    const companyData = quote.companyData as Record<string, unknown> | null;
    const formData = quote.formData as Record<string, unknown> | null;

    const matchCompany = companyData && findSiretInData(companyData, siret);
    const matchForm = formData && findSiretInData(formData, siret);

    return matchCompany || matchForm;
  });

  for (const quote of matchingQuotes) {
    if (!quote.paymentSchedule) continue;

    for (const payment of quote.paymentSchedule.payments) {
      const pStart = new Date(payment.periodStart).setHours(0, 0, 0, 0);
      const pEnd = new Date(payment.periodEnd).setHours(0, 0, 0, 0);
      const targetStart = new Date(periodStart).setHours(0, 0, 0, 0);
      const targetEnd = new Date(periodEnd).setHours(0, 0, 0, 0);

      if (pStart === targetStart && pEnd === targetEnd) {
        return {
          quote,
          schedule: quote.paymentSchedule,
          installment: payment,
        };
      }
    }
  }

  return null;
}

/**
 * Crée une échéance manquante avec son échéancier si nécessaire
 */
export async function createMissingInstallment(
  tx: Prisma.TransactionClient,
  csvRow: CsvRow,
  quoteId: string,
  adminId: string
): Promise<{ scheduleId: string; installmentId: string }> {
  let schedule = await tx.paymentSchedule.findUnique({
    where: { quoteId },
  });

  if (!schedule) {
    schedule = await tx.paymentSchedule.create({
      data: {
        quoteId,
        totalAmountHT: csvRow.primeReglee,
        totalTaxAmount: 0,
        totalAmountTTC: csvRow.primeReglee,
        startDate: csvRow.dateDebutPeriode!,
        endDate: csvRow.dateFinPeriode!,
        status: csvRow.estPartiel ? "PARTIALLY_PAID" : "PAID",
      },
    });
  }

  const lastInstallment = await tx.paymentInstallment.findFirst({
    where: { scheduleId: schedule.id },
    orderBy: { installmentNumber: "desc" },
  });
  const nextNumber = (lastInstallment?.installmentNumber ?? 0) + 1;

  const status: PaymentScheduleStatus = csvRow.estPartiel ? "PARTIALLY_PAID" : "PAID";

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

  return { scheduleId: schedule.id, installmentId: installment.id };
}

/**
 * Importe un paiement depuis une ligne CSV
 */
export async function importPaymentRow(
  prisma: PrismaClient,
  csvRow: CsvRow,
  adminId: string,
  rowIndex: number,
  dryRun: boolean = false
): Promise<ImportResult> {
  const found = await findInstallmentBySiretAndPeriod(
    prisma,
    csvRow.siret,
    csvRow.dateDebutPeriode!,
    csvRow.dateFinPeriode!
  );

  // Si pas trouvé, chercher le quote pour créer l'échéance
  if (!found) {
    const quote = await findQuoteBySiret(prisma, csvRow.siret);

    if (!quote) {
      return {
        success: false,
        rowIndex,
        message: `Devis non trouvé pour SIRET ${csvRow.siret} (client: ${csvRow.nomClient})`,
      };
    }

    if (dryRun) {
      return {
        success: true,
        created: true,
        rowIndex,
        message: `[DRY-RUN] Échéance serait CRÉÉE pour ${quote.reference} - ${csvRow.primeReglee}€`,
      };
    }

    // Créer l'échéance manquante
    const { installmentId } = await prisma.$transaction(async (tx) => {
      const result = await createMissingInstallment(tx, csvRow, quote.id, adminId);

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

      return result;
    });

    return {
      success: true,
      created: true,
      rowIndex,
      message: `Échéance CRÉÉE et paiement importé - ${csvRow.nomClient} - ${csvRow.primeReglee}€`,
    };
  }

  const { installment, schedule } = found;

  // Vérifier si déjà payé
  if (installment.status === "PAID" || installment.status === "PARTIALLY_PAID") {
    return {
      success: false,
      rowIndex,
      message: `Échéance déjà payée (statut: ${installment.status})`,
    };
  }

  const status: PaymentScheduleStatus = csvRow.estPartiel ? "PARTIALLY_PAID" : "PAID";

  const transactionData = {
    installmentId: installment.id,
    amount: csvRow.primeReglee,
    method: detectPaymentMethod(csvRow),
    reference: `Import CSV - ${csvRow.bordereau}`,
    validatedById: adminId,
    validatedAt: csvRow.dateReglement || new Date(),
    notes: `Importé depuis CSV. Client: ${csvRow.nomClient}`,
  };

  const installmentData = {
    status,
    paidAt: csvRow.dateReglement || new Date(),
    paidAmount: csvRow.primeReglee,
    paymentMethod: detectPaymentMethod(csvRow),
    paymentReference: `CSV-${csvRow.bordereau}`,
    validatedById: adminId,
    validatedAt: new Date(),
    adminNotes: `Import CSV - ${csvRow.nomClient} - ${csvRow.courtier}`,
  };

  if (dryRun) {
    return {
      success: true,
      rowIndex,
      message: `[DRY-RUN] Échéance ${installment.id} serait mise à jour - ${csvRow.primeReglee}€`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.create({
      data: transactionData,
    });

    await tx.paymentInstallment.update({
      where: { id: installment.id },
      data: installmentData,
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

  return {
    success: true,
    rowIndex,
    message: `Paiement importé - ${csvRow.nomClient} - ${csvRow.primeReglee}€`,
  };
}

/**
 * Importe toutes les lignes d'un CSV
 */
export async function importCSV(
  prisma: PrismaClient,
  content: string,
  adminId: string,
  dryRun: boolean = false
): Promise<{ results: ImportResult[]; stats: ImportStats }> {
  const rows = parseCSV(content);
  const results: ImportResult[] = [];

  let imported = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const result = await importPaymentRow(prisma, rows[i], adminId, i, dryRun);
    results.push(result);

    if (result.success) {
      if (result.created) {
        created++;
      } else {
        imported++;
      }
    } else if (result.message.includes("déjà payée")) {
      skipped++;
    } else {
      errors++;
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
    },
  };
}
