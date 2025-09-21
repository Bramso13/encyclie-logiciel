// // // ---------- Types
// type Territory =
//   | "REUNION"
//   | "MAYOTTE"
//   | "MARTINIQUE"
//   | "GUADELOUPE"
//   | "GUYANE"
//   | "ST-MARTIN"
//   | "ST-BARTH";

// type PreviousRcdStatus = "EN_COURS" | "RESILIE" | "JAMAIS";
// type Periodicity = "annuel" | "semestriel" | "trimestriel" | "mensuel";

// type ActivityShare = { code: string; caSharePercent: number };

// type Loss = { year: number; numClaims: number; totalCost: number };

// type ActiDegressivity = {
//   baseRate: number; // taux de base (ex: 0.0407)
//   reducAt500k: number; // réduction au 500k (ex: 0.88 => -12%)
//   thresholdStart: number; // seuil de déclenchement de la dégressivité (souvent ~250k)
//   reducAt1M: number; // réduction au 1M (ex: 0.80 => -20%)
// };

// type Tables = {
//   actiscorByCode: Record<string, ActiDegressivity>;
//   taxByZone: Record<Territory, number>; // ex { REUNION: 0.09, ... }
//   fraisGestionRate: number; // ex 0.03 (3%) — provient de tab_autrescharges (ligne FG)
//   echeanceUnitCost: number; // "coutecheance" (coût d’1 échéance)
//   periodicitySplits: Record<Periodicity, number>; // { annuel:1, semestriel:2, trimestriel:4, mensuel:12 }
//   pminiPlancher: number; // ex 2000
//   plafondPmini: number; // 70_000 (seuil prime mini)
//   plafondCA: number; // 1_000_000 (max autorisé)
//   pjEnabledByDefault?: boolean; // défaut true si tu veux
// };

// type CoeffInput = {
//   hasQualification: boolean; // QUALIBAT/QUALIFELEC
//   creationDateISO: string; // "YYYY-MM-DD"
//   yearsExperience: number; // ex 2.1
//   previousRcdStatus: PreviousRcdStatus;
//   previousResiliationDate?: string | null; // "YYYY-MM-DD"
//   lossHistory: Loss[]; // liste des sinistres
// };

// type ScheduleOptions = {
//   effectiveDateISO: string; // "YYYY-MM-DD" (date d'effet)
//   periodicity: Periodicity; // annuel | semestriel | trimestriel | mensuel
//   includePJ?: boolean; // par défaut: tables.pjEnabledByDefault ?? true
//   repriseDuPasse?: {
//     // si jamais tu l’actives plus tard
//     enabled: boolean;
//     numInstallments?: number; // nb d’échéances pour la reprise
//     ttcAmount?: number; // TTC reprise (si gérée)
//   };
// };

// type PremiumParams = {
//   caDeclared: number;
//   headcountETP: number;
//   activities: ActivityShare[];
//   territory: Territory;
//   subContractingPercent: number;
//   tradingPercent: number;
//   tables: Tables;
//   coeff: CoeffInput;
//   schedule: ScheduleOptions;
// };

// // ---------- Helpers « Excel-like »

// const DAYS_IN_YEAR = 365; // comme dans le VBA
// const PJ_HT = 106; // valeur utilisée dans ton VBA

// function yearOf(d: Date) {
//   return d.getFullYear();
// }
// function monthOf(d: Date) {
//   return d.getMonth() + 1;
// } // 1..12
// function dayOf(d: Date) {
//   return d.getDate();
// }

// function dateSerial(y: number, m: number, d: number): Date {
//   return new Date(y, m - 1, d);
// }

// function daysDiffInclusive(a: Date, b: Date): number {
//   // équivalent du DateDiff("d", a, b) + 1
//   const A = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
//   const B = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
//   return Math.round((B - A) / 86400000) + 1;
// }

// // ---------- Étapes tarif (modules tarif_mod / outils / coeffmajo_mod)

// function computeCAcorrected(
//   caDecl: number,
//   etp: number,
//   seuil = 70_000
// ): number {
//   if (etp <= 0) return caDecl;
//   return caDecl / etp > seuil ? caDecl : etp * seuil;
// }

// function txDeg_2Pentes(
//   x: number,
//   tx0: number,
//   seuil: number,
//   seuilDeg: number,
//   caMax: number,
//   reducAt500k: number,
//   reducAt1M: number
// ): number {
//   // Reprise fidèle de outils.txdeg (>= v7.8) :
//   // palier 1 jusqu’à 500k puis palier 2 jusqu’à 1M
//   const CAmaxdeg1 = 500_000;
//   const CAmaxdeg2 = 1_000_000;

//   if (x <= seuil) return 0; // en-dessous: prime mini
//   if (x > seuil && x <= seuilDeg) return tx0;

//   if (x > seuilDeg && x <= CAmaxdeg1) {
//     const frac = (x - seuilDeg) / (CAmaxdeg1 - seuilDeg);
//     return tx0 * (1 - (1 - reducAt500k) * frac);
//   }

//   if (x > CAmaxdeg1 && x <= CAmaxdeg2) {
//     const reduc =
//       reducAt500k +
//       (reducAt1M - reducAt500k) * ((x - CAmaxdeg1) / (CAmaxdeg2 - CAmaxdeg1));
//     return tx0 * reduc;
//   }

//   if (x > caMax) {
//     // Dans le VBA : message + borne
//     return tx0 * reducAt1M;
//   }
//   return tx0; // garde-fou
// }

// function calcPrimeMini(
//   CA: number,
//   activities: ActivityShare[],
//   tables: Tables
// ): { pmini: number; tauxMoyenBase: number } {
//   const tauxMoyenBase = activities.reduce((acc, a) => {
//     const r = tables.actiscorByCode[a.code];
//     if (!r) throw new Error(`Code activité inconnu: ${a.code}`);
//     return acc + r.baseRate * (a.caSharePercent / 100);
//   }, 0);
//   const pmini = Math.max(
//     tables.pminiPlancher,
//     tauxMoyenBase * tables.plafondPmini
//   );
//   return { pmini, tauxMoyenBase };
// }

// function calcTxMoyAuDela(
//   CA: number,
//   activities: ActivityShare[],
//   tables: Tables
// ): number {
//   if (CA <= tables.plafondPmini) return 0;
//   return activities.reduce((acc, a) => {
//     const p = tables.actiscorByCode[a.code];
//     const tx = txDeg_2Pentes(
//       CA,
//       p.baseRate,
//       tables.plafondPmini,
//       p.thresholdStart,
//       tables.plafondCA,
//       p.reducAt500k,
//       p.reducAt1M
//     );
//     return acc + tx * (a.caSharePercent / 100);
//   }, 0);
// }

// type CoefficientsBreakdown = {
//   qualification: { applied: boolean; value: number; description: string };
//   companyAge: { ageYears: number; value: number; description: string };
//   managerExperience: { yearsExp: number; value: number; description: string };
//   previousRcd: {
//     status: PreviousRcdStatus;
//     value: number;
//     description: string;
//   };
//   lossHistory: { numLosses: number; value: number; description: string };
//   total: number;
// };

// function sumCoefficients(c: CoeffInput): {
//   total: number;
//   breakdown: CoefficientsBreakdown;
// } {
//   let coeff = 0;
//   const breakdown: CoefficientsBreakdown = {
//     qualification: { applied: false, value: 0, description: "" },
//     companyAge: { ageYears: 0, value: 0, description: "" },
//     managerExperience: { yearsExp: 0, value: 0, description: "" },
//     previousRcd: { status: c.previousRcdStatus, value: 0, description: "" },
//     lossHistory: { numLosses: 0, value: 0, description: "" },
//     total: 0,
//   };

//   // a) Qualification
//   if (c.hasQualification) {
//     coeff += -0.05;
//     breakdown.qualification = {
//       applied: true,
//       value: -0.05,
//       description: "Qualification QUALIBAT/QUALIFELEC",
//     };
//   } else {
//     breakdown.qualification = {
//       applied: false,
//       value: 0,
//       description: "Pas de qualification",
//     };
//   }

//   // b) Ancienneté société
//   const ageYears =
//     (Date.now() - parseISO(c.creationDateISO).getTime()) / (365.25 * 86400000);
//   breakdown.companyAge.ageYears = ageYears;

//   if (ageYears < 1) {
//     coeff += +0.2;
//     breakdown.companyAge.value = 0.2;
//     breakdown.companyAge.description = "Société < 1 an";
//   } else if (ageYears < 3) {
//     coeff += +0.1;
//     breakdown.companyAge.value = 0.1;
//     breakdown.companyAge.description = "Société 1-3 ans";
//   } else {
//     breakdown.companyAge.value = 0;
//     breakdown.companyAge.description = "Société ≥ 3 ans";
//   }

//   // c) Expérience dirigeant
//   breakdown.managerExperience.yearsExp = c.yearsExperience;
//   if (c.yearsExperience < 1) {
//     throw new Error("Refus — expérience dirigeant < 1 an");
//   } else if (c.yearsExperience < 3) {
//     coeff += +0.05;
//     breakdown.managerExperience.value = 0.05;
//     breakdown.managerExperience.description = "Expérience dirigeant 1-3 ans";
//   } else if (c.yearsExperience > 5) {
//     coeff += -0.05;
//     breakdown.managerExperience.value = -0.05;
//     breakdown.managerExperience.description = "Expérience dirigeant > 5 ans";
//   } else {
//     breakdown.managerExperience.value = 0;
//     breakdown.managerExperience.description = "Expérience dirigeant 3-5 ans";
//   }

//   // d) Antécédents RCD
//   breakdown.previousRcd.description = `Statut RCD précédent: ${c.previousRcdStatus}`;

//   // e) Sinistralité
//   breakdown.lossHistory.numLosses = c.lossHistory.length;
//   if (c.lossHistory.length > 0) {
//     const totalCost = c.lossHistory.reduce(
//       (sum, loss) => sum + loss.totalCost,
//       0
//     );
//     // Exemple de majoration sinistralité (à adapter selon vos règles)
//     const sinistraCoeff = Math.min(0.3, c.lossHistory.length * 0.1);
//     coeff += sinistraCoeff;
//     breakdown.lossHistory.value = sinistraCoeff;
//     breakdown.lossHistory.description = `${
//       c.lossHistory.length
//     } sinistre(s) - Coût total: ${totalCost.toLocaleString("fr-FR")} €`;
//   } else {
//     breakdown.lossHistory.description = "Aucun sinistre déclaré";
//   }

//   breakdown.total = coeff;
//   return { total: coeff, breakdown };
// }

// // ---------- Taxes & frais (tarif_mod.calcTarif_options)

