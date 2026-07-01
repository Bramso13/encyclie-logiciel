/**
 * Vérifie les montants exportés dans le bordereau (getQuittancesV2) :
 * - Échéancier complet en base : export éch. #1 = export éch. #2 (PJ/FG exclus)
 * - Chaque ligne CSV du mois = montants calculés pour cette échéance en base
 *   (l’éch. #2 n’a pas besoin d’être dans le même mois)
 *
 * Usage :
 *   npm run verify-bordereau-quittances-export -- 2 2026
 *   npm run verify-bordereau-quittances-export -- --year 2026
 *
 * Code de sortie : 0 si OK, 1 si écarts.
 */

import { PrismaClient } from "@prisma/client";
import { getTaxeByRegion } from "@/lib/tarificateurs/rcd";
import {
  getBordereauDateRangeForMonthYear,
  getBordereauDateRangeFromArgs,
} from "@/lib/bordereau/dateRange";
import { loadScriptEnv } from "@/lib/bordereau/loadScriptEnv";
import { getBordereauMonthEvents } from "@/lib/bordereau/bordereauMonthEventsV2";
import { getQuittancesV2 } from "@/lib/bordereau/extractQuittancesV2";
import {
  hasAnnualSupplements,
  type InstallmentAmountFields,
} from "@/lib/bordereau/quittanceAmountsV2";
import {
  countVerificationErrors,
  formatExportVerificationReport,
  verifyCsvRowsMatchScheduleExport,
  verifyScheduleExportEcheance1Vs2,
  type ScheduleContext,
} from "@/lib/bordereau/verifyBordereauExportAlignment";

loadScriptEnv();

const prisma = new PrismaClient();

function mapInstallment(inst: {
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
}): InstallmentAmountFields {
  return {
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
  };
}

function buildScheduleContext(schedule: {
  quote: {
    reference: string | null;
    modifieAlaMain: boolean;
    formData: unknown;
    calculatedPremium: unknown;
    id: string;
  };
  payments: Array<{
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
  }>;
}): ScheduleContext {
  const formData = (schedule.quote.formData ?? {}) as Record<string, unknown>;
  const calculatedPremium = (schedule.quote.calculatedPremium ?? {}) as {
    fraisGestion?: number;
  };
  const region = formData.territory ?? formData.region;
  const tauxTaxeDecimal =
    region != null && typeof region === "string"
      ? getTaxeByRegion(region)
      : null;

  return {
    quoteReference: schedule.quote.reference ?? schedule.quote.id,
    installments: schedule.payments.map(mapInstallment),
    modifieAlaMain: schedule.quote.modifieAlaMain === true,
    tauxTaxeDecimal,
    fraisGestionGlobal: calculatedPremium.fraisGestion ?? null,
    formData,
  };
}

async function verifyMonth(month: number, year: number): Promise<number> {
  const { startDate, endDate, startDateStr, endDateStr, label } =
    getBordereauDateRangeForMonthYear(month, year);
  const filters = { dateRange: { startDate, endDate } };
  const inclusionOptions = { deductPremierEcheanceSupplements: true as const };

  const events = await getBordereauMonthEvents(prisma, filters);
  if (events.length === 0) {
    console.log(`\n## ${label} — aucune ligne bordereau`);
    return 0;
  }

  const scheduleIds = new Set<string>();
  for (const { installment } of events) {
    const scheduleId =
      (installment.scheduleId as string | undefined) ??
      (installment.schedule?.id as string | undefined);
    if (scheduleId) scheduleIds.add(scheduleId);
  }

  const schedules = await prisma.paymentSchedule.findMany({
    where: { id: { in: [...scheduleIds] } },
    include: {
      quote: {
        select: {
          reference: true,
          modifieAlaMain: true,
          formData: true,
          calculatedPremium: true,
          id: true,
        },
      },
      payments: { orderBy: { installmentNumber: "asc" } },
    },
  });

  const schedulesByPolice = new Map<string, ScheduleContext>();
  let schedulesChecked = 0;
  let ech1WithSupplementsChecked = 0;
  const scheduleIssues = [];

  for (const schedule of schedules) {
    const ctx = buildScheduleContext(schedule);
    if (ctx.installments.length === 0) continue;

    schedulesChecked += 1;
    schedulesByPolice.set(ctx.quoteReference, ctx);

    const ech1 = ctx.installments.find((p) => p.installmentNumber === 1);
    if (ech1 && hasAnnualSupplements(ech1)) {
      ech1WithSupplementsChecked += 1;
    }

    scheduleIssues.push(...verifyScheduleExportEcheance1Vs2(ctx));
  }

  const exportedRows = await getQuittancesV2(
    filters,
    prisma,
    inclusionOptions,
  );
  const csvIssues = verifyCsvRowsMatchScheduleExport(
    exportedRows,
    schedulesByPolice,
  );

  console.log(
    formatExportVerificationReport({
      periodLabel: `${label} (${startDateStr} → ${endDateStr})`,
      schedulesChecked,
      ech1WithSupplementsChecked,
      scheduleIssues,
      csvRowsTotal: exportedRows.length,
      csvIssues,
    }),
  );

  return countVerificationErrors(scheduleIssues, csvIssues);
}

async function main() {
  const yearArgIdx = process.argv.indexOf("--year");
  if (yearArgIdx !== -1) {
    const year = parseInt(process.argv[yearArgIdx + 1] ?? "", 10);
    if (Number.isNaN(year)) {
      console.error("Usage: --year 2026");
      process.exit(1);
    }

    let totalErrors = 0;
    console.log(`=== Vérification annuelle ${year} (12 mois) ===`);
    for (let month = 1; month <= 12; month++) {
      totalErrors += await verifyMonth(month, year);
    }
    console.log(`\n=== Total ERREURS sur ${year} : ${totalErrors} ===`);
    if (totalErrors > 0) process.exitCode = 1;
    return;
  }

  const { month, year } = getBordereauDateRangeFromArgs(process.argv);
  const errorCount = await verifyMonth(month, year);

  if (errorCount === 0 && (await getBordereauMonthEvents(prisma, {
    dateRange: getBordereauDateRangeForMonthYear(month, year),
  })).length === 0) {
    console.log(
      `\nAucune ligne bordereau — vérifiez mois/année (ex. --year 2026).`,
    );
  }

  if (errorCount > 0) process.exitCode = 1;
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
