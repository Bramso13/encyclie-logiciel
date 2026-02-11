/**
 * Script de mise à jour en masse des devis/contrats à partir d'un fichier TXT.
 *
 * Format attendu (séparateur point-virgule), une ligne = un devis :
 *   refDuDevisActuelle;newRefDevis;newStatut;HTValue;TTCValue;TaxeValue;newContractStatut
 *
 * - refDuDevisActuelle : référence actuelle du devis (ou du contrat)
 * - newRefDevis : nouvelle référence (appliquée au devis ET au contrat si présent)
 * - newStatut : nouveau statut du devis (QuoteStatus)
 * - HTValue : montant HT à appliquer à CHAQUE échéance
 * - TTCValue : montant TTC à appliquer à CHAQUE échéance
 * - TaxeValue : montant taxe à appliquer à CHAQUE échéance
 * - newContractStatut : nouveau statut du contrat si existant (ContractStatus)
 *
 * Si le devis n'a pas d'échéancier, il est créé depuis le calcul de prime (comme dans
 * PremiumCallTab) : d'abord calculatedPremium en base, sinon calcul via calculateWithMapping.
 *
 * Exemple :
 *   RCD-2025-001;RCD-2025-001-BIS;ACCEPTED;1000;1020;20;ACTIVE
 *
 * Usage : npx tsx src/scripts/update-quotes-from-file.ts <chemin_fichier.txt>
 */

import { PrismaClient } from "@prisma/client";
import { calculateWithMapping } from "../lib/utils";

const prisma = new PrismaClient();

const QUOTE_STATUSES = new Set([
  "DRAFT", "INCOMPLETE", "SUBMITTED", "IN_PROGRESS", "COMPLEMENT_REQUIRED",
  "OFFER_READY", "OFFER_SENT", "ACCEPTED", "REJECTED", "EXPIRED",
]);

const CONTRACT_STATUSES = new Set([
  "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED", "PENDING_RENEWAL",
]);

type Row = {
  refActuelle: string;
  newRef: string;
  newStatut: string;
  htValue: number;
  ttcValue: number;
  taxeValue: number;
  newContractStatut: string;
};

