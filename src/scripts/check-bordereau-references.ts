/**
 * Script de diagnostic : pourquoi ces références ne sont pas dans les CSV du bordereau.
 *
 * Raisons possibles (voir docs/bordereau-pourquoi-references-absentes.md) :
 * 1. Devis non accepté (status !== ACCEPTED)
 * 2. Pas d'échéancier (aucun PaymentSchedule)
 * 3. Échéancier vide (aucune PaymentInstallment)
 * 4. Aucune échéance dans la période du filtre (dates des échéances hors plage choisie)
 *
 * Usage : npx tsx src/scripts/check-bordereau-references.ts
 *        ou avec plage de dates : npx tsx src/scripts/check-bordereau-references.ts 2025-01-01 2025-12-31
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REFERENCES_A_VERIFIER = [
  "2025154RCDFID",
  "2024128RCDWAK",
  "202366RCDWAK",
  "202220RCDWAK",
  "202304RCDWAK",
  "2025142RCDWAK",
  "202349RCDWAK",
];

type Reason =
  | "1_DEVIS_NON_ACCEPTE"
  | "2_PAS_ECHÉANCIER"
  | "3_ECHÉANCIER_VIDE"
  | "4_AUCUNE_ECHÉANCE_DANS_LA_PERIODE"
  | "REF_INTROUVABLE"
  | "INCLUS_SI_PERIODE_OK";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const periodStart =
    process.argv[2] != null ? new Date(process.argv[2]) : null;
  const periodEnd = process.argv[3] != null ? new Date(process.argv[3]) : null;
  const hasPeriod = periodStart != null && periodEnd != null;

  console.log("=== Diagnostic références absentes du bordereau ===\n");
  if (hasPeriod) {
    console.log(
      `Période du filtre utilisée : ${formatDate(periodStart!)} → ${formatDate(periodEnd!)}\n`
    );
  } else {
    console.log(
      "Pas de période fournie. Pour raison 4, relancer avec : npx tsx src/scripts/check-bordereau-references.ts YYYY-MM-DD YYYY-MM-DD\n"
    );
  }

  const results: { ref: string; reason: Reason; detail: string }[] = [];

  for (const ref of REFERENCES_A_VERIFIER) {
    const quote = await prisma.quote.findUnique({
      where: { reference: ref },
      include: {
        paymentSchedule: {
          include: {
            payments: {
              orderBy: { installmentNumber: "asc" },
              select: {
                dueDate: true,
                periodStart: true,
                periodEnd: true,
                installmentNumber: true,
              },
            },
          },
        },
      },
    });

    if (!quote) {
      results.push({
        ref,
        reason: "REF_INTROUVABLE",
        detail: "Référence introuvable en base (devis inexistant).",
      });
      continue;
    }

    if (quote.status !== "ACCEPTED") {
      results.push({
        ref,
        reason: "1_DEVIS_NON_ACCEPTE",
        detail: `Statut du devis = ${quote.status}. Seuls les devis ACCEPTED sont inclus.`,
      });
      continue;
    }

    if (!quote.paymentSchedule) {
      results.push({
        ref,
        reason: "2_PAS_ECHÉANCIER",
        detail:
          "Aucun échéancier (PaymentSchedule) lié à ce devis. Créer l'échéancier (ex. depuis l'onglet Prime / paiements).",
      });
      continue;
    }

    const payments = quote.paymentSchedule.payments;
    if (payments.length === 0) {
      results.push({
        ref,
        reason: "3_ECHÉANCIER_VIDE",
        detail:
          "L'échéancier existe mais n'a aucune échéance (PaymentInstallment).",
      });
      continue;
    }

    const minDue = new Date(
      Math.min(...payments.map((p) => p.dueDate.getTime()))
    );
    const maxDue = new Date(
      Math.max(...payments.map((p) => p.dueDate.getTime()))
    );
    const minPeriodStart = new Date(
      Math.min(...payments.map((p) => p.periodStart.getTime()))
    );
    const maxPeriodEnd = new Date(
      Math.max(...payments.map((p) => p.periodEnd.getTime()))
    );

    const inRange = (p: { dueDate: Date; periodStart: Date; periodEnd: Date }) =>
      (p.dueDate >= periodStart! && p.dueDate <= periodEnd!) ||
      (p.periodStart <= periodEnd! && p.periodEnd >= periodStart!);

    if (hasPeriod) {
      const anyInRange = payments.some(inRange);
      if (!anyInRange) {
        results.push({
          ref,
          reason: "4_AUCUNE_ECHÉANCE_DANS_LA_PERIODE",
          detail: `Aucune échéance ne tombe dans la période ${formatDate(periodStart!)} → ${formatDate(periodEnd!)}. Due: ${formatDate(minDue)} → ${formatDate(maxDue)} ; Périodes: ${formatDate(minPeriodStart)} → ${formatDate(maxPeriodEnd)}.`,
        });
      } else {
        results.push({
          ref,
          reason: "INCLUS_SI_PERIODE_OK",
          detail: `Avec cette période, au moins une échéance est dans la plage → la ref devrait apparaître. Si elle est absente, vérifier l’app ou le cache.`,
        });
      }
    } else {
      results.push({
        ref,
        reason: "4_AUCUNE_ECHÉANCE_DANS_LA_PERIODE",
        detail: `Échéances : due ${formatDate(minDue)} → ${formatDate(maxDue)} ; périodes ${formatDate(minPeriodStart)} → ${formatDate(maxPeriodEnd)}. Si la période du bordereau ne chevauche pas → raison 4. Tester avec : npx tsx src/scripts/check-bordereau-references.ts YYYY-MM-DD YYYY-MM-DD`,
      });
    }
  }

  const byReason: Record<Reason, typeof results> = {
    REF_INTROUVABLE: [],
    "1_DEVIS_NON_ACCEPTE": [],
    "2_PAS_ECHÉANCIER": [],
    "3_ECHÉANCIER_VIDE": [],
    "4_AUCUNE_ECHÉANCE_DANS_LA_PERIODE": [],
    INCLUS_SI_PERIODE_OK: [],
  };
  for (const r of results) {
    byReason[r.reason].push(r);
  }

  console.log("--- Par raison ---\n");
  for (const [reason, items] of Object.entries(byReason)) {
    if (items.length === 0) continue;
    console.log(`[${reason}] (${items.length})`);
    for (const { ref, detail } of items) {
      console.log(`  - ${ref}`);
      console.log(`    ${detail}`);
    }
    console.log("");
  }

  console.log("--- Récap ---");
  console.log(
    "1 = Devis non accepté | 2 = Pas d'échéancier | 3 = Échéancier vide | 4 = Aucune échéance dans la période | REF = Introuvable"
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
