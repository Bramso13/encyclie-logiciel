/**
 * Script de recalcul et correction des échéances pour les devis non modifiés à la main.
 * Si calculatedPremium est absent, calcule la prime via calculateWithMapping (comme CalculationTab).
 *
 * Usage :
 *   npm run recalcul-echeancier              # dry-run, tous les devis
 *   npm run recalcul-echeancier -- --last    # teste uniquement le dernier devis créé (verbeux)
 *   npm run recalcul-echeancier -- --apply   # applique les corrections
 */

import { PrismaClient } from "@prisma/client";
import { genererEcheancier, getTaxeByRegion } from "@/lib/tarificateurs/rcd";
import { calculateWithMapping } from "@/lib/utils";
import { validateEcheancierInvariants } from "@/lib/tarificateurs/validateEcheancierInvariants";

const prisma = new PrismaClient();

const APPLY = true;
const LAST_ONLY = process.argv.includes("--last");

type FormDataQuote = Record<string, unknown> & {
  dateDeffet?: string;
  dateEffet?: string;
  territory?: string;
  periodicity?: string;
  fractionnementPrime?: string;
};

type CalculatedPremium = {
  primeTotal?: number;
  totalTTC?: number;
  fraisGestion?: number;
  reprisePasseResult?: { primeReprisePasseTTC?: number };
  autres?: {
    taxeAssurance?: number;
    fraisFractionnementPrimeHT?: number;
  };
  autresN1?: {
    taxeAssurance?: number;
    fraisFractionnementPrimeHT?: number;
  };
  primeTotalN1?: number;
  totalTTCN1?: number;
  fraisGestionN1?: number;
};

type Periodicite = "annuel" | "semestriel" | "trimestriel" | "mensuel";

function getDateDeffet(formData: FormDataQuote): string | undefined {
  const d = formData.dateDeffet ?? formData.dateEffet;
  if (typeof d === "string") return d;
  return undefined;
}