// function computeHTBase(
//   CA_declared: number,
//   ETP: number,
//   activities: ActivityShare[],
//   tables: Tables,
//   coeffInput: CoeffInput
// ): {
//   CA_total: number;
//   CA_declared: number;
//   ETP: number;
//   pmini: number;
//   tauxMoyenBase: number;
//   txMoyAuDela: number;
//   primeBeforeCoeff: number;
//   primeHT: number; // HT après coefficients
//   coeffTotal: number;
//   coeffBreakdown: CoefficientsBreakdown;
//   isPrimeMinForced: boolean;
//   primeMiniHT_afterCoeff: number;
//   primeAuDelaHT_afterCoeff: number;
//   isAbovePminiThreshold: boolean;
//   caAbovePmini: number;
// } {
//   const CA_total = computeCAcorrected(CA_declared, ETP, 70_000);
//   const { pmini, tauxMoyenBase } = calcPrimeMini(CA_total, activities, tables);
//   const txMoyAuDela = calcTxMoyAuDela(CA_total, activities, tables);

//   const isAbovePminiThreshold = CA_total > tables.plafondPmini;
//   const caAbovePmini = Math.max(0, CA_total - tables.plafondPmini);

//   const primeBeforeCoeff = isAbovePminiThreshold
//     ? pmini + txMoyAuDela * caAbovePmini
//     : pmini;

//   const coeffResult = sumCoefficients(coeffInput);
//   let primeHT = primeBeforeCoeff * (1 + coeffResult.total);
//   let isPrimeMinForced = false;

//   if (primeHT < tables.pminiPlancher) {
//     primeHT = tables.pminiPlancher;
//     isPrimeMinForced = true;
//   }

//   return {
//     CA_total,
//     CA_declared,
//     ETP,
//     pmini,
//     tauxMoyenBase,
//     txMoyAuDela,
//     primeBeforeCoeff,
//     primeHT,
//     coeffTotal: coeffResult.total,
//     coeffBreakdown: coeffResult.breakdown,
//     isPrimeMinForced,
//     primeMiniHT_afterCoeff: pmini * (1 + coeffResult.total),
//     primeAuDelaHT_afterCoeff:
//       (primeBeforeCoeff - pmini) * (1 + coeffResult.total),
//     isAbovePminiThreshold,
//     caAbovePmini,
//   };
// }

// function buildTTCAndExtras(
//   primeHT: number,
//   territory: Territory,
//   tables: Tables,
//   periodicity: Periodicity,
//   includePJ: boolean
// ) {
//   const taxRate = tables.taxByZone[territory] ?? 0;
//   const nEch = tables.periodicitySplits[periodicity];
//   const fraisFract = nEch > 1 ? nEch * (tables.echeanceUnitCost ?? 0) : 0;
//   const fraisGestion = primeHT * (tables.fraisGestionRate ?? 0);

//   // PJ : 106 € HT taxés au même taux (cf. tarif_mod)
//   const pjHT = includePJ ? PJ_HT : 0;
//   const pjTax = pjHT * taxRate;
//   const pjTTC = pjHT + pjTax;

//   // taxe territoriale: assiette = HT + frais de fractionnement (comme dans le VBA)
//   const taxe = (primeHT + fraisFract) * taxRate;

//   const ttc = primeHT + taxe + fraisFract + fraisGestion + pjTTC;

//   return {
//     taxRate,
//     taxe,
//     fraisFract,
//     fraisGestion,
//     pjHT,
//     pjTax,
//     pjTTC,
//     ttc,
//     nEch,
//   };
// }

// // ---------- Échéancier (echeancier_mod) — fidèle mais compact
// // Règles clés reprises :
// //  - Année en cours = prorata jours sur la partie RCD TTC (hors FG et PJ).
// //  - PJ est due à 100% même en année partielle.
// //  - FG au prorata jours.
// //  - Pour l’année N+1, on répartit la partie RCD TTC sur la périodicité choisie.

// type ScheduleLine = {
//   date: string; // ISO
//   rcdHT: number;
//   rcdTax: number;
//   rcdTTC: number;
//   pjHT: number;
//   pjTax: number;
//   pjTTC: number;
//   fraisGestion: number; // HT (pas de taxe dans le VBA)
//   totalTTC: number;
// };

// function splitRcdTTCIntoHTTax(ttc: number, taxRate: number) {
//   const ht = ttc / (1 + taxRate);
//   const tax = ttc - ht;
//   return { ht, tax };
// }

// function buildSchedule(
//   totals: ReturnType<typeof buildTTCAndExtras>,
//   schedule: ScheduleOptions
// ) {
//   const res: ScheduleLine[] = [];

//   const eff = parseISO(schedule.effectiveDateISO);
//   const yr = yearOf(eff);
//   const mo = monthOf(eff);
//   const jr = dayOf(eff);

//   // Parties TTC à ventiler
//   // Prcd = RCD TTC (total – FG – PJ)
//   const Prcd = totals.ttc - totals.fraisGestion - totals.pjTTC;

//   // Année N (partielle) : prorata jours
//   const endOfYear = dateSerial(yr, 12, 31);
//   const njrRestant = daysDiffInclusive(eff, endOfYear);
//   const PRCDpartiel = Prcd * (njrRestant / DAYS_IN_YEAR);
//   const FGpartiel = totals.fraisGestion * (njrRestant / DAYS_IN_YEAR);
//   const PJpartiel = totals.pjTTC; // 100%

//   // 1) Échéancier année N
//   // Répartition conforme à l’esprit du VBA (simple & fidèle) :
//   // - on pose une première ligne à la date d’effet avec PRCDpartiel TTC
//   //   (et on éclate HT/Taxe à partir du taux territorial)
//   {
//     const { ht, tax } = splitRcdTTCIntoHTTax(PRCDpartiel, totals.taxRate);
//     const totalTTC = PRCDpartiel + PJpartiel + FGpartiel;
//     res.push({
//       date: schedule.effectiveDateISO,
//       rcdHT: ht,
//       rcdTax: tax,
//       rcdTTC: PRCDpartiel,
//       pjHT: totals.pjHT,
//       pjTax: totals.pjTax,
//       pjTTC: PJpartiel,
//       fraisGestion: FGpartiel,
//       totalTTC,
//     });
//   }

//   // 2) Échéancier année N+1
//   const yrnext = mo === 1 && jr === 1 ? yr : yr + 1;
//   const nEch = totals.nEch;
//   const partRCD = Prcd; // pleine année
//   const rcdParEch = partRCD / nEch;
//   const { ht: rcdHTparEch, tax: rcdTaxParEch } = splitRcdTTCIntoHTTax(
//     rcdParEch,
//     totals.taxRate
//   );
//   const FGparEch = totals.fraisGestion / nEch;

//   if (schedule.periodicity === "annuel") {
//     const d = dateSerial(yrnext, 1, 1);
//     res.push({
//       date: d.toISOString().slice(0, 10),
//       rcdHT: rcdHTparEch,
//       rcdTax: rcdTaxParEch,
//       rcdTTC: rcdParEch,
//       pjHT: totals.pjHT,
//       pjTax: totals.pjTax,
//       pjTTC: totals.pjTTC,
//       fraisGestion: totals.fraisGestion,
//       totalTTC: rcdParEch + totals.pjTTC + totals.fraisGestion,
//     });
//   } else if (schedule.periodicity === "semestriel") {
//     const d1 = dateSerial(yrnext, 1, 1);
//     const d2 = dateSerial(yrnext, 7, 1);
//     [d1, d2].forEach((d, i) => {
//       const pj = i === 0 ? totals.pjTTC : 0; // PJ au 1er appel, fidèle au code
//       const pjHT = i === 0 ? totals.pjHT : 0;
//       const pjTax = i === 0 ? totals.pjTax : 0;
//       res.push({
//         date: d.toISOString().slice(0, 10),
//         rcdHT: rcdHTparEch,
//         rcdTax: rcdTaxParEch,
//         rcdTTC: rcdParEch,
//         pjHT,
//         pjTax,
//         pjTTC: pj,
//         fraisGestion: FGparEch,
//         totalTTC: rcdParEch + pj + FGparEch,
//       });
//     });
//   } else if (schedule.periodicity === "trimestriel") {
//     for (let k = 0; k < 4; k++) {
//       const d = dateSerial(yrnext, 3 * k + 1, 1);
//       const pj = k === 0 ? totals.pjTTC : 0;
//       const pjHT = k === 0 ? totals.pjHT : 0;
//       const pjTax = k === 0 ? totals.pjTax : 0;
//       res.push({
//         date: d.toISOString().slice(0, 10),
//         rcdHT: rcdHTparEch,
//         rcdTax: rcdTaxParEch,
//         rcdTTC: rcdParEch,
//         pjHT,
//         pjTax,
//         pjTTC: pj,
//         fraisGestion: FGparEch,
//         totalTTC: rcdParEch + pj + FGparEch,
//       });
//     }
//   } else {
//     // mensuel
//     for (let m = 1; m <= 12; m++) {
//       const d = dateSerial(yrnext, m, 1);
//       const pj = m === 1 ? totals.pjTTC : 0;
//       const pjHT = m === 1 ? totals.pjHT : 0;
//       const pjTax = m === 1 ? totals.pjTax : 0;
//       res.push({
//         date: d.toISOString().slice(0, 10),
//         rcdHT: rcdHTparEch,
//         rcdTax: rcdTaxParEch,
//         rcdTTC: rcdParEch,
//         pjHT,
//         pjTax,
//         pjTTC: pj,
//         fraisGestion: FGparEch,
//         totalTTC: rcdParEch + pj + FGparEch,
//       });
//     }
//   }

//   return res;
// }

// // // ---------- API principale

// // export function calculateRcdPremium(params: PremiumParams) {
// //   // 0) Refus « métier »
// //   if (params.subContractingPercent > 15 || params.tradingPercent > 15)
// //     throw new Error("Refus: sous-traitance/négoce > 15%");
// //   if (params.headcountETP > 8) throw new Error("Refus: effectif > 8 ETP");
// //   if (params.caDeclared > params.tables.plafondCA)
// //     throw new Error("Refus: CA > plafond CA");

// //   // 1) Prime HT (base + coeffs)
// //   const base = computeHTBase(
// //     params.caDeclared,
// //     params.headcountETP,
// //     params.activities,
// //     params.tables,
// //     {
// //       hasQualification: params.coeff.hasQualification,
// //       creationDateISO: params.coeff.creationDateISO,
// //       yearsExperience: params.coeff.yearsExperience,
// //       previousRcdStatus: params.coeff.previousRcdStatus,
// //       previousResiliationDate: params.coeff.previousResiliationDate ?? null,
// //       lossHistory: params.coeff.lossHistory,
// //     }
// //   );

// //   // 2) Taxes / Frais / PJ / TTC
// //   const includePJ =
// //     params.schedule.includePJ ?? params.tables.pjEnabledByDefault ?? true;

// //   const totals = buildTTCAndExtras(
// //     base.primeHT,
// //     params.territory,
// //     params.tables,
// //     params.schedule.periodicity,
// //     includePJ
// //   );

// //   // 3) Échéancier (année N partielle + année N+1)
// //   const schedule = buildSchedule(totals, params.schedule);

