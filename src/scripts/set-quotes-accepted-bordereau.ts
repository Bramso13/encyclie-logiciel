/**
 * Passe les devis listés en statut ACCEPTED pour qu'ils apparaissent dans le bordereau.
 * Pour 2025154RCDFID (déjà accepté mais absent) : fixe acceptedAt si besoin et affiche
 * la plage de dates à utiliser dans le filtre bordereau.
 *
 * Usage : npx tsx src/scripts/set-quotes-accepted-bordereau.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REFS_A_METTRE_ACCEPTED = [
  "2024128RCDWAK",
  "202366RCDWAK",
  "202304RCDWAK",
  "202304RCDWAKV2",
  "202220RCDWAK",
  "2025142RCDWAK",
  "202349RCDWAK",
  "2025151RCDFID",
  "2025152RCDFID",
];

const REF_DEJA_ACCEPTEE_MAIS_ABSENTE = "2025154RCDFID";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log("=== Passage des devis en ACCEPTED pour le bordereau ===\n");

  for (const ref of REFS_A_METTRE_ACCEPTED) {
    const q = await prisma.quote.findUnique({
      where: { reference: ref },
      select: { id: true, status: true },
    });
    if (!q) {
      console.log(`  ${ref} : introuvable, ignoré.`);
      continue;
    }
    if (q.status === "ACCEPTED") {
      console.log(`  ${ref} : déjà ACCEPTED.`);
      continue;
    }
    await prisma.quote.update({
      where: { reference: ref },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });
    console.log(`  ${ref} : mis à jour → ACCEPTED.`);
  }

  console.log("\n--- 2025154RCDFID (devrait apparaître mais absent) ---\n");

  const q154 = await prisma.quote.findUnique({
    where: { reference: REF_DEJA_ACCEPTEE_MAIS_ABSENTE },
    include: {
      paymentSchedule: {
        include: {
          payments: {
            orderBy: { installmentNumber: "asc" },
            select: {
              installmentNumber: true,
              dueDate: true,
              periodStart: true,
              periodEnd: true,
            },
          },
        },
      },
    },
  });

  if (!q154) {
    console.log("  Référence introuvable.");
    return;
  }

  const updates: string[] = [];

  if (q154.status !== "ACCEPTED") {
    await prisma.quote.update({
      where: { reference: REF_DEJA_ACCEPTEE_MAIS_ABSENTE },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    updates.push("statut mis ACCEPTED");
  }
  if (!q154.acceptedAt) {
    await prisma.quote.update({
      where: { reference: REF_DEJA_ACCEPTEE_MAIS_ABSENTE },
      data: { acceptedAt: new Date() },
    });
    updates.push("acceptedAt renseigné");
  }

  if (updates.length > 0) {
    console.log("  Modifications :", updates.join(", "));
  }

  const schedule = q154.paymentSchedule;
  if (!schedule || !schedule.payments.length) {
    console.log(
      "  Pas d'échéancier ou échéancier vide → créer les échéances pour que la ref apparaisse.",
    );
    return;
  }

  const payments = schedule.payments;
  const minDue = formatDate(
    new Date(Math.min(...payments.map((p) => p.dueDate.getTime()))),
  );
  const maxDue = formatDate(
    new Date(Math.max(...payments.map((p) => p.dueDate.getTime()))),
  );
  const minPeriod = formatDate(
    new Date(Math.min(...payments.map((p) => p.periodStart.getTime()))),
  );
  const maxPeriod = formatDate(
    new Date(Math.max(...payments.map((p) => p.periodEnd.getTime()))),
  );

  console.log("  Échéances :");
  for (const p of payments) {
    console.log(
      `    #${p.installmentNumber}  due ${formatDate(p.dueDate)}  période ${formatDate(p.periodStart)} → ${formatDate(p.periodEnd)}`,
    );
  }
  console.log("");
  console.log(
    "  → Dans le bordereau, utilise une période qui couvre au moins :",
  );
  console.log(`     Début période : ${minPeriod} (ou avant)`);
  console.log(`     Fin période   : ${maxPeriod} (ou après)`);
  console.log("");
  console.log(
    "  Si la ref n’apparaît toujours pas, vérifier que les dates du filtre sont bien au format jour (pas uniquement mois) et que la plage inclut les dates ci‑dessus.",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