function getPeriodicite(formData: FormDataQuote): Periodicite | undefined {
  const raw = String(formData.periodicity ?? formData.fractionnementPrime ?? "").toLowerCase().trim();
  const allowed: Periodicite[] = ["annuel", "semestriel", "trimestriel", "mensuel"];
  if (allowed.includes(raw as Periodicite)) return raw as Periodicite;
  if (raw === "annual" || raw === "annuelle") return "annuel";
  if (raw === "monthly" || raw === "mensuelle") return "mensuel";
  if (raw === "quarterly" || raw === "trimestrielle") return "trimestriel";
  if (raw === "half-yearly" || raw === "semestrielle") return "semestriel";
  return undefined;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function eq(a: number, b: number, tolerance = 0.02): boolean {
  return Math.abs(a - b) <= tolerance;
}

async function main() {
  const whereClause = LAST_ONLY
    ? {
        paymentSchedule: {
          is: { payments: { some: {} } },
        },
      }
    : {
        modifieAlaMain: false,
        paymentSchedule: {
          is: { payments: { some: {} } },
        },
      };

  const quotes = await prisma.quote.findMany({
    where: whereClause,
    include: {
      paymentSchedule: {
        include: {
          payments: {
            orderBy: { installmentNumber: "asc" },
          },
        },
      },
      product: {
        select: { formFields: true, mappingFields: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: LAST_ONLY ? 1 : undefined,
  });

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RECALCUL ÉCHÉANCIER`);
  console.log(`Mode: ${APPLY ? "APPLY" : "dry-run"}${LAST_ONLY ? " | Ciblé: dernier devis créé" : ""}`);
  console.log(`${"=".repeat(60)}\n`);
  console.log(`Devis à analyser : ${quotes.length}`);

  if (quotes.length === 0) {
    console.log("\nAucun devis trouvé avec échéancier.");
    if (LAST_ONLY) {
      console.log("Astuce: créez d'abord un devis avec un échéancier (onglet Prime/paiements).");
    }
    return;
  }

  let nbAvecEcarts = 0;
  const rapports: string[] = [];

  for (const quote of quotes) {
    console.log(`\n--- Devis ${quote.reference} (créé ${quote.createdAt.toISOString()}) ---`);
    const schedule = quote.paymentSchedule;
    if (!schedule?.payments?.length) continue;

    const formData = (quote.formData ?? {}) as FormDataQuote;
    let cp = (quote.calculatedPremium ?? {}) as CalculatedPremium;

    const dateDeffet = getDateDeffet(formData);
    const territory = formData.territory as string | undefined;
    const periodicity = getPeriodicite(formData);

    if (!dateDeffet || !territory || !periodicity) {
      const msg = `[${quote.reference}] Paramètres manquants (dateDeffet/territory/periodicity). Ignoré.`;
      rapports.push(msg);
      console.log(msg);
      continue;
    }

    const tauxTaxe = getTaxeByRegion(territory);
    if (tauxTaxe == null) {
      const msg = `[${quote.reference}] Taux de taxe inconnu pour territoire "${territory}". Ignoré.`;
      rapports.push(msg);
      console.log(msg);
      continue;
    }

    const needsCalculation = cp?.primeTotal == null && cp?.totalTTC == null;
    if (needsCalculation) {
      const product = quote.product as { formFields?: Record<string, unknown>; mappingFields?: Record<string, string> } | null;
      const parameterMapping = (product?.mappingFields ?? {}) as Record<string, string>;
      const formFields = (product?.formFields ?? {}) as Record<string, unknown>;
      if (quote.formData && Object.keys(parameterMapping).length > 0) {
        try {
          const calculationResult = calculateWithMapping(quote, parameterMapping, formFields);
          cp = calculationResult as CalculatedPremium;
          console.log(`  → calculatedPremium manquant : calcul effectué via calculateWithMapping (rcd: ${cp.primeTotal} €)`);
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          const msg = `[${quote.reference}] Impossible de calculer la prime: ${errMsg}`;
          rapports.push(msg);
          console.log(`  ✗ ${msg}`);
          continue;
        }
      } else {
        const msg = `[${quote.reference}] Pas de calculatedPremium ni de product/mapping pour calculer. Ignoré.`;
        rapports.push(msg);
        console.log(msg);
        continue;
      }
    }

    const params = {
      dateDebut: new Date(dateDeffet),
      tauxTaxe,
      taxe: cp.autres?.taxeAssurance ?? 0,
      totalTTC: cp.totalTTC ?? 0,
      rcd: cp.primeTotal ?? 0,
      frais: cp.autres?.fraisFractionnementPrimeHT ?? 0,
      reprise: cp.reprisePasseResult?.primeReprisePasseTTC ?? 0,
      fraisGestion: cp.fraisGestion ?? 0,
      periodicite: periodicity,
      taxeN1: cp.autresN1?.taxeAssurance ?? 0,
      totalTTCN1: cp.totalTTCN1 ?? 0,
      rcdN1: cp.primeTotalN1 ?? 0,
      fraisN1: cp.autresN1?.fraisFractionnementPrimeHT ?? 0,
      fraisGestionN1: cp.fraisGestionN1 ?? 0,
    };

    console.log(`  dateDeffet: ${dateDeffet} | periodicite: ${periodicity} | rcd: ${params.rcd} € | totalTTC: ${params.totalTTC} €`);
    console.log(`  Échéances en base: ${schedule!.payments.length}`);

    try {
      console.log(`  → Appel genererEcheancier...`);
      const echeancier = genererEcheancier(params);

      const echeances = echeancier.echeances;
      const payments = schedule.payments;

      console.log(`  → Recalculé: ${echeances.length} échéance(s)`);

      // Invariants
      const invariants = validateEcheancierInvariants(echeances, {
        rcd: params.rcd,
        taxe: params.taxe,
        frais: params.frais,
        fraisGestion: params.fraisGestion,
        reprise: params.reprise,
        totalTTC: params.totalTTC,
        periodicite: params.periodicite,
      });
      const allOk = invariants.every(r => r.ok);
      console.log(`  Invariants : ${allOk ? "✓ TOUS OK" : "✗ ÉCHEC"}`);
      for (const inv of invariants) {
        console.log(`    ${inv.ok ? "✓" : "✗"} ${inv.nom}: ${inv.detail}`);
      }
      if (!allOk) {
        nbAvecEcarts++;
        rapports.push(`[${quote.reference}] Invariants en échec : ${invariants.filter(r => !r.ok).map(r => r.nom).join(", ")}`);
      }

      if (LAST_ONLY) {
        console.log(`\n  Échéancier rectifié (${echeances.length} échéance(s))`);
        console.log(`  #\tDate\tRCD\tPJ\tFrais\tFG\tReprise\tTotal HT\tTaxe\tTotal TTC`);
        for (let i = 0; i < echeances.length; i++) {
          const e = echeances[i];
          console.log(`  ${i + 1}\t${e.date}\t${round2(e.rcd)}\t${round2(e.pj)}\t${round2(e.frais)}\t${round2(e.fraisGestion)}\t${round2(e.reprise)}\t${round2(e.totalHT)}\t${round2(e.taxe)}\t${round2(e.totalTTC)}`);
        }
        const sHT = echeances.reduce((a, e) => a + e.totalHT, 0);
        const sTaxe = echeances.reduce((a, e) => a + e.taxe, 0);
        const sTTC = echeances.reduce((a, e) => a + e.totalTTC, 0);
        console.log(`  Somme\t\t${round2(sHT)}\t${round2(sTaxe)}\t${round2(sTTC)}\n`);
      }

      if (echeances.length !== payments.length) {
        const msg = `[${quote.reference}] Nb échéances différent : recalculé=${echeances.length}, base=${payments.length} — correction sur les ${Math.min(echeances.length, payments.length)} premières`;
        rapports.push(msg);
        console.log(`  ⚠ ${msg}`);
      }

      const nbComparables = Math.min(echeances.length, payments.length);
      const ecarts: { inst: number; champ: string; base: number; recalc: number }[] = [];

      for (let i = 0; i < nbComparables; i++) {
        const p = payments[i];
        const e = echeances[i];
        const recalcHT = round2(e.totalHT);
        const recalcTaxe = round2(e.taxe);
        const recalcTTC = round2(e.totalTTC);
        const recalcRcd = round2(e.rcd);
        const recalcPj = round2(e.pj);
        const recalcFrais = round2(e.frais);
        const recalcReprise = round2(e.reprise);

        if (!eq(p.amountHT, recalcHT)) ecarts.push({ inst: i + 1, champ: "amountHT", base: p.amountHT, recalc: recalcHT });
        if (!eq(p.taxAmount, recalcTaxe)) ecarts.push({ inst: i + 1, champ: "taxAmount", base: p.taxAmount, recalc: recalcTaxe });
        if (!eq(p.amountTTC, recalcTTC)) ecarts.push({ inst: i + 1, champ: "amountTTC", base: p.amountTTC, recalc: recalcTTC });
        if (!eq(p.rcdAmount ?? 0, recalcRcd)) ecarts.push({ inst: i + 1, champ: "rcdAmount", base: p.rcdAmount ?? 0, recalc: recalcRcd });
        if (!eq(p.pjAmount ?? 0, recalcPj)) ecarts.push({ inst: i + 1, champ: "pjAmount", base: p.pjAmount ?? 0, recalc: recalcPj });
        if (!eq(p.feesAmount ?? 0, recalcFrais)) ecarts.push({ inst: i + 1, champ: "feesAmount", base: p.feesAmount ?? 0, recalc: recalcFrais });
        if (!eq(p.resumeAmount ?? 0, recalcReprise)) ecarts.push({ inst: i + 1, champ: "resumeAmount", base: p.resumeAmount ?? 0, recalc: recalcReprise });
      }

      if (ecarts.length === 0) {
        console.log(`  ✓ OK — Aucun écart (valeurs en base = recalcul)`);
        if (LAST_ONLY) {
          console.log(`  Détail par échéance:`);
          for (let i = 0; i < nbComparables; i++) {
            const p = payments[i];
            const e = echeances[i];
            console.log(`    #${i + 1} | base: HT=${p.amountHT} TTC=${p.amountTTC} | recalc: HT=${round2(e.totalHT)} TTC=${round2(e.totalTTC)}`);
          }
        }
      }

      if (ecarts.length > 0) {
        nbAvecEcarts++;
        let msg = `[${quote.reference}] ${ecarts.length} écart(s) sur ${payments.length} échéance(s) :\n`;
        for (const ec of ecarts) {
          msg += `  Échéance ${ec.inst} | ${ec.champ}: ${ec.base} → ${ec.recalc}\n`;
        }
        rapports.push(msg);
        console.log(`  ⚠ ${ecarts.length} écart(s) détecté(s):`);
        for (const ec of ecarts) {
          console.log(`    Échéance ${ec.inst} | ${ec.champ}: ${ec.base} → ${ec.recalc}`);
        }

        if (APPLY) {
          await prisma.$transaction(async (tx) => {
            for (let i = 0; i < nbComparables; i++) {
              const p = payments[i];
              const e = echeances[i];
              await tx.paymentInstallment.update({
                where: { id: p.id },
                data: {
                  amountHT: round2(e.totalHT),
                  taxAmount: round2(e.taxe),
                  amountTTC: round2(e.totalTTC),
                  rcdAmount: round2(e.rcd),
                  pjAmount: round2(e.pj),
                  feesAmount: round2(e.frais),
                  resumeAmount: round2(e.reprise),
                },
              });
            }
          });
          rapports[rapports.length - 1] += "  → Corrigé en base.\n";
          console.log(`  → Corrigé en base.`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      rapports.push(`[${quote.reference}] Erreur: ${msg}`);
      console.log(`  ✗ Erreur: ${msg}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RÉSUMÉ`);
  console.log(`Devis avec écarts : ${nbAvecEcarts}`);
  if (APPLY && nbAvecEcarts > 0) {
    console.log(`Corrections appliquées.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