// //   return {
// //     inputsEcho: params,
// //     baseBreakdown: base,
// //     totals, // taxe, FG, PJ, TTC
// //     schedule, // lignes datées (RCD HT/Tax/TTC, PJ, FG, total TTC)
// //   };
// // }
// // --- util arrondi à l’euro (comme l’Excel affiché)
// const eur = (n: number) => Math.round(n);

// type ActivityRow = {
//   code: string;
//   baseRate: number; // ex 0.0407
//   appliedRate: number; // taux dégressif appliqué à l'activité (au-delà)
//   caSharePercent: number; // part CA de cette activité
//   caShare: number; // montant CA de cette activité
//   reducAt500k: number; // facteur réduction à 500k
//   reducAt1M: number; // facteur réduction à 1M
//   thresholdStart: number; // seuil déclenchement dégressivité
//   weightInTotalBeyondPct: number; // poids % dans le "TOTAL au-delà de Pmini" (avant coeff)
//   primeBeyondHT: number; // prime au-delà HT (avant coeff), par activité
//   degressivityApplied: boolean; // true si dégressivité appliquée
// };

// type ActivityBreakdown = {
//   rows: ActivityRow[];
//   totalBeyondHT_noCoeff: number; // "TOTAL au-delà de Pmini" avant coeff
//   primeMiniAddedHT_noCoeff: number; // "Prime mini ajoutée" (pmini) avant coeff
//   totalWithoutCoeffsHT: number; // total sans majorations/minorations (l. "TOTAL sans majorations/min")
//   withCoeffs: {
//     coeffTotalPct: number; // ex 20 (%)
//     primeMiniHT: number; // pmini * (1 + coeff)
//     primeBeyondHT: number; // totalBeyond * (1 + coeff)
//     totalRcdHT: number; // somme = base RCD HT
//   };
// };

// type RecapLikeExcel = {
//   ttcAnnuelAvecPJ: number; // "TARIF TOTAL TTC € ANNUEL (avec PJ)"
//   baseRcdHT: number; // "dont TARIF de BASE RCD (HT)"
//   coeffTotalPct: number; // "dont majorations"
//   fraisGestionPct: number; // "% sur RCD HT"
//   fraisGestionMontant: number; // "montant €"
//   taxeAssuranceMontant: number;
//   taxeAssuranceTaux: number; // ex 4.5%
//   fraisFractionnementHT: number;
//   nbEcheances: number;
//   protectionJuridiqueTTC: number;
//   totalAutres: number; // taxe + frais fract + PJ
// };

// // === NOUVEAU : détail par activité (comme le tableau)
// function buildActivityBreakdown(
//   CA_total: number,
//   activities: ActivityShare[],
//   tables: Tables,
//   coeffTotal: number,
//   pmini: number
// ): ActivityBreakdown {
//   const beyondBase = Math.max(0, CA_total - tables.plafondPmini);

//   // lignes par activité (avant coeff)
//   const rowsRaw: ActivityRow[] = activities.map((a) => {
//     const p = tables.actiscorByCode[a.code];
//     if (!p) throw new Error(`Code activité inconnu: ${a.code}`);
//     const rateApplied = txDeg_2Pentes(
//       CA_total,
//       p.baseRate,
//       tables.plafondPmini,
//       p.thresholdStart,
//       tables.plafondCA,
//       p.reducAt500k,
//       p.reducAt1M
//     );
//     const primeBeyondHT = beyondBase * rateApplied * (a.caSharePercent / 100);
//     const caShare = CA_total * (a.caSharePercent / 100);
//     const degressivityApplied = CA_total > p.thresholdStart;

//     return {
//       code: a.code,
//       baseRate: p.baseRate,
//       appliedRate: rateApplied,
//       caSharePercent: a.caSharePercent,
//       caShare,
//       reducAt500k: p.reducAt500k,
//       reducAt1M: p.reducAt1M,
//       thresholdStart: p.thresholdStart,
//       weightInTotalBeyondPct: 0, // rempli après
//       primeBeyondHT,
//       degressivityApplied,
//     };
//   });

//   // totaux et poids
//   const totalBeyondHT_noCoeff = rowsRaw.reduce(
//     (s, r) => s + r.primeBeyondHT,
//     0
//   );
//   const rows = rowsRaw.map((r) => ({
//     ...r,
//     weightInTotalBeyondPct:
//       totalBeyondHT_noCoeff > 0
//         ? Math.round((r.primeBeyondHT / totalBeyondHT_noCoeff) * 100)
//         : 0,
//   }));

//   const primeMiniAddedHT_noCoeff = pmini;
//   const totalWithoutCoeffsHT = pmini + totalBeyondHT_noCoeff;

//   // avec coeffs
//   const primeMiniHT = pmini * (1 + coeffTotal);
//   const primeBeyondHT = totalBeyondHT_noCoeff * (1 + coeffTotal);
//   const totalRcdHT = primeMiniHT + primeBeyondHT;

//   return {
//     rows,
//     totalBeyondHT_noCoeff: eur(totalBeyondHT_noCoeff),
//     primeMiniAddedHT_noCoeff: eur(primeMiniAddedHT_noCoeff),
//     totalWithoutCoeffsHT: eur(totalWithoutCoeffsHT),
//     withCoeffs: {
//       coeffTotalPct: Math.round(100 * coeffTotal),
//       primeMiniHT: eur(primeMiniHT),
//       primeBeyondHT: eur(primeBeyondHT),
//       totalRcdHT: eur(totalRcdHT),
//     },
//   };
// }

// // === Tableau détaillé par année (comme Excel)
// type YearlyDetailRow = {
//   annee: number;
//   htRcd: number;
//   taxeRcd: number;
//   ttcRcd: number;
//   htReprise: number;
//   taxeReprise: number;
//   totalReprise: number;
//   htPj: number;
//   taxePj: number;
//   ttcPj: number;
//   htFraisG: number;
//   taxeFraisG: number;
//   ttcFraisG: number;
//   htTotal: number;
//   taxeTotal: number;
//   ttcTotal: number;
// };

// function buildYearlyDetail(
//   schedule: ScheduleLine[],
//   effectiveDateISO: string
// ): YearlyDetailRow[] {
//   const effectiveDate = parseISO(effectiveDateISO);
//   const yearEffective = yearOf(effectiveDate);

//   // Grouper les échéances par année
//   const yearlyTotals: Map<
//     number,
//     {
//       htRcd: number;
//       taxeRcd: number;
//       ttcRcd: number;
//       htPj: number;
//       taxePj: number;
//       ttcPj: number;
//       htFraisG: number;
//       ttcFraisG: number;
//     }
//   > = new Map();

//   schedule.forEach((line) => {
//     const lineDate = parseISO(line.date);
//     const year = yearOf(lineDate);

//     if (!yearlyTotals.has(year)) {
//       yearlyTotals.set(year, {
//         htRcd: 0,
//         taxeRcd: 0,
//         ttcRcd: 0,
//         htPj: 0,
//         taxePj: 0,
//         ttcPj: 0,
//         htFraisG: 0,
//         ttcFraisG: 0,
//       });
//     }

//     const yearData = yearlyTotals.get(year)!;
//     yearData.htRcd += line.rcdHT;
//     yearData.taxeRcd += line.rcdTax;
//     yearData.ttcRcd += line.rcdTTC;
//     yearData.htPj += line.pjHT;
//     yearData.taxePj += line.pjTax;
//     yearData.ttcPj += line.pjTTC;
//     yearData.htFraisG += line.fraisGestion;
//     yearData.ttcFraisG += line.fraisGestion; // Frais gestion pas de taxe dans le VBA
//   });

//   // Convertir en tableau de lignes
//   const result: YearlyDetailRow[] = [];
//   for (const [year, data] of yearlyTotals.entries()) {
//     const htTotal = data.htRcd + data.htPj + data.htFraisG;
//     const taxeTotal = data.taxeRcd + data.taxePj; // pas de taxe sur frais gestion
//     const ttcTotal = data.ttcRcd + data.ttcPj + data.ttcFraisG;

//     result.push({
//       annee: year,
//       htRcd: eur(data.htRcd),
//       taxeRcd: eur(data.taxeRcd),
//       ttcRcd: eur(data.ttcRcd),
//       htReprise: 0, // Pas de reprise du passé dans notre exemple
//       taxeReprise: 0,
//       totalReprise: 0,
//       htPj: eur(data.htPj),
//       taxePj: eur(data.taxePj),
//       ttcPj: eur(data.ttcPj),
//       htFraisG: eur(data.htFraisG),
//       taxeFraisG: 0, // Frais gestion HT (pas de taxe)
//       ttcFraisG: eur(data.ttcFraisG),
//       htTotal: eur(htTotal),
//       taxeTotal: eur(taxeTotal),
//       ttcTotal: eur(ttcTotal),
//     });
//   }

//   // Trier par année
//   result.sort((a, b) => a.annee - b.annee);
//   return result;
// }

// // === Tableau détail par poste (année en cours vs annuel)
// type PrimeDetailRow = {
//   type: "HT" | "taxe" | "TTC";
//   anneeEnCours: {
//     rcd: number;
//     pj: number;
//     totalHorsFG: number;
//     fraisG: number;
//     totalYcFG: number;
//     reprise: number;
//     totalRcdPjFraisReprise: number;
//   };
//   annuel: {
//     rcd: number;
//     pj: number;
//     totalHorsFG: number;
//     fraisG: number;
//     totalYcFG: number;
//     reprise: number;
//     totalRcdPjFraisReprise: number;
//   };
// };

// function buildPrimeDetailByPoste(
//   schedule: ScheduleLine[],
//   totals: ReturnType<typeof buildTTCAndExtras>,
//   effectiveDateISO: string
// ): PrimeDetailRow[] {
//   const effectiveDate = parseISO(effectiveDateISO);
//   const currentYear = yearOf(effectiveDate);

//   // Séparer les échéances par année
//   const currentYearLines = schedule.filter(
//     (line) => yearOf(parseISO(line.date)) === currentYear
//   );
//   const nextYearLines = schedule.filter(
//     (line) => yearOf(parseISO(line.date)) > currentYear
//   );

//   // Calculer les totaux pour l'année en cours
//   const currentYearTotals = currentYearLines.reduce(
//     (acc, line) => ({
//       rcdHT: acc.rcdHT + line.rcdHT,
//       rcdTax: acc.rcdTax + line.rcdTax,
//       rcdTTC: acc.rcdTTC + line.rcdTTC,
//       pjHT: acc.pjHT + line.pjHT,
//       pjTax: acc.pjTax + line.pjTax,
//       pjTTC: acc.pjTTC + line.pjTTC,
//       fraisGestion: acc.fraisGestion + line.fraisGestion,
//     }),
//     {
//       rcdHT: 0,
//       rcdTax: 0,
//       rcdTTC: 0,
//       pjHT: 0,
//       pjTax: 0,
//       pjTTC: 0,
//       fraisGestion: 0,
//     }
//   );