const LOG = {
  info: (msg: string, ...args: unknown[]) => console.log(`[INFO]  ${msg}`, ...args),
  ok: (msg: string, ...args: unknown[]) => console.log(`[OK]    ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(`[WARN]  ${msg}`, ...args),
  err: (msg: string, ...args: unknown[]) => console.error(`[ERR]   ${msg}`, ...args),
};

function parseLine(line: string, num: number): Row | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(";").map((p) => p.trim());
  if (parts.length !== 7) {
    LOG.err(`Ligne ${num}: attendu 7 champs séparés par ';', reçu ${parts.length}. Ligne ignorée.`);
    return null;
  }
  const [refActuelle, newRef, newStatut, htStr, ttcStr, taxeStr, newContractStatut] = parts;
  const htValue = parseFloat(htStr.replace(",", "."));
  const ttcValue = parseFloat(ttcStr.replace(",", "."));
  const taxeValue = parseFloat(taxeStr.replace(",", "."));
  if (Number.isNaN(htValue) || Number.isNaN(ttcValue) || Number.isNaN(taxeValue)) {
    LOG.err(`Ligne ${num}: HT/TTC/Taxe doivent être des nombres. Ligne ignorée.`);
    return null;
  }
  if (!QUOTE_STATUSES.has(newStatut)) {
    LOG.err(`Ligne ${num}: statut devis invalide "${newStatut}". Ligne ignorée.`);
    return null;
  }
  if (!CONTRACT_STATUSES.has(newContractStatut)) {
    LOG.err(`Ligne ${num}: statut contrat invalide "${newContractStatut}". Ligne ignorée.`);
    return null;
  }
  return {
    refActuelle,
    newRef,
    newStatut,
    htValue,
    ttcValue,
    taxeValue,
    newContractStatut,
  };
}

type CalculationResult = {
  echeancier?: { echeances?: Array<{ date?: string; debutPeriode?: string; finPeriode?: string; totalHT?: number; taxe?: number; totalTTC?: number; rcd?: number; pj?: number; frais?: number; reprise?: number }> };
  primeTotal?: number;
  totalTTC?: number;
  autres?: { taxeAssurance?: number };
};

/** Parse une date au format DD/MM/YYYY ou ISO. */
function parseDate(s: string | undefined): Date {
  if (!s) return new Date();
  const iso = s.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(s);
  if (iso) return new Date(s);
  const [d, m, y] = (s || "").split("/").map(Number);
  if (d && m && y) return new Date(y, m - 1, d);
  return new Date(s);
}

/** Crée l'échéancier en base à partir du calculationResult (même logique que PremiumCallTab / POST payment-schedule). */
async function createPaymentScheduleFromCalculation(
  quoteId: string,
  calculationResult: CalculationResult,
  _lineNum: number
): Promise<boolean> {
  const echeances = calculationResult?.echeancier?.echeances;
  if (!echeances?.length) return false;

  const totalAmountHT = calculationResult.primeTotal ?? 0;
  const totalTaxAmount = calculationResult.autres?.taxeAssurance ?? 0;
  const totalAmountTTC = calculationResult.totalTTC ?? 0;

  await prisma.paymentSchedule.create({
    data: {
      quoteId,
      totalAmountHT,
      totalTaxAmount,
      totalAmountTTC,
      startDate: parseDate(echeances[0].debutPeriode ?? echeances[0].date),
      endDate: parseDate(echeances[echeances.length - 1].finPeriode ?? echeances[echeances.length - 1].date),
      status: "PENDING",
      payments: {
        create: echeances.map((e: (typeof echeances)[0], index: number) => ({
          installmentNumber: index + 1,
          dueDate: parseDate(e.date ?? e.debutPeriode),
          amountHT: e.totalHT ?? 0,
          taxAmount: e.taxe ?? 0,
          amountTTC: e.totalTTC ?? 0,
          rcdAmount: e.rcd ?? 0,
          pjAmount: e.pj ?? 0,
          feesAmount: e.frais ?? 0,
          resumeAmount: e.reprise ?? 0,
          periodStart: parseDate(e.debutPeriode ?? e.date),
          periodEnd: parseDate(e.finPeriode ?? e.date),
          status: "PENDING",
        })),
      },
    },
  });
  return true;
}

async function processRow(row: Row, lineNum: number): Promise<{ ok: boolean; error?: string }> {
  const { refActuelle, newRef, newStatut, htValue, ttcValue, taxeValue, newContractStatut } = row;

  const quote = await prisma.quote.findFirst({
    where: {
      OR: [
        { reference: refActuelle },
        { contract: { reference: refActuelle } },
      ],
    },
    include: {
      contract: { select: { id: true, reference: true } },
      paymentSchedule: {
        include: { payments: { select: { id: true }, orderBy: { installmentNumber: "asc" } } },
      },
      product: {
        select: { formFields: true, mappingFields: true },
      },
    },
  });

  if (!quote) {
    return { ok: false, error: `Devis ou contrat avec référence "${refActuelle}" introuvable` };
  }

  let schedule = quote.paymentSchedule;
  const needsSchedule = !schedule || !schedule.payments?.length;

  if (needsSchedule) {
    let calculationResult: CalculationResult | null =
      (quote as { calculatedPremium?: CalculationResult }).calculatedPremium as CalculationResult | null;
    if (!calculationResult?.echeancier?.echeances?.length) {
      const product = quote.product as { formFields?: Record<string, unknown>; mappingFields?: Record<string, string> } | null;
      const formFields = product?.formFields ?? {};
      const parameterMapping = (product?.mappingFields ?? {}) as Record<string, string>;
      if (quote.formData && Object.keys(parameterMapping).length > 0) {
        try {
          calculationResult = calculateWithMapping(quote, parameterMapping, formFields) as CalculationResult;
          LOG.info("Ligne %d | Calcul de prime effectué pour créer l'échéancier.", lineNum);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return { ok: false, error: `Impossible de calculer la prime pour créer l'échéancier: ${msg}` };
        }
      }
    }
    if (calculationResult?.echeancier?.echeances?.length) {
      const created = await createPaymentScheduleFromCalculation(quote.id, calculationResult, lineNum);
      if (created) {
        LOG.info("Ligne %d | Échéancier créé à partir du calcul (comme PremiumCallTab).", lineNum);
        const updated = await prisma.quote.findUnique({
          where: { id: quote.id },
          include: {
            paymentSchedule: {
              include: { payments: { select: { id: true }, orderBy: { installmentNumber: "asc" } } },
            },
          },
        });
        schedule = updated?.paymentSchedule ?? schedule;
      }
    }
    if (!schedule?.payments?.length) {
      return {
        ok: false,
        error:
          "Aucun échéancier et impossible d'en créer un (pas de calculatedPremium ni formData/mapping pour calculer).",
      };
    }
  }

  const existingRef = quote.reference;
  if (newRef !== existingRef) {
    const refExists = await prisma.quote.findUnique({ where: { reference: newRef }, select: { id: true } });
    if (refExists) {
      return { ok: false, error: `La nouvelle référence "${newRef}" existe déjà pour un autre devis` };
    }
    if (quote.contract) {
      const contractRefExists = await prisma.insuranceContract.findUnique({
        where: { reference: newRef },
        select: { id: true },
      });
      if (contractRefExists) {
        return { ok: false, error: `La nouvelle référence "${newRef}" existe déjà pour un autre contrat` };
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.quote.update({
      where: { id: quote.id },
      data: { reference: newRef, status: newStatut as "DRAFT" | "INCOMPLETE" | "SUBMITTED" | "IN_PROGRESS" | "COMPLEMENT_REQUIRED" | "OFFER_READY" | "OFFER_SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" },
    });

    if (quote.contract) {
      await tx.insuranceContract.update({
        where: { id: quote.contract!.id },
        data: {
          reference: newRef,
          status: newContractStatut as "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED" | "PENDING_RENEWAL",
        },
      });
    }

    if (schedule?.payments?.length) {
      for (const p of schedule.payments) {
        await tx.paymentInstallment.update({
          where: { id: p.id },
          data: { amountHT: htValue, amountTTC: ttcValue, taxAmount: taxeValue },
        });
      }
    }

    const scheduleId = schedule?.id;
    if (scheduleId) {
      const payments = await tx.paymentInstallment.findMany({
        where: { scheduleId },
        select: { amountHT: true, amountTTC: true, taxAmount: true },
      });
      const totalHT = payments.reduce((s, x) => s + x.amountHT, 0);
      const totalTax = payments.reduce((s, x) => s + x.taxAmount, 0);
      const totalTTC = payments.reduce((s, x) => s + x.amountTTC, 0);
      await tx.paymentSchedule.update({
        where: { id: scheduleId },
        data: { totalAmountHT: totalHT, totalTaxAmount: totalTax, totalAmountTTC: totalTTC },
      });
    }
  });

  return { ok: true };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    LOG.err("Usage: npx tsx src/scripts/update-quotes-from-file.ts <chemin_fichier.txt>");
    process.exit(1);
  }

  const fs = await import("fs");
  const path = await import("path");

  if (!fs.existsSync(filePath)) {
    LOG.err(`Fichier introuvable: ${path.resolve(filePath)}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  LOG.info("Fichier: %s", path.resolve(filePath));
  LOG.info("Lignes lues: %d", lines.length);

  const rows: { lineNum: number; row: Row }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const row = parseLine(lines[i], i + 1);
    if (row) rows.push({ lineNum: i + 1, row });
  }

  if (rows.length === 0) {
    LOG.warn("Aucune ligne valide à traiter.");
    process.exit(0);
  }

  LOG.info("Lignes valides à traiter: %d", rows.length);

  const results: { lineNum: number; ref: string; ok: boolean; error?: string }[] = [];

  for (const { lineNum, row } of rows) {
    try {
      const result = await processRow(row, lineNum);
      results.push({
        lineNum,
        ref: row.refActuelle,
        ok: result.ok,
        error: result.error,
      });
      if (result.ok) {
        LOG.ok("Ligne %d | %s → %s | devis + contrat (si présent) + échéances mis à jour.", lineNum, row.refActuelle, row.newRef);
      } else {
        LOG.err("Ligne %d | %s | %s", lineNum, row.refActuelle, result.error);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      LOG.err("Ligne %d | %s | Exception: %s", lineNum, row.refActuelle, message);
      results.push({ lineNum, ref: row.refActuelle, ok: false, error: message });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  LOG.info("---");
  LOG.info("Résumé: %d succès, %d échec(s), %d ligne(s) ignorée(s) (format invalide).", okCount, failCount, lines.length - rows.length);

  if (failCount > 0) {
    LOG.warn("Échecs:");
    results.filter((r) => !r.ok).forEach((r) => LOG.warn("  Ligne %d | %s | %s", r.lineNum, r.ref, r.error));
  }

  await prisma.$disconnect();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  LOG.err("Erreur fatale: %s", e instanceof Error ? e.message : String(e));
  prisma.$disconnect();
  process.exit(1);
});
