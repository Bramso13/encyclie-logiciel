/**
 * Vérifie que les 1res échéances annuelles (avec suppléments) des échéanciers
 * présents dans un bordereau produisent les mêmes montants quittances que les
 * échéances suivantes « normales », avec deductPremierEcheanceSupplements = true.
 *
 * Usage :
 *   npx tsx src/scripts/verify-bordereau-premier-echeances.ts
 *   npx tsx src/scripts/verify-bordereau-premier-echeances.ts 6 2025
 *   npx tsx src/scripts/verify-bordereau-premier-echeances.ts 2025-06-01 2025-07-01
 *
 * Code de sortie : 0 si OK, 1 si écarts ou erreur.
 */

import { PrismaClient } from "@prisma/client";
import { getTaxeByRegion } from "@/lib/tarificateurs/rcd";
import { getBordereauDateRangeFromArgs } from "@/lib/bordereau/dateRange";
import { loadScriptEnv } from "@/lib/bordereau/loadScriptEnv";
import { getBordereauMonthEvents } from "@/lib/bordereau/bordereauMonthEventsV2";
import {
  hasAnnualSupplements,
  isPremierPaiementAnnee,
  type InstallmentAmountFields,
} from "@/lib/bordereau/quittanceAmountsV2";
import {
  formatVerificationReport,
  verifySchedulePremierEcheances,
} from "@/lib/bordereau/verifyPremierEcheanceBordereau";

loadScriptEnv();

const prisma = new PrismaClient();

function getDateRangeFromArgs(): { startDate: Date; endDate: Date; label: string } {
  const range = getBordereauDateRangeFromArgs(process.argv);
  return {
    startDate: range.startDate,
    endDate: range.endDate,
    label: `${range.label} (${range.startDateStr} → ${range.endDateStr})`,
  };
}

function mapInstallment(inst: {
  installmentNumber: number;
  periodStart: Date;
  amountHT: number;
  amountTTC: number;
  taxAmount: number;
  rcdAmount: number | null;
  pjAmount: number | null;
  feesAmount: number | null;
  resumeAmount: number | null;
}): InstallmentAmountFields {
  return {
    installmentNumber: inst.installmentNumber,
    periodStart: inst.periodStart,
    amountHT: inst.amountHT,
    amountTTC: inst.amountTTC,
    taxAmount: inst.taxAmount,
    rcdAmount: inst.rcdAmount,
    pjAmount: inst.pjAmount,
    feesAmount: inst.feesAmount,
    resumeAmount: inst.resumeAmount,
  };
}

async function main() {
  const { startDate, endDate, label } = getDateRangeFromArgs();

  const events = await getBordereauMonthEvents(prisma, {
    dateRange: { startDate, endDate },
  });

  const scheduleIds = new Set<string>();
  for (const { installment } of events) {
    const scheduleId =
      (installment.scheduleId as string | undefined) ??
      (installment.schedule?.id as string | undefined);
    if (scheduleId) scheduleIds.add(scheduleId);
  }

  if (scheduleIds.size === 0) {
    console.log(
      formatVerificationReport({
        periodLabel: label,
        schedulesChecked: 0,
        premierEcheancesChecked: 0,
        issues: [],
      }),
    );
    console.log("\nAucun échéancier dans le bordereau pour cette période.");
    return;
  }

  const schedules = await prisma.paymentSchedule.findMany({
    where: { id: { in: [...scheduleIds] } },
    include: {
      quote: { select: { reference: true, modifieAlaMain: true, formData: true } },
      payments: { orderBy: { installmentNumber: "asc" } },
    },
  });

  const allIssues = [];
  let schedulesChecked = 0;
  let premierEcheancesChecked = 0;

  for (const schedule of schedules) {
    const quoteReference = schedule.quote.reference ?? schedule.quoteId;
    const formData = (schedule.quote.formData ?? {}) as Record<string, unknown>;
    const region = formData.territory ?? formData.region;
    const tauxTaxeDecimal =
      region != null && typeof region === "string"
        ? getTaxeByRegion(region)
        : null;

    const installments = schedule.payments.map(mapInstallment);
    if (installments.length === 0) continue;

    schedulesChecked += 1;
    const scheduleRefs = installments.map((p) => ({
      installmentNumber: p.installmentNumber,
      periodStart: p.periodStart,
    }));

    premierEcheancesChecked += installments.filter(
      (inst) =>
        isPremierPaiementAnnee(inst, scheduleRefs) &&
        hasAnnualSupplements(inst),
    ).length;

    allIssues.push(
      ...verifySchedulePremierEcheances({
        quoteReference,
        installments,
        modifieAlaMain: schedule.quote.modifieAlaMain === true,
        tauxTaxeDecimal,
      }),
    );
  }

  console.log(
    formatVerificationReport({
      periodLabel: label,
      schedulesChecked,
      premierEcheancesChecked,
      issues: allIssues,
    }),
  );

  if (allIssues.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