//   // Calculer les totaux pour l'année suivante (annuel)
//   const nextYearTotals = nextYearLines.reduce(
//     (acc, line) => ({
//       rcdHT: acc.rcdHT + line.rcdHT,
//       rcdTax: acc.rcdTax + line.rcdTax,
//       rcdTTC: acc.rcdTTC + line.rcdTTC,
//       pjHT: acc.pjHT + line.pjHT,
//       pjTax: acc.pjTax + line.pjTax,
//       pjTTC: acc.pjTTC + line.pjTTC,
//       fraisGestion: acc.fraisGestion + line.fraisGestion,
//     }),
//     {
//       rcdHT: 0,
//       rcdTax: 0,
//       rcdTTC: 0,
//       pjHT: 0,
//       pjTax: 0,
//       pjTTC: 0,
//       fraisGestion: 0,
//     }
//   );

//   const result: PrimeDetailRow[] = [
//     // Ligne HT
//     {
//       type: "HT",
//       anneeEnCours: {
//         rcd: eur(currentYearTotals.rcdHT),
//         pj: eur(currentYearTotals.pjHT),
//         totalHorsFG: eur(currentYearTotals.rcdHT + currentYearTotals.pjHT),
//         fraisG: eur(currentYearTotals.fraisGestion),
//         totalYcFG: eur(
//           currentYearTotals.rcdHT +
//             currentYearTotals.pjHT +
//             currentYearTotals.fraisGestion
//         ),
//         reprise: 0, // pas de reprise dans notre exemple
//         totalRcdPjFraisReprise: eur(
//           currentYearTotals.rcdHT +
//             currentYearTotals.pjHT +
//             currentYearTotals.fraisGestion
//         ),
//       },
//       annuel: {
//         rcd: eur(nextYearTotals.rcdHT),
//         pj: eur(nextYearTotals.pjHT),
//         totalHorsFG: eur(nextYearTotals.rcdHT + nextYearTotals.pjHT),
//         fraisG: eur(nextYearTotals.fraisGestion),
//         totalYcFG: eur(
//           nextYearTotals.rcdHT +
//             nextYearTotals.pjHT +
//             nextYearTotals.fraisGestion
//         ),
//         reprise: 0,
//         totalRcdPjFraisReprise: eur(
//           nextYearTotals.rcdHT +
//             nextYearTotals.pjHT +
//             nextYearTotals.fraisGestion
//         ),
//       },
//     },
//     // Ligne taxe
//     {
//       type: "taxe",
//       anneeEnCours: {
//         rcd: eur(currentYearTotals.rcdTax),
//         pj: eur(currentYearTotals.pjTax),
//         totalHorsFG: eur(currentYearTotals.rcdTax + currentYearTotals.pjTax),
//         fraisG: 0, // pas de taxe sur frais gestion
//         totalYcFG: eur(currentYearTotals.rcdTax + currentYearTotals.pjTax),
//         reprise: 0,
//         totalRcdPjFraisReprise: eur(
//           currentYearTotals.rcdTax + currentYearTotals.pjTax
//         ),
//       },
//       annuel: {
//         rcd: eur(nextYearTotals.rcdTax),
//         pj: eur(nextYearTotals.pjTax),
//         totalHorsFG: eur(nextYearTotals.rcdTax + nextYearTotals.pjTax),
//         fraisG: 0,
//         totalYcFG: eur(nextYearTotals.rcdTax + nextYearTotals.pjTax),
//         reprise: 0,
//         totalRcdPjFraisReprise: eur(
//           nextYearTotals.rcdTax + nextYearTotals.pjTax
//         ),
//       },
//     },
//     // Ligne TTC
//     {
//       type: "TTC",
//       anneeEnCours: {
//         rcd: eur(currentYearTotals.rcdTTC),
//         pj: eur(currentYearTotals.pjTTC),
//         totalHorsFG: eur(currentYearTotals.rcdTTC + currentYearTotals.pjTTC),
//         fraisG: eur(currentYearTotals.fraisGestion),
//         totalYcFG: eur(
//           currentYearTotals.rcdTTC +
//             currentYearTotals.pjTTC +
//             currentYearTotals.fraisGestion
//         ),
//         reprise: 0,
//         totalRcdPjFraisReprise: eur(
//           currentYearTotals.rcdTTC +
//             currentYearTotals.pjTTC +
//             currentYearTotals.fraisGestion
//         ),
//       },
//       annuel: {
//         rcd: eur(nextYearTotals.rcdTTC),
//         pj: eur(nextYearTotals.pjTTC),
//         totalHorsFG: eur(nextYearTotals.rcdTTC + nextYearTotals.pjTTC),
//         fraisG: eur(nextYearTotals.fraisGestion),
//         totalYcFG: eur(
//           nextYearTotals.rcdTTC +
//             nextYearTotals.pjTTC +
//             nextYearTotals.fraisGestion
//         ),
//         reprise: 0,
//         totalRcdPjFraisReprise: eur(
//           nextYearTotals.rcdTTC +
//             nextYearTotals.pjTTC +
//             nextYearTotals.fraisGestion
//         ),
//       },
//     },
//   ];

//   return result;
// }

// // === on enrichit la fonction principale avec ces sorties
// export function calculateRcdPremium(params: PremiumParams) {
//   if (params.subContractingPercent > 15 || params.tradingPercent > 15)
//     throw new Error("Refus: sous-traitance/négoce > 15%");
//   if (params.headcountETP > 8) throw new Error("Refus: effectif > 8 ETP");
//   if (params.caDeclared > params.tables.plafondCA)
//     throw new Error("Refus: CA > plafond CA");

//   // 1) Prime HT (base + coeffs)
//   const base = computeHTBase(
//     params.caDeclared,
//     params.headcountETP,
//     params.activities,
//     params.tables,
//     {
//       hasQualification: params.coeff.hasQualification,
//       creationDateISO: params.coeff.creationDateISO,
//       yearsExperience: params.coeff.yearsExperience,
//       previousRcdStatus: params.coeff.previousRcdStatus,
//       previousResiliationDate: params.coeff.previousResiliationDate ?? null,
//       lossHistory: params.coeff.lossHistory,
//     }
//   );

//   // 1bis) Détail par activité (tableaux)
//   const activityBreakdown = buildActivityBreakdown(
//     base.CA_total,
//     params.activities,
//     params.tables,
//     base.coeffTotal,
//     base.pmini
//   );

//   // 2) Taxes / Frais / PJ / TTC
//   const includePJ =
//     params.schedule.includePJ ?? params.tables.pjEnabledByDefault ?? true;
//   const totals = buildTTCAndExtras(
//     base.primeHT,
//     params.territory,
//     params.tables,
//     params.schedule.periodicity,
//     includePJ
//   );

//   // 3) Échéancier
//   const schedule = buildSchedule(totals, params.schedule);

//   // 3bis) Tableau détaillé par année
//   const yearlyDetail = buildYearlyDetail(
//     schedule,
//     params.schedule.effectiveDateISO
//   );

//   // 3ter) Tableau prime détail par poste
//   const primeDetailByPoste = buildPrimeDetailByPoste(
//     schedule,
//     totals,
//     params.schedule.effectiveDateISO
//   );

//   // 4) Récap “façon Excel”
//   const recap: RecapLikeExcel = {
//     ttcAnnuelAvecPJ: eur(totals.ttc),
//     baseRcdHT: eur(base.primeHT),
//     coeffTotalPct: Math.round(100 * base.coeffTotal),
//     fraisGestionPct: Math.round(100 * (params.tables.fraisGestionRate ?? 0)),
//     fraisGestionMontant: eur(totals.fraisGestion),
//     taxeAssuranceMontant: eur(totals.taxe),
//     taxeAssuranceTaux: Math.round(1000 * (totals.taxRate ?? 0)) / 10, // ex 0.045 -> 4.5
//     fraisFractionnementHT: eur(totals.fraisFract),
//     nbEcheances: totals.nEch,
//     protectionJuridiqueTTC: eur(totals.pjTTC),
//     totalAutres: eur(totals.taxe + totals.fraisFract + totals.pjTTC),
//   };

//   // Calculs additionnels pour l'affichage
//   const effectiveDate = parseISO(params.schedule.effectiveDateISO);
//   const daysRemainingInYear = daysDiffInclusive(
//     effectiveDate,
//     dateSerial(yearOf(effectiveDate), 12, 31)
//   );
//   const daysInYear = DAYS_IN_YEAR;

//   return {
//     // Données d'entrée
//     inputsEcho: params,

//     // Analyse du CA
//     caAnalysis: {
//       caDeclared: base.CA_declared,
//       caPerETP: base.ETP > 0 ? base.CA_declared / base.ETP : 0,
//       caCorrected: base.CA_total,
//       correctionApplied: base.CA_total !== base.CA_declared,
//       etpCount: base.ETP,
//       isAbovePminiThreshold: base.isAbovePminiThreshold,
//       caAbovePmini: base.caAbovePmini,
//       pminiThreshold: params.tables.plafondPmini,
//     },

//     // Détail complet du calcul de base
//     baseBreakdown: {
//       ...base,
//       // versions arrondies utiles pour affichage
//       primeHT_rounded: eur(base.primeHT),
//       primeMini_afterCoeff_rounded: eur(base.primeMiniHT_afterCoeff),
//       primeBeyond_afterCoeff_rounded: eur(base.primeAuDelaHT_afterCoeff),
//       primeBeforeCoeff_rounded: eur(base.primeBeforeCoeff),
//       tauxMoyenBase_percent: Math.round(base.tauxMoyenBase * 10000) / 100, // en %
//       txMoyAuDela_percent: Math.round(base.txMoyAuDela * 10000) / 100, // en %
//     },

//     // Détail par activité enrichi
//     activityBreakdown,

//     // Détail des coefficients
//     coefficientsDetail: base.coeffBreakdown,

//     // Récapitulatif façon Excel
//     recapLikeExcel: recap,

//     // Détail taxes et frais
//     taxesAndFees: {
//       taxes: {
//         rate: totals.taxRate,
//         amount: totals.taxe,
//         territory: params.territory,
//       },
//       fees: {
//         managementFeeRate: params.tables.fraisGestionRate ?? 0,
//         managementFeeAmount: totals.fraisGestion,
//         installmentCount: totals.nEch,
//         installmentFeesHT: totals.fraisFract,
//         unitCostPerInstallment: params.tables.echeanceUnitCost,
//       },
//       ...totals,
//       taxRate_percent: Math.round(totals.taxRate * 1000) / 10, // ex: 4.5%
//       fraisGestionRate_percent:
//         Math.round((params.tables.fraisGestionRate ?? 0) * 1000) / 10,
//       pjIncluded: includePJ,
//       pjRate_percent: includePJ
//         ? Math.round((PJ_HT / base.primeHT) * 1000) / 10
//         : 0,
//     },

//     // Analyse temporelle
//     scheduleAnalysis: {
//       effectiveDate: params.schedule.effectiveDateISO,
//       periodicity: params.schedule.periodicity,
//       nbEcheances: totals.nEch,
//       daysRemainingInYear,
//       daysInYear,
//       prorataFirstYear:
//         Math.round((daysRemainingInYear / daysInYear) * 1000) / 10, // en %
//       pjIncluded: includePJ,
//       pjAnnualPremiumTTC: totals.pjTTC,
//       totalAnnualHT: base.primeHT + totals.fraisFract,
//       totalAnnualTTC: totals.ttc,
//       averageInstallmentTTC: totals.ttc / totals.nEch,
//       schedule, // échéancier complet
//     },

//     // Méta-informations
//     calculationMeta: {
//       timestamp: new Date().toISOString(),
//       activitiesCount: params.activities.length,
//       activityCodes: params.activities.map((a) => a.code),
//       hasSubcontracting: params.subContractingPercent > 0,
//       hasTrading: params.tradingPercent > 0,
//       caCorrectionApplied: base.CA_total !== base.CA_declared,
//       isAbovePminiThreshold: base.isAbovePminiThreshold,
//       rulesApplied: {
//         caCorrection: base.CA_total !== base.CA_declared,
//         primeMinForced: base.isPrimeMinForced,
//         degressivityApplied: activityBreakdown.rows.some(
//           (r) => r.degressivityApplied
//         ),
//         coefficientsApplied: Math.abs(base.coeffTotal) > 0.001,
//         pjIncluded: includePJ,
//       },
//       limits: {
//         pminiPlancher: params.tables.pminiPlancher,
//         plafondPmini: params.tables.plafondPmini,
//         plafondCA: params.tables.plafondCA,
//         maxETP: 8,
//         maxSubcontracting: 15,
//         maxTrading: 15,
//       },
//       territory: params.territory,
//     },

//     // Tableau détaillé par année
//     yearlyDetail,

//     // Tableau prime détail par poste
//     primeDetailByPoste,

//     // Totaux et échéancier pour compatibilité
//     totals,
//     schedule,
//   };
// }

function parseISO(d: string): Date {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) throw new Error(`Date invalide: ${d}`);
  return dt;
}

type ReturnValueRefus = {
  experienceDirigeant: boolean;
  sansAssuranceDepuisPlusDe12Mois: boolean;
  partSoutraitance: boolean;
  partNegoce: boolean;
};

function verifRefus(params: {
  experienceDirigeant: number;

  tempsSansActivite: Enum_Temps_sans_activite;
  partSoutraitance: number;
  partNegoce: number;
}) {
  const {
    experienceDirigeant,
    tempsSansActivite,
    partSoutraitance,
    partNegoce,
  } = params;
  const returnValue: ReturnValueRefus = {
    experienceDirigeant: false,
    sansAssuranceDepuisPlusDe12Mois: false,
    partSoutraitance: false,
    partNegoce: false,
  };

  returnValue.experienceDirigeant = experienceDirigeant < 1;
  returnValue.sansAssuranceDepuisPlusDe12Mois =
    tempsSansActivite === "PLUS_DE_12_MOIS";
  returnValue.partSoutraitance =
    partSoutraitance > 1
      ? partSoutraitance / 100 > 0.15
      : partSoutraitance > 0.15;
  returnValue.partNegoce =
    partNegoce > 1 ? partNegoce / 100 > 0.15 : partNegoce > 0.15;
  return returnValue;
}

type Enum_Temps_sans_activite =
  | "PLUS_DE_12_MOIS"
  | "DE 6_A 12_MOIS"
  | "NON"
  | "CREATION";
function calculateMajorations(params: {
  enCreation: boolean;
  etp: number;
  nbActivites: number;
  qualif: boolean;
  dateCreation: Date;
  nonFournitureBilanN_1: boolean;
  anneeExperience: number;
  assureurDefaillant: boolean;
  nombreAnneeAssuranceContinue: number;
  tempsSansActivite: Enum_Temps_sans_activite;

  sansActiviteDepuisPlusDe12MoisSansFermeture: "OUI" | "NON" | "CREATION";
  absenceDeSinistreSurLes5DernieresAnnees:
    | "OUI"
    | "NON"
    | "CREATION"
    | "ASSUREUR_DEFAILLANT"
    | "A_DEFINIR";
}) {
  const {
    enCreation,
    etp,
    nbActivites,
    qualif,
    dateCreation,
    tempsSansActivite,
    anneeExperience,
    assureurDefaillant,
    nombreAnneeAssuranceContinue,
    nonFournitureBilanN_1,
    sansActiviteDepuisPlusDe12MoisSansFermeture,
    absenceDeSinistreSurLes5DernieresAnnees,
  } = params;
  const calculMajTempsSansActivite = (
    tempsSansActivite: Enum_Temps_sans_activite
  ) => {
    console.log("tempsSansActivite", tempsSansActivite);
    if (tempsSansActivite === "DE 6_A 12_MOIS") return 0.3;
    if (tempsSansActivite === "NON") return 0;
    if (tempsSansActivite === "CREATION") return 0;
  };

  const calculMajETP = (etp: number, nbActivites: number) => {
    if (etp === 1) {
      if (nbActivites <= 3) return 0;
      if (nbActivites > 3 && nbActivites <= 5) return 0.1;
    }
    if (etp > 1 && etp < 5) {
      if (nbActivites <= 5) return 0;
      if (nbActivites > 5 && nbActivites <= 8) return 0.1;
    }
    if (etp >= 6 && etp <= 8) return 0;
  };
  const calculMajAnciennete = (dateCreation: Date) => {
    const today = new Date();
    const diffMs = today.getTime() - dateCreation.getTime();
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    if (diffYears < 1) return 0.2;
    if (diffYears > 1 && diffYears < 3) return 0.1;
    return 0;
  };
  const calculMajExp = (anneeExperience: number) => {
    if (anneeExperience > 1 && anneeExperience < 3) return 0.05;
    if (anneeExperience > 3 && anneeExperience < 5) return 0;
    if (anneeExperience >= 5) return -0.05;
  };
  const calculMajNAAC = (NAAC: number) => {
    if (NAAC <= 1) return 0.1;
    if (NAAC > 1 && NAAC <= 2) return 0.05;
    return 0;
  };
  const majorations = {
    etp: calculMajETP(etp, nbActivites),
    qualif: qualif ? -0.05 : 0,
    dateCreation: calculMajAnciennete(dateCreation),
    tempsSansActivite: calculMajTempsSansActivite(tempsSansActivite),
    anneeExperience: calculMajExp(anneeExperience),
    assureurDefaillant:
      !enCreation &&
      assureurDefaillant &&
      !(absenceDeSinistreSurLes5DernieresAnnees === "ASSUREUR_DEFAILLANT")
        ? 0.2
        : 0,
    nombreAnneeAssuranceContinue: enCreation
      ? 0
      : calculMajNAAC(nombreAnneeAssuranceContinue),
    nonFournitureBilanN_1: enCreation ? 0 : nonFournitureBilanN_1 ? 0.5 : 0,
    sansActiviteDepuisPlusDe12MoisSansFermeture:
      sansActiviteDepuisPlusDe12MoisSansFermeture === "OUI" ? 0.2 : 0,
    absenceDeSinistreSurLes5DernieresAnnees:
      absenceDeSinistreSurLes5DernieresAnnees === "ASSUREUR_DEFAILLANT"
        ? 0.2
        : 0,
  };

  return majorations;
}
export const tableauTax = [
  { code: 1, title: "Voiries Réseaux Divers (VRD)", rate: 0.0382 },
  { code: 2, title: "Maçonnerie et béton armé", rate: 0.0407 },
  { code: 3, title: "Charpente et structure en bois", rate: 0.0439 },
  { code: 4, title: "Charpente et structure métallique", rate: 0.0439 },
  { code: 5, title: "Couverture", rate: 0.0366 },
  { code: 6, title: "Menuiseries extérieures bois et PVC", rate: 0.0357 },
  { code: 7, title: "Menuiseries extérieures métalliques", rate: 0.0357 },
  { code: 8, title: "Bardages de façades", rate: 0.0379 },
  { code: 9, title: "Menuiseries intérieures", rate: 0.0343 },
  { code: 10, title: "Plâtrerie – Staff – Stuc – Gypserie", rate: 0.0416 },
  { code: 11, title: "Serrurerie - Métallerie", rate: 0.0256 },
  { code: 12, title: "Vitrerie - Miroiterie", rate: 0.0253 },
  { code: 13, title: "Peinture", rate: 0.0296 },
  {
    code: 14,
    title: "Revêtement intérieur de surfaces en matériaux souples et parquets",
    rate: 0.0227,
  },
  {
    code: 15,
    title: "Revêtement de surfaces en matériaux durs - Chapes et sols coulés",
    rate: 0.0361,
  },
  { code: 16, title: "Isolation thermique et acoustique", rate: 0.0251 },
  { code: 17, title: "Plomberie", rate: 0.0293 },
  {
    code: 18,
    title: "Installations thermiques de génie climatique",
    rate: 0.0293,
  },
  {
    code: 19,
    title: "Installations d'aéraulique et de conditionnement d'air",
    rate: 0.0293,
  },
  { code: 20, title: "Electricité -Télécommunications", rate: 0.0298 },
];
const tableauDegAvant = [
  {
    code: 1,
    title: "Voiries Réseaux Divers (VRD)",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 2,
    title: "Maçonnerie et béton armé",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 3,
    title: "Charpente et structure en bois",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 4,
    title: "Charpente et structure métallique",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 5,
    title: "Couverture",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 6,
    title: "Menuiseries extérieures bois et PVC",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 7,
    title: "Menuiseries extérieures métalliques",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 8,
    title: "Bardages de façades",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 9,
    title: "Menuiseries intérieures",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 10,
    title: "Plâtrerie – Staff – Stuc – Gypserie",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 11,
    title: "Serrurerie - Métallerie",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 12,
    title: "Vitrerie - Miroiterie",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 13,
    title: "Peinture",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 14,
    title: "Revêtement intérieur de surfaces en matériaux souples et parquets",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 15,
    title: "Revêtement de surfaces en matériaux durs - Chapes et sols coulés",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 16,
    title: "Isolation thermique et acoustique",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 17,
    title: "Plomberie",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 18,
    title: "Installations thermiques de génie climatique",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 19,
    title: "Installations d'aéraulique et de conditionnement d'air",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 20,
    title: "Electricité -Télécommunications",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
];
// Tableau des assureurs défaillants
const assureursDefaillants = [
  "ACASTA",
  "ALPHA_INSURANCE",
  "CBL",
  "EIL",
  "ELITE",
  "GABLE",
  "QUDOS",
];

const calculDeg = (params: {
  caDeclared: number;
  tableauDeg: {
    code: number;
    title: string;
    type: string;
    degressivity1: number;
    degressivity2: number;
  }[];
}) => {
  // 0.982
  const { caDeclared, tableauDeg } = params;

  console.log("caCalculee", caDeclared);

  const resultValue: {
    code: number;
    title: string;
    type: string;
    degressivity: number;
  }[] = [];
  tableauDeg.forEach((deg) => {
    if (caDeclared > 250_000 && caDeclared < 500_000) {
      console.log("caDeclared", caDeclared);
      const degMax =
        1 - ((1 - deg.degressivity1) * (caDeclared - 250_000)) / 250_000;
      resultValue.push({
        code: deg.code,
        title: deg.title,
        type: "CA",
        degressivity: degMax,
      });
    }
    if (caDeclared > 500_000 && caDeclared < 1_000_000) {
      const degMax =
        deg.degressivity1 -
        ((deg.degressivity1 - deg.degressivity2) * (caDeclared - 500_000)) /
          500_000;
      resultValue.push({
        code: deg.code,
        title: deg.title,
        type: "CA",
        degressivity: degMax,
      });
    }
    if (caDeclared > 70_000 && caDeclared <= 250_000) {
      resultValue.push({
        code: deg.code,
        title: deg.title,
        type: "CA",
        degressivity: deg.degressivity1,
      });
    }
  });
  return resultValue;
};
export function getTaxeByRegion(region: string) {
  const regionRea = region.toLowerCase().replace(" ", "-");
  console.log("regionRea", regionRea);
  const taxeByRegion: { [key: string]: number } = {
    martinique: 0.09,
    guadeloupe: 0.09,
    reunion: 0.09,
    guyane: 0.09,
    mayotte: 0.045,
    "st-martin": 0.05,
    "st-barth": 0.0,
  };
  return taxeByRegion[regionRea];
}
export function calculPrimeRCD(params: {
  enCreation: boolean;
  caDeclared: number;
  etp: number;
  activites: { code: number; caSharePercent: number }[];
  dateCreation: Date;
  tempsSansActivite: Enum_Temps_sans_activite;
  anneeExperience: number;
  assureurDefaillant: boolean;
  nombreAnneeAssuranceContinue: number;
  qualif: boolean;
  sansActiviteDepuisPlusDe12MoisSansFermeture: "OUI" | "NON" | "CREATION";
  absenceDeSinistreSurLes5DernieresAnnees:
    | "OUI"
    | "NON"
    | "CREATION"
    | "ASSUREUR_DEFAILLANT"
    | "A_DEFINIR";
  protectionJuridique: boolean;

  fractionnementPrime: "annuel" | "mensuel" | "trimestriel" | "semestriel";
  fraisFractionnementPrime: number;
  protectionJuridique1an: number;
  taxeAssurance: number;
  partSoutraitance: number;
  partNegoce: number;
  nonFournitureBilanN_1: boolean;
  reprisePasse: boolean;
  txFraisGestion: number;
  dateFinCouverturePrecedente: Date;

  // Nouveaux paramètres pour la reprise du passé
  nomDeLAsurreur: string;
  dateEffet?: Date; // Date d'effet du contrat (ISO)

  sinistresPrecedents?: SinistrePasse[]; // Sinistres des 5 dernières années
}) {
  const {
    enCreation,
    caDeclared,
    etp,
    activites: activitesRaw,
    dateCreation,

    anneeExperience,
    assureurDefaillant,
    nombreAnneeAssuranceContinue,
    qualif,
    tempsSansActivite,

    // Paramètres reprise du passé
    nomDeLAsurreur,
    dateEffet,
    sansActiviteDepuisPlusDe12MoisSansFermeture,
    absenceDeSinistreSurLes5DernieresAnnees,
    protectionJuridique,
    fractionnementPrime,
    protectionJuridique1an = 106.0,
    txFraisGestion = 0.1,
    taxeAssurance,
    fraisFractionnementPrime = 40,
    partSoutraitance,
    partNegoce,
    nonFournitureBilanN_1,
    reprisePasse,
    sinistresPrecedents = [],
    dateFinCouverturePrecedente,
  } = params;
  console.log("params", params);
  console.log("protectionJuridique1an", protectionJuridique1an);

  const calculCA = (params: { caDeclared: number; etp: number }) => {
    const { caDeclared, etp } = params;
    if (etp * 70_000 > caDeclared) return etp * 70_000;
    return caDeclared;
  };
  const reformatedActivites = (
    activites: { code: number; caSharePercent: number }[]
  ) =>
    activites.map((activite) => ({
      ...activite,
      caSharePercent:
        activite.caSharePercent > 0
          ? activite.caSharePercent / 100
          : activite.caSharePercent,
    }));

  const activites = reformatedActivites(activitesRaw);

  const caCalculee = calculCA({ caDeclared, etp });

  const refus: ReturnValueRefus = verifRefus({
    experienceDirigeant: anneeExperience,
    tempsSansActivite,
    partSoutraitance,
    partNegoce,
  });

  const isAssureurDefaillant = assureursDefaillants.includes(nomDeLAsurreur);

  const majorations = calculateMajorations({
    enCreation,
    etp,
    nbActivites: activites.length,
    qualif,
    dateCreation,
    tempsSansActivite,
    anneeExperience,
    assureurDefaillant,
    nombreAnneeAssuranceContinue,
    nonFournitureBilanN_1,
    sansActiviteDepuisPlusDe12MoisSansFermeture,
    absenceDeSinistreSurLes5DernieresAnnees,
  });

  type returnTab = {
    nomActivite: string;
    partCA: number;
    tauxBase: number;
    PrimeMiniAct: number;
    DegMax: number;
    Deg400k: number;
    PrimeRefAct: number;
    Prime100Ref: number;
    Prime100Min: number;
  };

  type returnValue = {
    caCalculee: number;
    refus: boolean;
    refusReason: string;
    returnTab: returnTab[];
    PminiHT: number;
    PrimeHTSansMajorations: number;
    totalMajorations: number;
    primeMini: number;
    primeAuDela: number;
    primeTotal: number;
    majorations: typeof majorations;
    reprisePasseResult?: ReprisePasseResult; // Résultat du calcul de reprise du passé
    protectionJuridique: number;
    fraisGestion: number;
    totalTTC: number;
    echeancier?: EcheancierResult;
    nbEcheances: number;
    autres: {
      taxeAssurance: number;
      protectionJuridiqueTTC: number;
      fraisFractionnementPrimeHT: number;
      total: number;
    };
    primeAggravationBilanN_1NonFourni: number;
  };

  const plafond = 70_000;

  const returnTab: returnTab[] = [];

  const returnValue: returnValue = {
    caCalculee: caCalculee,
    refus:
      refus.experienceDirigeant ||
      refus.sansAssuranceDepuisPlusDe12Mois ||
      refus.partSoutraitance ||
      refus.partNegoce,
    refusReason: refus.experienceDirigeant
      ? "Expérience du dirigeant"
      : refus.sansAssuranceDepuisPlusDe12Mois
      ? "Sans assurance depuis plus de 12 mois"
      : refus.partSoutraitance
      ? "Part de soutraitance"
      : refus.partNegoce
      ? "Part de négociation"
      : "",
    returnTab: [],
    PminiHT: 0,
    primeMini: 0,
    PrimeHTSansMajorations: 0,
    totalMajorations: 0,
    primeAuDela: 0,
    primeTotal: 0,
    majorations: majorations,
    reprisePasseResult: undefined,
    protectionJuridique: protectionJuridique1an * (1 + taxeAssurance),
    fraisGestion: 0,
    totalTTC: 0,
    nbEcheances: {
      annuel: 1,
      mensuel: 12,
      trimestriel: 4,
      semestriel: 2,
    }[fractionnementPrime],
    echeancier: undefined,
    autres: {
      taxeAssurance: 0,
      protectionJuridiqueTTC: 0,
      fraisFractionnementPrimeHT: 0,
      total: 0,
    },
    primeAggravationBilanN_1NonFourni: 0,
  };

  const calculSommeTauxActPartCa = (
    activites: { code: number; caSharePercent: number }[],
    tableauTax: { code: number; rate: number }[]
  ) => {
    return activites.reduce((acc, activite) => {
      const rate = tableauTax.find((tax) => tax.code === activite.code)?.rate;
      return acc + (rate ? rate * activite.caSharePercent : 0);
    }, 0);
  };

  const tableauDeg = calculDeg({
    caDeclared: caCalculee,
    tableauDeg: tableauDegAvant,
  });
  console.log("tableauDeg", tableauDeg);

  activites.forEach((activite) => {
    const rate = tableauTax.find((tax) => tax.code === activite.code)?.rate;
    const tauxBase = rate ? rate : 0;
    const primeMiniAct = tauxBase * plafond;
    const degMax = tableauDeg.find(
      (deg) => deg.code === activite.code
    )?.degressivity;
    const deg400k = tableauDeg.find(
      (deg) => deg.code === activite.code && deg.type === "CA"
    )?.degressivity;
    const primeRefAct =
      deg400k && caCalculee > 250000 ? primeMiniAct * deg400k : primeMiniAct;
    const prime100Ref =
      deg400k && caCalculee > 250000
        ? tauxBase * deg400k * caCalculee - primeRefAct
        : tauxBase * caCalculee - primeRefAct;
    const prime100Min = prime100Ref * activite.caSharePercent;

    returnTab.push({
      nomActivite:
        tableauTax.find((tax) => tax.code === activite.code)?.title ?? "",
      partCA: activite.caSharePercent,
      tauxBase,
      PrimeMiniAct: primeMiniAct,
      DegMax: degMax ?? 0,
      Deg400k: deg400k ?? 0,
      PrimeRefAct: primeRefAct,
      Prime100Ref: prime100Ref,
      Prime100Min: prime100Min,
    });
  });

  const totalMajorations = Object.entries(returnValue.majorations)
    .filter(([key]) => key !== "nonFournitureBilanN_1")
    .reduce(
      (acc: number, [, val]: [string, number | undefined]) => acc + (val ?? 0),
      1
    );

  returnValue.PminiHT =
    plafond * calculSommeTauxActPartCa(activites, tableauTax);
  returnValue.PrimeHTSansMajorations =
    returnValue.PminiHT +
    returnTab.reduce((acc, activite) => acc + activite.Prime100Min, 0);
  returnValue.totalMajorations = totalMajorations;
  returnValue.primeMini = returnValue.PminiHT * totalMajorations;
  returnValue.primeTotal =
    returnValue.PrimeHTSansMajorations * totalMajorations;
  returnValue.fraisGestion = returnValue.primeTotal * txFraisGestion;
  returnValue.autres.fraisFractionnementPrimeHT =
    returnValue.nbEcheances * fraisFractionnementPrime;
  returnValue.autres.taxeAssurance =
    returnValue.primeTotal * taxeAssurance +
    returnValue.autres.fraisFractionnementPrimeHT * taxeAssurance;
  returnValue.autres.protectionJuridiqueTTC = protectionJuridique1an * (1 + taxeAssurance);
  returnValue.autres.total =
    returnValue.autres.taxeAssurance +
    returnValue.autres.protectionJuridiqueTTC +
    returnValue.autres.fraisFractionnementPrimeHT;
  returnValue.primeAuDela = returnValue.primeTotal - returnValue.primeMini;
  returnValue.totalTTC =
    returnValue.primeTotal +
    returnValue.autres.total +
    returnValue.fraisGestion;
  returnValue.returnTab = returnTab;
  returnValue.echeancier = genererEcheancier({
    dateDebut: dateEffet ?? new Date(),
    totalHT: returnValue.primeTotal,
    taxe: returnValue.autres.taxeAssurance,
    totalTTC: returnValue.totalTTC,
    rcd: returnValue.primeTotal,
    pj: returnValue.autres.protectionJuridiqueTTC,
    frais: returnValue.autres.fraisFractionnementPrimeHT,
    reprise: 0, // Pas de reprise dans cet exemple
    fraisGestion: returnValue.fraisGestion,
    periodicite: fractionnementPrime,
    // caCalculee: returnValue.caCalculee,
    // primeHTSansMajorations: returnValue.PrimeHTSansMajorations,
    // totalMajorations: returnValue.totalMajorations,
    // primeMini: returnValue.primeMini,
    // primeAuDela: returnValue.primeAuDela,
    // primeTotal: returnValue.primeTotal,
    // majorations: returnValue.majorations,
    // protectionJuridique: returnValue.protectionJuridique,
    // autres: returnValue.autres,
    // primeAggravationBilanN_1NonFourni: returnValue.primeAggravationBilanN_1NonFourni,
  });

  returnValue.primeAggravationBilanN_1NonFourni = returnValue.majorations
    .nonFournitureBilanN_1
    ? returnValue.primeTotal *
      returnValue.majorations.nonFournitureBilanN_1 *
      (1 + txFraisGestion + taxeAssurance)
    : 0;
  console.log("returnValue", returnValue);
  // Calcul de la reprise du passé si activée
  if (
    (isAssureurDefaillant || assureurDefaillant) &&
    dateEffet &&
    reprisePasse
  ) {
    try {
      const reprisePasseResult = calculReprisePasseRCD({
        tauxTI: [
          0.7, 0.686, 0.672, 0.658, 0.644, 0.63, 0.616, 0.602, 0.588, 0.574,
          0.56, 0.546, 0.532, 0.518, 0.504, 0.49, 0.476, 0.462, 0.448, 0.434,
          0.42, 0.406, 0.392, 0.378, 0.364, 0.35, 0.336, 0.322, 0.308, 0.294,
          0.28, 0.266, 0.252, 0.238, 0.224, 0.21, 0.196, 0.182, 0.168, 0.154,
          0.14, 0.126, 0.112, 0.098, 0.084, 0.07, 0.056, 0.042, 0.028, 0.014,
          0.0,
        ],
        primeAnnuelleHT: returnValue.PrimeHTSansMajorations,
        dureeCouvertureAssureur: 5, // Par défaut 5 ans, à adapter selon les besoins
        dateFinCouverturePrecedente,
        sinistresPrecedents,
        coefficientAntecedent: 1,
        dateCreation: dateCreation,
      });
      returnValue.reprisePasseResult = reprisePasseResult;
    } catch (error) {
      console.error("Erreur lors du calcul de la reprise du passé:", error);
      // On continue sans la reprise du passé en cas d'erreur
      returnValue.reprisePasseResult = undefined;
    }
  }

  return returnValue;
}

// ========== FONCTION ÉCHÉANCIER SIMPLE ==========

type EcheancierParams = {
  dateDebut: Date; // Date de début du contrat
  totalHT: number; // Total HT
  taxe: number; // Taxe €
  totalTTC: number; // Total TTC
  rcd: number; // RCD
  pj: number; // PJ
  frais: number; // Frais
  reprise: number; // Reprise
  fraisGestion: number; // Frais de gestion
  periodicite: "annuel" | "semestriel" | "trimestriel" | "mensuel";
  // Informations complètes du calcul
  // caCalculee: number;
  // primeHTSansMajorations: number;
  // totalMajorations: number;
  // primeMini: number;
  // primeAuDela: number;
  // primeTotal: number;
  // majorations: any;
  // protectionJuridique: number;
  // autres: {
  //   taxeAssurance: number;
  //   protectionJuridiqueTTC: number;
  //   fraisFractionnementPrimeHT: number;
  //   total: number;
  // };
  // primeAggravationBilanN_1NonFourni: number;
};

type Echeance = {
  date: string; // Format "DD/MM/YYYY"
  totalHT: number;
  taxe: number;
  totalTTC: number;
  rcd: number;
  pj: number;
  frais: number;
  reprise: number;
  fraisGestion: number;
  debutPeriode: string; // Format "DD/MM/YYYY"
  finPeriode: string; // Format "DD/MM/YYYY"
};

type EcheancierResult = {
  echeances: Echeance[];
  nbEcheances: number;
  // Informations complètes du calcul
  // caCalculee: number;
  // primeHTSansMajorations: number;
  // totalMajorations: number;
  // primeMini: number;
  // primeAuDela: number;
  // primeTotal: number;
  // majorations: any;
  // protectionJuridique: number;
  // fraisGestion: number;
  // autres: {
  //   taxeAssurance: number;
  //   protectionJuridiqueTTC: number;
  //   fraisFractionnementPrimeHT: number;
  //   total: number;
  // };
  // primeAggravationBilanN_1NonFourni: number;
};

export function genererEcheancier(params: EcheancierParams): EcheancierResult {
  const {
    dateDebut,
    totalHT,
    taxe,
    totalTTC,
    rcd,
    pj,
    frais,
    reprise,
    fraisGestion,
    periodicite,
    // caCalculee,
    // primeHTSansMajorations,
    // totalMajorations,
    // primeMini,
    // primeAuDela,
    // primeTotal,
    // majorations,
    // protectionJuridique,
    // autres,
    // primeAggravationBilanN_1NonFourni
  } = params;

  const echeances: Echeance[] = [];

  // Calculer le nombre d'échéances selon la périodicité
  const nbEcheancesParAn = {
    annuel: 1,
    semestriel: 2,
    trimestriel: 4,
    mensuel: 12,
  }[periodicite];
  const nbEcheances = nbEcheancesParAn;
  console.log("nbEcheancesParAn :", nbEcheancesParAn);
  console.log("nbEcheances :", nbEcheances);

  // On génère un tableau de dates (type Date uniquement) qui coupe l'année en nbEcheances parts égales
  // On part du 1er janvier de l'année courante
  const year = dateDebut.getFullYear();
  console.log("Année de début :", year);

  // On calcule le nombre de jours entre le 1er janvier de l'année courante et la date de début
  const nbJoursDepuisDateDebut = Math.floor(
    (dateDebut.getTime() - new Date(year, 0, 1).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  console.log(
    "Nombre de jours depuis le 1er janvier :",
    nbJoursDepuisDateDebut
  );

  const nbEcheancesNbJours = 365.25 / nbEcheances;
  console.log("Nombre de jours par échéance :", nbEcheancesNbJours);

  let premierPaiementDeLAnnee = true;
  let totalPaiement = 0;

  let nbJoursPaye = nbJoursDepuisDateDebut;
  console.log("nbJoursPaye initial :", nbJoursPaye);

  if (nbJoursDepuisDateDebut > 1) {
    const nbAnneeAEcheance = 2;
    console.log("nbAnneeAEcheance :", nbAnneeAEcheance);

    const iFn = () => {
      for (let k = 0; k < nbEcheances; k++) {
        if (k * nbEcheancesNbJours > nbJoursDepuisDateDebut) {
          console.log("iFn retourne :", k);
          return k;
        }
      }
      console.log("iFn retourne 0");
      return 0;
    };
    const i = iFn();
    console.log("Valeur de i :", i);

    for (let j = i - 1; j < nbAnneeAEcheance * nbEcheances; j++) {
      const formatDate = (date: Date) => {
        const d = date.getDate().toString().padStart(2, "0");
        const m = (date.getMonth() + 1).toString().padStart(2, "0");
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
      };
      const dateEcheanceIPLus1D = new Date(
        new Date(year, 0, 1).getTime() +
          nbEcheancesNbJours * (j + 1) * 24 * 60 * 60 * 1000
      );
      const dateEcheanceIPLus1 = formatDate(dateEcheanceIPLus1D);

      const dateEcheance = formatDate(
        j === i - 1
          ? dateDebut
          : new Date(
              new Date(year, 0, 1).getTime() +
                nbEcheancesNbJours * j * 24 * 60 * 60 * 1000
            )
      );
      console.log(
        `Échéance ${j}: dateEcheanceI_1 = ${dateEcheanceIPLus1}, dateEcheance = ${dateEcheance}`
      );

      if (
        dateEcheanceIPLus1D.getFullYear() === year + 1 &&
        j % nbEcheances === 0
      ) {
        premierPaiementDeLAnnee = true;
        console.log("Premier paiement de l'année détecté pour j =", j);
      }
      const ratio =
        nbJoursPaye % nbEcheancesNbJours === 0
          ? 1
          : (nbEcheancesNbJours * (j + 1) - nbJoursPaye) / nbEcheancesNbJours;
      console.log(`ratio pour j=${j} :`, ratio);

      const taxeEcheance =
        (taxe / nbEcheances) * ratio +
        (premierPaiementDeLAnnee ? frais * 0.045 : 0);

      const rcdEcheance = ((rcd + taxe + frais) / nbEcheances) * ratio;
      console.log(rcd, taxe, frais, "rcdEcheance", rcdEcheance, ratio);
      const pjEcheance = premierPaiementDeLAnnee ? pj : 0;
      const fraisEcheance = premierPaiementDeLAnnee ? frais : 0;
      const repriseEcheance = premierPaiementDeLAnnee ? reprise : 0;
      const fraisGestionEcheance = premierPaiementDeLAnnee ? fraisGestion : 0;
      const totalHTEcheance =
        rcdEcheance +
        fraisGestionEcheance +
        pjEcheance +
        (repriseEcheance === undefined ? 0 : repriseEcheance) -
        taxeEcheance;

      const totalTCHEcheance = totalHTEcheance + taxeEcheance;

      console.log(
        `totalHTEcheance : ${totalHTEcheance}, taxeEcheance : ${taxeEcheance}, totalTCHEcheance : ${totalTCHEcheance}, rcdEcheance : ${rcdEcheance}, pjEcheance : ${pjEcheance}, fraisEcheance : ${fraisEcheance}, repriseEcheance : ${repriseEcheance}, fraisGestionEcheance : ${fraisGestionEcheance}`
      );

      totalPaiement +=
        totalHTEcheance +
        taxeEcheance +
        rcdEcheance +
        pjEcheance +
        fraisEcheance +
        repriseEcheance +
        fraisGestionEcheance;

      console.log("totalPaiement cumulé :", totalPaiement);

      echeances.push({
        date: dateEcheance,
        totalHT: totalHTEcheance,
        taxe: taxeEcheance,
        totalTTC: totalTCHEcheance,
        rcd: rcdEcheance,
        pj: pjEcheance,
        frais: fraisEcheance,
        reprise: repriseEcheance,
        fraisGestion: fraisGestionEcheance,
        debutPeriode: dateEcheance,
        finPeriode: dateEcheanceIPLus1,
      });

      nbJoursPaye = nbEcheancesNbJours;
      console.log("nbJoursPaye après incrément :", nbJoursPaye);

      premierPaiementDeLAnnee = false;
    }
  }

  return {
    echeances,
    nbEcheances,
    // caCalculee,
    // primeHTSansMajorations,
    // totalMajorations,
    // primeMini,
    // primeAuDela,
    // primeTotal,
    // majorations,
    // protectionJuridique,
    // fraisGestion,
    // autres,
    // primeAggravationBilanN_1NonFourni
  };
}

// ========== CALCUL REPRISE DU PASSÉ ==========

type SinistrePasse = {
  year: number;
  numClaims: number;
  totalCost: number;
};

type ReprisePasseParams = {
  dateCreation: Date; // Date de création de l'entreprise (ISO)
  tauxTI: number[]; // Taux TI par année (ex: [0.700, 0.686, 0.672, 0.658, 0.644, 0.630, 0.616, 0.602, 0.588, 0.574, 0.560, 0.546, 0.532, 0.518, 0.504, 0.490, 0.476, 0.462, 0.448, 0.434, 0.420, 0.406, 0.392, 0.378, 0.364, 0.350, 0.336, 0.322, 0.308, 0.294, 0.280, 0.266, 0.252, 0.238, 0.224, 0.210, 0.196, 0.182, 0.168, 0.154, 0.140, 0.126, 0.112, 0.098, 0.084, 0.070, 0.056, 0.042, 0.028, 0.014, 0.000])
  primeAnnuelleHT: number; // Prime annuelle calculée avec tous les coefficients
  dureeCouvertureAssureur: number; // Durée de couverture de l'assureur (en années)
  dateFinCouverturePrecedente: Date; // Date de fin de couverture précédente (ISO)
  sinistresPrecedents: SinistrePasse[]; // Sinistres des 5 dernières années
  coefficientAntecedent: number; // Coefficient selon ancienneté (0.3, 0.6, 1, 1.4, 1.7, etc.)
};

type ReprisePasseResult = {
  // Tableau des années avec calculs
  tableauAnnees: {
    annee: number;
    tauxTI: number;
    pourcentageAnnee: number;
    primeRepriseAnnee: number;
  }[];

  // Analyse sinistralité
  ratioSP: number; // S/P = (coût sinistres cumulé) / (prime annuelle HT * coeff antécédent)
  frequenceSinistres: number; // Min(Nb sinistres / Nb années ; Nb sinistres avec suite / Nb années)

  // Classification selon le tableau
  categorieAnciennete: string; // "< 3ans", "3 à 7 ans", "> 7 ans"
  categorieFrequence: string; // "0", "0 à 0.5", "0.5 à 1", "1 à 2", "> 2"
  categorieRatioSP: string; // "0", "0 à 0.5", "0.5 à 0.7", "0.7 à 1", "> 1"

  tauxMajoration: number; // Taux de majoration
  primeReprisePasseTTC: number; // Prime de reprise du passé TTC finale
  primeApresSinistralite: number; // Prime après sinistralité
};

/**
 * Calcule la prime de reprise du passé selon les règles RCD
 *
 * @param params - Paramètres de calcul de la reprise du passé
 * @returns Résultat détaillé du calcul de reprise du passé
 */
export function calculReprisePasseRCD(
  params: ReprisePasseParams
): ReprisePasseResult {
  const {
    dateCreation,
    tauxTI,
    primeAnnuelleHT,
    dureeCouvertureAssureur,
    dateFinCouverturePrecedente,
    sinistresPrecedents,
    coefficientAntecedent,
  } = params;

  const anciennete =
    new Date().getFullYear() - dateCreation.getFullYear() === 0
      ? 1
      : new Date().getFullYear() - dateCreation.getFullYear();

  console.log("anciennete reprise passe", anciennete);

  // Tableaux de référence selon les spécifications
  const tableauCoefficientsAnciennete = [
    { anciennete: 1, coefficient: 0.3 },
    { anciennete: 2, coefficient: 0.6 },
    { anciennete: 3, coefficient: 1.0 },
    { anciennete: 4, coefficient: 1.4 },
    { anciennete: 5, coefficient: 1.7 },
    { anciennete: 6, coefficient: 2.6 },
    { anciennete: 7, coefficient: 3.3 },
    { anciennete: 8, coefficient: 4.1 },
    { anciennete: 9, coefficient: 5.0 },
    { anciennete: 10, coefficient: 5.9 },
    { anciennete: 11, coefficient: 6.8 },
    { anciennete: 12, coefficient: 7.8 },
    { anciennete: 13, coefficient: 8.8 },
  ];

  console.log(
    "tableauCoefficientsAnciennete reprise passe",
    tableauCoefficientsAnciennete
  );

  // Tableau principal de coefficients selon ancienneté, fréquence et ratio S/P
  const tableauCoefficients = {
    "< 3ans": {
      "0": {
        "0": 1.0,
        "0 à 0.5": 1.0,
        "0.5 à 0.7": 1.0,
        "0.7 à 1": 1.0,
        "> 1": 1.0,
      },
      "0 à 0.5": {
        "0": 1.0,
        "0 à 0.5": 1.1,
        "0.5 à 0.7": 1.2,
        "0.7 à 1": 1.3,
        "> 1": "Analyse Cie",
      },
      "0.5 à 1": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
      "1 à 2": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
      "> 2": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
    },
    "3 à 7 ans": {
      "0": {
        "0": 0.9,
        "0 à 0.5": 0.9,
        "0.5 à 0.7": 0.9,
        "0.7 à 1": 0.9,
        "> 1": 0.9,
      },
      "0 à 0.5": {
        "0": 0.9,
        "0 à 0.5": 0.97,
        "0.5 à 0.7": 1.1,
        "0.7 à 1": 1.2,
        "> 1": "Analyse Cie",
      },
      "0.5 à 1": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": 0.95,
        "0.7 à 1": 1.05,
        "> 1": 1.15,
      },
      "1 à 2": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
      "> 2": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
    },
    "> 7 ans": {
      "0": {
        "0": 0.8,
        "0 à 0.5": 0.8,
        "0.5 à 0.7": 0.8,
        "0.7 à 1": 0.8,
        "> 1": 0.8,
      },
      "0 à 0.5": {
        "0": 0.8,
        "0 à 0.5": 0.9,
        "0.5 à 0.7": 1.0,
        "0.7 à 1": 1.1,
        "> 1": 1.2,
      },
      "0.5 à 1": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": 0.95,
        "0.7 à 1": 1.05,
        "> 1": 1.15,
      },
      "1 à 2": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
      "> 2": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
    },
  };

  console.log("tableauCoefficients reprise passe", tableauCoefficients);

  const sP =
    sinistresPrecedents.reduce((sum, s) => sum + s.totalCost, 0) /
    (primeAnnuelleHT *
      (tableauCoefficientsAnciennete.find(
        (item) => item.anciennete === anciennete
      )?.coefficient || 0));

  const frequence =
    sinistresPrecedents.reduce((sum, s) => sum + s.numClaims, 0) / anciennete;

  console.log("sP reprise passe", sP);
  console.log("frequence reprise passe", frequence);

  const categorieAnciennete =
    (tableauCoefficientsAnciennete.find(
      (item) => item.anciennete === anciennete
    )?.anciennete || 0) < 3
      ? "< 3ans"
      : (tableauCoefficientsAnciennete.find(
          (item) => item.anciennete === anciennete
        )?.anciennete || 0) <= 7
      ? "3 à 7 ans"
      : "> 7 ans";
  const categorieFrequence =
    frequence === 0
      ? "0"
      : frequence <= 0.5
      ? "0 à 0.5"
      : frequence <= 1
      ? "0.5 à 1"
      : frequence <= 2
      ? "1 à 2"
      : "> 2";
  const categorieRatioSP =
    sP === 0
      ? "0"
      : sP <= 0.5
      ? "0 à 0.5"
      : sP <= 0.7
      ? "0.5 à 0.7"
      : sP <= 1
      ? "0.7 à 1"
      : "> 1";

  console.log("categorieAnciennete reprise passe", categorieAnciennete);
  console.log("categorieFrequence reprise passe", categorieFrequence);
  console.log("categorieRatioSP reprise passe", categorieRatioSP);

  const tauxMajoration =
    (tableauCoefficients as any)[categorieAnciennete]?.[categorieFrequence]?.[
      categorieRatioSP
    ] === "Non"
      ? -1
      : (tableauCoefficients as any)[categorieAnciennete]?.[
          categorieFrequence
        ]?.[categorieRatioSP];
  console.log("tauxMajoration reprise passe", tauxMajoration);

  // 1. Construction du tableau des années (de la plus récente à la plus ancienne)
  const tableauAnnees: {
    annee: number;
    tauxTI: number;
    pourcentageAnnee: number;
    primeRepriseAnnee: number;
  }[] = [];

  const anneeFin = dateFinCouverturePrecedente.getFullYear();
  const moisFin = dateFinCouverturePrecedente.getMonth();
  const jourFin = dateFinCouverturePrecedente.getDate();

  // Pour chaque année de la période de couverture
  for (let i = 0; i < dureeCouvertureAssureur; i++) {
    const annee = anneeFin - i;
    const tauxTIAnnee = tauxTI[i] || 0; // Taux TI pour cette année

    // Calcul du pourcentage de l'année
    let pourcentageAnnee = 1; // Par défaut, année complète

    if (i === 0) {
      // Première année (la plus récente) : calculer le pourcentage depuis le début de l'année
      const debutAnnee = new Date(annee, 0, 1);
      const finAnnee = new Date(annee, 11, 31);
      const totalJoursAnnee =
        Math.ceil(
          (finAnnee.getTime() - debutAnnee.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;
      const joursDepuisDebutAnnee =
        Math.ceil(
          (dateFinCouverturePrecedente.getTime() - debutAnnee.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;
      pourcentageAnnee = Math.min(1, joursDepuisDebutAnnee / totalJoursAnnee);
    }

    // Calcul de la prime de reprise pour cette année
    const primeRepriseAnnee = tauxTIAnnee * pourcentageAnnee * primeAnnuelleHT;

    tableauAnnees.push({
      annee,
      tauxTI: tauxTIAnnee,
      pourcentageAnnee: Math.round(pourcentageAnnee * 10000) / 100, // en %
      primeRepriseAnnee: Math.round(primeRepriseAnnee),
    });
  }

  return {
    tableauAnnees,
    ratioSP: sP,
    frequenceSinistres: Math.round(frequence * 100) / 100,
    categorieAnciennete,
    categorieFrequence,
    categorieRatioSP,
    tauxMajoration,
    primeReprisePasseTTC: tableauAnnees.reduce(
      (sum, item) => sum + item.primeRepriseAnnee,
      0
    ),
    primeApresSinistralite: primeAnnuelleHT * tauxMajoration,
  };
}
