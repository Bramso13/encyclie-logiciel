// // ---------- Types
type Territory =
  | "REUNION"
  | "MAYOTTE"
  | "MARTINIQUE"
  | "GUADELOUPE"
  | "GUYANE"
  | "ST-MARTIN"
  | "ST-BARTH";

type PreviousRcdStatus = "EN_COURS" | "RESILIE" | "JAMAIS";
type Periodicity = "annuel" | "semestriel" | "trimestriel" | "mensuel";

type ActivityShare = { code: string; caSharePercent: number };

type Loss = { year: number; numClaims: number; totalCost: number };

type ActiDegressivity = {
  baseRate: number; // taux de base (ex: 0.0407)
  reducAt500k: number; // réduction au 500k (ex: 0.88 => -12%)
  thresholdStart: number; // seuil de déclenchement de la dégressivité (souvent ~250k)
  reducAt1M: number; // réduction au 1M (ex: 0.80 => -20%)
};

type Tables = {
  actiscorByCode: Record<string, ActiDegressivity>;
  taxByZone: Record<Territory, number>; // ex { REUNION: 0.09, ... }
  fraisGestionRate: number; // ex 0.03 (3%) — provient de tab_autrescharges (ligne FG)
  echeanceUnitCost: number; // "coutecheance" (coût d’1 échéance)
  periodicitySplits: Record<Periodicity, number>; // { annuel:1, semestriel:2, trimestriel:4, mensuel:12 }
  pminiPlancher: number; // ex 2000
  plafondPmini: number; // 70_000 (seuil prime mini)
  plafondCA: number; // 1_000_000 (max autorisé)
  pjEnabledByDefault?: boolean; // défaut true si tu veux
};

type CoeffInput = {
  hasQualification: boolean; // QUALIBAT/QUALIFELEC
  creationDateISO: string; // "YYYY-MM-DD"
  yearsExperience: number; // ex 2.1
  previousRcdStatus: PreviousRcdStatus;
  previousResiliationDate?: string | null; // "YYYY-MM-DD"
  lossHistory: Loss[]; // liste des sinistres
};

type ScheduleOptions = {
  effectiveDateISO: string; // "YYYY-MM-DD" (date d'effet)
  periodicity: Periodicity; // annuel | semestriel | trimestriel | mensuel
  includePJ?: boolean; // par défaut: tables.pjEnabledByDefault ?? true
  repriseDuPasse?: {
    // si jamais tu l’actives plus tard
    enabled: boolean;
    numInstallments?: number; // nb d’échéances pour la reprise
    ttcAmount?: number; // TTC reprise (si gérée)
  };
};

type PremiumParams = {
  caDeclared: number;
  headcountETP: number;
  activities: ActivityShare[];
  territory: Territory;
  subContractingPercent: number;
  tradingPercent: number;
  tables: Tables;
  coeff: CoeffInput;
  schedule: ScheduleOptions;
};

// ---------- Helpers « Excel-like »

const DAYS_IN_YEAR = 365; // comme dans le VBA
const PJ_HT = 106; // valeur utilisée dans ton VBA

function parseISO(d: string): Date {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) throw new Error(`Date invalide: ${d}`);
  return dt;
}

function yearOf(d: Date) {
  return d.getFullYear();
}
function monthOf(d: Date) {
  return d.getMonth() + 1;
} // 1..12
function dayOf(d: Date) {
  return d.getDate();
}

function dateSerial(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

function daysDiffInclusive(a: Date, b: Date): number {
  // équivalent du DateDiff("d", a, b) + 1
  const A = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const B = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((B - A) / 86400000) + 1;
}

// ---------- Étapes tarif (modules tarif_mod / outils / coeffmajo_mod)

function computeCAcorrected(
  caDecl: number,
  etp: number,
  seuil = 70_000
): number {
  if (etp <= 0) return caDecl;
  return caDecl / etp > seuil ? caDecl : etp * seuil;
}

function txDeg_2Pentes(
  x: number,
  tx0: number,
  seuil: number,
  seuilDeg: number,
  caMax: number,
  reducAt500k: number,
  reducAt1M: number
): number {
  // Reprise fidèle de outils.txdeg (>= v7.8) :
  // palier 1 jusqu’à 500k puis palier 2 jusqu’à 1M
  const CAmaxdeg1 = 500_000;
  const CAmaxdeg2 = 1_000_000;

  if (x <= seuil) return 0; // en-dessous: prime mini
  if (x > seuil && x <= seuilDeg) return tx0;

  if (x > seuilDeg && x <= CAmaxdeg1) {
    const frac = (x - seuilDeg) / (CAmaxdeg1 - seuilDeg);
    return tx0 * (1 - (1 - reducAt500k) * frac);
  }

  if (x > CAmaxdeg1 && x <= CAmaxdeg2) {
    const reduc =
      reducAt500k +
      (reducAt1M - reducAt500k) * ((x - CAmaxdeg1) / (CAmaxdeg2 - CAmaxdeg1));
    return tx0 * reduc;
  }

  if (x > caMax) {
    // Dans le VBA : message + borne
    return tx0 * reducAt1M;
  }
  return tx0; // garde-fou
}

function calcPrimeMini(
  CA: number,
  activities: ActivityShare[],
  tables: Tables
): { pmini: number; tauxMoyenBase: number } {
  const tauxMoyenBase = activities.reduce((acc, a) => {
    const r = tables.actiscorByCode[a.code];
    if (!r) throw new Error(`Code activité inconnu: ${a.code}`);
    return acc + r.baseRate * (a.caSharePercent / 100);
  }, 0);
  const pmini = Math.max(
    tables.pminiPlancher,
    tauxMoyenBase * tables.plafondPmini
  );
  return { pmini, tauxMoyenBase };
}

function calcTxMoyAuDela(
  CA: number,
  activities: ActivityShare[],
  tables: Tables
): number {
  if (CA <= tables.plafondPmini) return 0;
  return activities.reduce((acc, a) => {
    const p = tables.actiscorByCode[a.code];
    const tx = txDeg_2Pentes(
      CA,
      p.baseRate,
      tables.plafondPmini,
      p.thresholdStart,
      tables.plafondCA,
      p.reducAt500k,
      p.reducAt1M
    );
    return acc + tx * (a.caSharePercent / 100);
  }, 0);
}

type CoefficientsBreakdown = {
  qualification: { applied: boolean; value: number; description: string };
  companyAge: { ageYears: number; value: number; description: string };
  managerExperience: { yearsExp: number; value: number; description: string };
  previousRcd: {
    status: PreviousRcdStatus;
    value: number;
    description: string;
  };
  lossHistory: { numLosses: number; value: number; description: string };
  total: number;
};

function sumCoefficients(c: CoeffInput): {
  total: number;
  breakdown: CoefficientsBreakdown;
} {
  let coeff = 0;
  const breakdown: CoefficientsBreakdown = {
    qualification: { applied: false, value: 0, description: "" },
    companyAge: { ageYears: 0, value: 0, description: "" },
    managerExperience: { yearsExp: 0, value: 0, description: "" },
    previousRcd: { status: c.previousRcdStatus, value: 0, description: "" },
    lossHistory: { numLosses: 0, value: 0, description: "" },
    total: 0,
  };

  // a) Qualification
  if (c.hasQualification) {
    coeff += -0.05;
    breakdown.qualification = {
      applied: true,
      value: -0.05,
      description: "Qualification QUALIBAT/QUALIFELEC",
    };
  } else {
    breakdown.qualification = {
      applied: false,
      value: 0,
      description: "Pas de qualification",
    };
  }

  // b) Ancienneté société
  const ageYears =
    (Date.now() - parseISO(c.creationDateISO).getTime()) / (365.25 * 86400000);
  breakdown.companyAge.ageYears = ageYears;

  if (ageYears < 1) {
    coeff += +0.2;
    breakdown.companyAge.value = 0.2;
    breakdown.companyAge.description = "Société < 1 an";
  } else if (ageYears < 3) {
    coeff += +0.1;
    breakdown.companyAge.value = 0.1;
    breakdown.companyAge.description = "Société 1-3 ans";
  } else {
    breakdown.companyAge.value = 0;
    breakdown.companyAge.description = "Société ≥ 3 ans";
  }

  // c) Expérience dirigeant
  breakdown.managerExperience.yearsExp = c.yearsExperience;
  if (c.yearsExperience < 1) {
    throw new Error("Refus — expérience dirigeant < 1 an");
  } else if (c.yearsExperience < 3) {
    coeff += +0.05;
    breakdown.managerExperience.value = 0.05;
    breakdown.managerExperience.description = "Expérience dirigeant 1-3 ans";
  } else if (c.yearsExperience > 5) {
    coeff += -0.05;
    breakdown.managerExperience.value = -0.05;
    breakdown.managerExperience.description = "Expérience dirigeant > 5 ans";
  } else {
    breakdown.managerExperience.value = 0;
    breakdown.managerExperience.description = "Expérience dirigeant 3-5 ans";
  }

  // d) Antécédents RCD
  breakdown.previousRcd.description = `Statut RCD précédent: ${c.previousRcdStatus}`;

  // e) Sinistralité
  breakdown.lossHistory.numLosses = c.lossHistory.length;
  if (c.lossHistory.length > 0) {
    const totalCost = c.lossHistory.reduce(
      (sum, loss) => sum + loss.totalCost,
      0
    );
    // Exemple de majoration sinistralité (à adapter selon vos règles)
    const sinistraCoeff = Math.min(0.3, c.lossHistory.length * 0.1);
    coeff += sinistraCoeff;
    breakdown.lossHistory.value = sinistraCoeff;
    breakdown.lossHistory.description = `${
      c.lossHistory.length
    } sinistre(s) - Coût total: ${totalCost.toLocaleString("fr-FR")} €`;
  } else {
    breakdown.lossHistory.description = "Aucun sinistre déclaré";
  }

  breakdown.total = coeff;
  return { total: coeff, breakdown };
}

// ---------- Taxes & frais (tarif_mod.calcTarif_options)

function computeHTBase(
  CA_declared: number,
  ETP: number,
  activities: ActivityShare[],
  tables: Tables,
  coeffInput: CoeffInput
): {
  CA_total: number;
  CA_declared: number;
  ETP: number;
  pmini: number;
  tauxMoyenBase: number;
  txMoyAuDela: number;
  primeBeforeCoeff: number;
  primeHT: number; // HT après coefficients
  coeffTotal: number;
  coeffBreakdown: CoefficientsBreakdown;
  isPrimeMinForced: boolean;
  primeMiniHT_afterCoeff: number;
  primeAuDelaHT_afterCoeff: number;
  isAbovePminiThreshold: boolean;
  caAbovePmini: number;
} {
  const CA_total = computeCAcorrected(CA_declared, ETP, 70_000);
  const { pmini, tauxMoyenBase } = calcPrimeMini(CA_total, activities, tables);
  const txMoyAuDela = calcTxMoyAuDela(CA_total, activities, tables);

  const isAbovePminiThreshold = CA_total > tables.plafondPmini;
  const caAbovePmini = Math.max(0, CA_total - tables.plafondPmini);

  const primeBeforeCoeff = isAbovePminiThreshold
    ? pmini + txMoyAuDela * caAbovePmini
    : pmini;

  const coeffResult = sumCoefficients(coeffInput);
  let primeHT = primeBeforeCoeff * (1 + coeffResult.total);
  let isPrimeMinForced = false;

  if (primeHT < tables.pminiPlancher) {
    primeHT = tables.pminiPlancher;
    isPrimeMinForced = true;
  }

  return {
    CA_total,
    CA_declared,
    ETP,
    pmini,
    tauxMoyenBase,
    txMoyAuDela,
    primeBeforeCoeff,
    primeHT,
    coeffTotal: coeffResult.total,
    coeffBreakdown: coeffResult.breakdown,
    isPrimeMinForced,
    primeMiniHT_afterCoeff: pmini * (1 + coeffResult.total),
    primeAuDelaHT_afterCoeff:
      (primeBeforeCoeff - pmini) * (1 + coeffResult.total),
    isAbovePminiThreshold,
    caAbovePmini,
  };
}

function buildTTCAndExtras(
  primeHT: number,
  territory: Territory,
  tables: Tables,
  periodicity: Periodicity,
  includePJ: boolean
) {
  const taxRate = tables.taxByZone[territory] ?? 0;
  const nEch = tables.periodicitySplits[periodicity];
  const fraisFract = nEch > 1 ? nEch * (tables.echeanceUnitCost ?? 0) : 0;
  const fraisGestion = primeHT * (tables.fraisGestionRate ?? 0);

  // PJ : 106 € HT taxés au même taux (cf. tarif_mod)
  const pjHT = includePJ ? PJ_HT : 0;
  const pjTax = pjHT * taxRate;
  const pjTTC = pjHT + pjTax;

  // taxe territoriale: assiette = HT + frais de fractionnement (comme dans le VBA)
  const taxe = (primeHT + fraisFract) * taxRate;

  const ttc = primeHT + taxe + fraisFract + fraisGestion + pjTTC;

  return {
    taxRate,
    taxe,
    fraisFract,
    fraisGestion,
    pjHT,
    pjTax,
    pjTTC,
    ttc,
    nEch,
  };
}

// ---------- Échéancier (echeancier_mod) — fidèle mais compact
// Règles clés reprises :
//  - Année en cours = prorata jours sur la partie RCD TTC (hors FG et PJ).
//  - PJ est due à 100% même en année partielle.
//  - FG au prorata jours.
//  - Pour l’année N+1, on répartit la partie RCD TTC sur la périodicité choisie.

type ScheduleLine = {
  date: string; // ISO
  rcdHT: number;
  rcdTax: number;
  rcdTTC: number;
  pjHT: number;
  pjTax: number;
  pjTTC: number;
  fraisGestion: number; // HT (pas de taxe dans le VBA)
  totalTTC: number;
};

function splitRcdTTCIntoHTTax(ttc: number, taxRate: number) {
  const ht = ttc / (1 + taxRate);
  const tax = ttc - ht;
  return { ht, tax };
}

function buildSchedule(
  totals: ReturnType<typeof buildTTCAndExtras>,
  schedule: ScheduleOptions
) {
  const res: ScheduleLine[] = [];

  const eff = parseISO(schedule.effectiveDateISO);
  const yr = yearOf(eff);
  const mo = monthOf(eff);
  const jr = dayOf(eff);

  // Parties TTC à ventiler
  // Prcd = RCD TTC (total – FG – PJ)
  const Prcd = totals.ttc - totals.fraisGestion - totals.pjTTC;

  // Année N (partielle) : prorata jours
  const endOfYear = dateSerial(yr, 12, 31);
  const njrRestant = daysDiffInclusive(eff, endOfYear);
  const PRCDpartiel = Prcd * (njrRestant / DAYS_IN_YEAR);
  const FGpartiel = totals.fraisGestion * (njrRestant / DAYS_IN_YEAR);
  const PJpartiel = totals.pjTTC; // 100%

  // 1) Échéancier année N
  // Répartition conforme à l’esprit du VBA (simple & fidèle) :
  // - on pose une première ligne à la date d’effet avec PRCDpartiel TTC
  //   (et on éclate HT/Taxe à partir du taux territorial)
  {
    const { ht, tax } = splitRcdTTCIntoHTTax(PRCDpartiel, totals.taxRate);
    const totalTTC = PRCDpartiel + PJpartiel + FGpartiel;
    res.push({
      date: schedule.effectiveDateISO,
      rcdHT: ht,
      rcdTax: tax,
      rcdTTC: PRCDpartiel,
      pjHT: totals.pjHT,
      pjTax: totals.pjTax,
      pjTTC: PJpartiel,
      fraisGestion: FGpartiel,
      totalTTC,
    });
  }

  // 2) Échéancier année N+1
  const yrnext = mo === 1 && jr === 1 ? yr : yr + 1;
  const nEch = totals.nEch;
  const partRCD = Prcd; // pleine année
  const rcdParEch = partRCD / nEch;
  const { ht: rcdHTparEch, tax: rcdTaxParEch } = splitRcdTTCIntoHTTax(
    rcdParEch,
    totals.taxRate
  );
  const FGparEch = totals.fraisGestion / nEch;

  if (schedule.periodicity === "annuel") {
    const d = dateSerial(yrnext, 1, 1);
    res.push({
      date: d.toISOString().slice(0, 10),
      rcdHT: rcdHTparEch,
      rcdTax: rcdTaxParEch,
      rcdTTC: rcdParEch,
      pjHT: totals.pjHT,
      pjTax: totals.pjTax,
      pjTTC: totals.pjTTC,
      fraisGestion: totals.fraisGestion,
      totalTTC: rcdParEch + totals.pjTTC + totals.fraisGestion,
    });
  } else if (schedule.periodicity === "semestriel") {
    const d1 = dateSerial(yrnext, 1, 1);
    const d2 = dateSerial(yrnext, 7, 1);
    [d1, d2].forEach((d, i) => {
      const pj = i === 0 ? totals.pjTTC : 0; // PJ au 1er appel, fidèle au code
      const pjHT = i === 0 ? totals.pjHT : 0;
      const pjTax = i === 0 ? totals.pjTax : 0;
      res.push({
        date: d.toISOString().slice(0, 10),
        rcdHT: rcdHTparEch,
        rcdTax: rcdTaxParEch,
        rcdTTC: rcdParEch,
        pjHT,
        pjTax,
        pjTTC: pj,
        fraisGestion: FGparEch,
        totalTTC: rcdParEch + pj + FGparEch,
      });
    });
  } else if (schedule.periodicity === "trimestriel") {
    for (let k = 0; k < 4; k++) {
      const d = dateSerial(yrnext, 3 * k + 1, 1);
      const pj = k === 0 ? totals.pjTTC : 0;
      const pjHT = k === 0 ? totals.pjHT : 0;
      const pjTax = k === 0 ? totals.pjTax : 0;
      res.push({
        date: d.toISOString().slice(0, 10),
        rcdHT: rcdHTparEch,
        rcdTax: rcdTaxParEch,
        rcdTTC: rcdParEch,
        pjHT,
        pjTax,
        pjTTC: pj,
        fraisGestion: FGparEch,
        totalTTC: rcdParEch + pj + FGparEch,
      });
    }
  } else {
    // mensuel
    for (let m = 1; m <= 12; m++) {
      const d = dateSerial(yrnext, m, 1);
      const pj = m === 1 ? totals.pjTTC : 0;
      const pjHT = m === 1 ? totals.pjHT : 0;
      const pjTax = m === 1 ? totals.pjTax : 0;
      res.push({
        date: d.toISOString().slice(0, 10),
        rcdHT: rcdHTparEch,
        rcdTax: rcdTaxParEch,
        rcdTTC: rcdParEch,
        pjHT,
        pjTax,
        pjTTC: pj,
        fraisGestion: FGparEch,
        totalTTC: rcdParEch + pj + FGparEch,
      });
    }
  }

  return res;
}

// // ---------- API principale

// export function calculateRcdPremium(params: PremiumParams) {
//   // 0) Refus « métier »
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

//   // 3) Échéancier (année N partielle + année N+1)
//   const schedule = buildSchedule(totals, params.schedule);

//   return {
//     inputsEcho: params,
//     baseBreakdown: base,
//     totals, // taxe, FG, PJ, TTC
//     schedule, // lignes datées (RCD HT/Tax/TTC, PJ, FG, total TTC)
//   };
// }
// --- util arrondi à l’euro (comme l’Excel affiché)
const eur = (n: number) => Math.round(n);

type ActivityRow = {
  code: string;
  baseRate: number; // ex 0.0407
  appliedRate: number; // taux dégressif appliqué à l'activité (au-delà)
  caSharePercent: number; // part CA de cette activité
  caShare: number; // montant CA de cette activité
  reducAt500k: number; // facteur réduction à 500k
  reducAt1M: number; // facteur réduction à 1M
  thresholdStart: number; // seuil déclenchement dégressivité
  weightInTotalBeyondPct: number; // poids % dans le "TOTAL au-delà de Pmini" (avant coeff)
  primeBeyondHT: number; // prime au-delà HT (avant coeff), par activité
  degressivityApplied: boolean; // true si dégressivité appliquée
};

type ActivityBreakdown = {
  rows: ActivityRow[];
  totalBeyondHT_noCoeff: number; // "TOTAL au-delà de Pmini" avant coeff
  primeMiniAddedHT_noCoeff: number; // "Prime mini ajoutée" (pmini) avant coeff
  totalWithoutCoeffsHT: number; // total sans majorations/minorations (l. "TOTAL sans majorations/min")
  withCoeffs: {
    coeffTotalPct: number; // ex 20 (%)
    primeMiniHT: number; // pmini * (1 + coeff)
    primeBeyondHT: number; // totalBeyond * (1 + coeff)
    totalRcdHT: number; // somme = base RCD HT
  };
};

type RecapLikeExcel = {
  ttcAnnuelAvecPJ: number; // "TARIF TOTAL TTC € ANNUEL (avec PJ)"
  baseRcdHT: number; // "dont TARIF de BASE RCD (HT)"
  coeffTotalPct: number; // "dont majorations"
  fraisGestionPct: number; // "% sur RCD HT"
  fraisGestionMontant: number; // "montant €"
  taxeAssuranceMontant: number;
  taxeAssuranceTaux: number; // ex 4.5%
  fraisFractionnementHT: number;
  nbEcheances: number;
  protectionJuridiqueTTC: number;
  totalAutres: number; // taxe + frais fract + PJ
};

// === NOUVEAU : détail par activité (comme le tableau)
function buildActivityBreakdown(
  CA_total: number,
  activities: ActivityShare[],
  tables: Tables,
  coeffTotal: number,
  pmini: number
): ActivityBreakdown {
  const beyondBase = Math.max(0, CA_total - tables.plafondPmini);

  // lignes par activité (avant coeff)
  const rowsRaw: ActivityRow[] = activities.map((a) => {
    const p = tables.actiscorByCode[a.code];
    if (!p) throw new Error(`Code activité inconnu: ${a.code}`);
    const rateApplied = txDeg_2Pentes(
      CA_total,
      p.baseRate,
      tables.plafondPmini,
      p.thresholdStart,
      tables.plafondCA,
      p.reducAt500k,
      p.reducAt1M
    );
    const primeBeyondHT = beyondBase * rateApplied * (a.caSharePercent / 100);
    const caShare = CA_total * (a.caSharePercent / 100);
    const degressivityApplied = CA_total > p.thresholdStart;

    return {
      code: a.code,
      baseRate: p.baseRate,
      appliedRate: rateApplied,
      caSharePercent: a.caSharePercent,
      caShare,
      reducAt500k: p.reducAt500k,
      reducAt1M: p.reducAt1M,
      thresholdStart: p.thresholdStart,
      weightInTotalBeyondPct: 0, // rempli après
      primeBeyondHT,
      degressivityApplied,
    };
  });

  // totaux et poids
  const totalBeyondHT_noCoeff = rowsRaw.reduce(
    (s, r) => s + r.primeBeyondHT,
    0
  );
  const rows = rowsRaw.map((r) => ({
    ...r,
    weightInTotalBeyondPct:
      totalBeyondHT_noCoeff > 0
        ? Math.round((r.primeBeyondHT / totalBeyondHT_noCoeff) * 100)
        : 0,
  }));

  const primeMiniAddedHT_noCoeff = pmini;
  const totalWithoutCoeffsHT = pmini + totalBeyondHT_noCoeff;

  // avec coeffs
  const primeMiniHT = pmini * (1 + coeffTotal);
  const primeBeyondHT = totalBeyondHT_noCoeff * (1 + coeffTotal);
  const totalRcdHT = primeMiniHT + primeBeyondHT;

  return {
    rows,
    totalBeyondHT_noCoeff: eur(totalBeyondHT_noCoeff),
    primeMiniAddedHT_noCoeff: eur(primeMiniAddedHT_noCoeff),
    totalWithoutCoeffsHT: eur(totalWithoutCoeffsHT),
    withCoeffs: {
      coeffTotalPct: Math.round(100 * coeffTotal),
      primeMiniHT: eur(primeMiniHT),
      primeBeyondHT: eur(primeBeyondHT),
      totalRcdHT: eur(totalRcdHT),
    },
  };
}

// === Tableau détaillé par année (comme Excel)
type YearlyDetailRow = {
  annee: number;
  htRcd: number;
  taxeRcd: number;
  ttcRcd: number;
  htReprise: number;
  taxeReprise: number;
  totalReprise: number;
  htPj: number;
  taxePj: number;
  ttcPj: number;
  htFraisG: number;
  taxeFraisG: number;
  ttcFraisG: number;
  htTotal: number;
  taxeTotal: number;
  ttcTotal: number;
};

function buildYearlyDetail(
  schedule: ScheduleLine[],
  effectiveDateISO: string
): YearlyDetailRow[] {
  const effectiveDate = parseISO(effectiveDateISO);
  const yearEffective = yearOf(effectiveDate);

  // Grouper les échéances par année
  const yearlyTotals: Map<
    number,
    {
      htRcd: number;
      taxeRcd: number;
      ttcRcd: number;
      htPj: number;
      taxePj: number;
      ttcPj: number;
      htFraisG: number;
      ttcFraisG: number;
    }
  > = new Map();

  schedule.forEach((line) => {
    const lineDate = parseISO(line.date);
    const year = yearOf(lineDate);

    if (!yearlyTotals.has(year)) {
      yearlyTotals.set(year, {
        htRcd: 0,
        taxeRcd: 0,
        ttcRcd: 0,
        htPj: 0,
        taxePj: 0,
        ttcPj: 0,
        htFraisG: 0,
        ttcFraisG: 0,
      });
    }

    const yearData = yearlyTotals.get(year)!;
    yearData.htRcd += line.rcdHT;
    yearData.taxeRcd += line.rcdTax;
    yearData.ttcRcd += line.rcdTTC;
    yearData.htPj += line.pjHT;
    yearData.taxePj += line.pjTax;
    yearData.ttcPj += line.pjTTC;
    yearData.htFraisG += line.fraisGestion;
    yearData.ttcFraisG += line.fraisGestion; // Frais gestion pas de taxe dans le VBA
  });

  // Convertir en tableau de lignes
  const result: YearlyDetailRow[] = [];
  for (const [year, data] of yearlyTotals.entries()) {
    const htTotal = data.htRcd + data.htPj + data.htFraisG;
    const taxeTotal = data.taxeRcd + data.taxePj; // pas de taxe sur frais gestion
    const ttcTotal = data.ttcRcd + data.ttcPj + data.ttcFraisG;

    result.push({
      annee: year,
      htRcd: eur(data.htRcd),
      taxeRcd: eur(data.taxeRcd),
      ttcRcd: eur(data.ttcRcd),
      htReprise: 0, // Pas de reprise du passé dans notre exemple
      taxeReprise: 0,
      totalReprise: 0,
      htPj: eur(data.htPj),
      taxePj: eur(data.taxePj),
      ttcPj: eur(data.ttcPj),
      htFraisG: eur(data.htFraisG),
      taxeFraisG: 0, // Frais gestion HT (pas de taxe)
      ttcFraisG: eur(data.ttcFraisG),
      htTotal: eur(htTotal),
      taxeTotal: eur(taxeTotal),
      ttcTotal: eur(ttcTotal),
    });
  }

  // Trier par année
  result.sort((a, b) => a.annee - b.annee);
  return result;
}

// === Tableau détail par poste (année en cours vs annuel)
type PrimeDetailRow = {
  type: "HT" | "taxe" | "TTC";
  anneeEnCours: {
    rcd: number;
    pj: number;
    totalHorsFG: number;
    fraisG: number;
    totalYcFG: number;
    reprise: number;
    totalRcdPjFraisReprise: number;
  };
  annuel: {
    rcd: number;
    pj: number;
    totalHorsFG: number;
    fraisG: number;
    totalYcFG: number;
    reprise: number;
    totalRcdPjFraisReprise: number;
  };
};

function buildPrimeDetailByPoste(
  schedule: ScheduleLine[],
  totals: ReturnType<typeof buildTTCAndExtras>,
  effectiveDateISO: string
): PrimeDetailRow[] {
  const effectiveDate = parseISO(effectiveDateISO);
  const currentYear = yearOf(effectiveDate);

  // Séparer les échéances par année
  const currentYearLines = schedule.filter(
    (line) => yearOf(parseISO(line.date)) === currentYear
  );
  const nextYearLines = schedule.filter(
    (line) => yearOf(parseISO(line.date)) > currentYear
  );

  // Calculer les totaux pour l'année en cours
  const currentYearTotals = currentYearLines.reduce(
    (acc, line) => ({
      rcdHT: acc.rcdHT + line.rcdHT,
      rcdTax: acc.rcdTax + line.rcdTax,
      rcdTTC: acc.rcdTTC + line.rcdTTC,
      pjHT: acc.pjHT + line.pjHT,
      pjTax: acc.pjTax + line.pjTax,
      pjTTC: acc.pjTTC + line.pjTTC,
      fraisGestion: acc.fraisGestion + line.fraisGestion,
    }),
    {
      rcdHT: 0,
      rcdTax: 0,
      rcdTTC: 0,
      pjHT: 0,
      pjTax: 0,
      pjTTC: 0,
      fraisGestion: 0,
    }
  );

  // Calculer les totaux pour l'année suivante (annuel)
  const nextYearTotals = nextYearLines.reduce(
    (acc, line) => ({
      rcdHT: acc.rcdHT + line.rcdHT,
      rcdTax: acc.rcdTax + line.rcdTax,
      rcdTTC: acc.rcdTTC + line.rcdTTC,
      pjHT: acc.pjHT + line.pjHT,
      pjTax: acc.pjTax + line.pjTax,
      pjTTC: acc.pjTTC + line.pjTTC,
      fraisGestion: acc.fraisGestion + line.fraisGestion,
    }),
    {
      rcdHT: 0,
      rcdTax: 0,
      rcdTTC: 0,
      pjHT: 0,
      pjTax: 0,
      pjTTC: 0,
      fraisGestion: 0,
    }
  );

  const result: PrimeDetailRow[] = [
    // Ligne HT
    {
      type: "HT",
      anneeEnCours: {
        rcd: eur(currentYearTotals.rcdHT),
        pj: eur(currentYearTotals.pjHT),
        totalHorsFG: eur(currentYearTotals.rcdHT + currentYearTotals.pjHT),
        fraisG: eur(currentYearTotals.fraisGestion),
        totalYcFG: eur(
          currentYearTotals.rcdHT +
            currentYearTotals.pjHT +
            currentYearTotals.fraisGestion
        ),
        reprise: 0, // pas de reprise dans notre exemple
        totalRcdPjFraisReprise: eur(
          currentYearTotals.rcdHT +
            currentYearTotals.pjHT +
            currentYearTotals.fraisGestion
        ),
      },
      annuel: {
        rcd: eur(nextYearTotals.rcdHT),
        pj: eur(nextYearTotals.pjHT),
        totalHorsFG: eur(nextYearTotals.rcdHT + nextYearTotals.pjHT),
        fraisG: eur(nextYearTotals.fraisGestion),
        totalYcFG: eur(
          nextYearTotals.rcdHT +
            nextYearTotals.pjHT +
            nextYearTotals.fraisGestion
        ),
        reprise: 0,
        totalRcdPjFraisReprise: eur(
          nextYearTotals.rcdHT +
            nextYearTotals.pjHT +
            nextYearTotals.fraisGestion
        ),
      },
    },
    // Ligne taxe
    {
      type: "taxe",
      anneeEnCours: {
        rcd: eur(currentYearTotals.rcdTax),
        pj: eur(currentYearTotals.pjTax),
        totalHorsFG: eur(currentYearTotals.rcdTax + currentYearTotals.pjTax),
        fraisG: 0, // pas de taxe sur frais gestion
        totalYcFG: eur(currentYearTotals.rcdTax + currentYearTotals.pjTax),
        reprise: 0,
        totalRcdPjFraisReprise: eur(
          currentYearTotals.rcdTax + currentYearTotals.pjTax
        ),
      },
      annuel: {
        rcd: eur(nextYearTotals.rcdTax),
        pj: eur(nextYearTotals.pjTax),
        totalHorsFG: eur(nextYearTotals.rcdTax + nextYearTotals.pjTax),
        fraisG: 0,
        totalYcFG: eur(nextYearTotals.rcdTax + nextYearTotals.pjTax),
        reprise: 0,
        totalRcdPjFraisReprise: eur(
          nextYearTotals.rcdTax + nextYearTotals.pjTax
        ),
      },
    },
    // Ligne TTC
    {
      type: "TTC",
      anneeEnCours: {
        rcd: eur(currentYearTotals.rcdTTC),
        pj: eur(currentYearTotals.pjTTC),
        totalHorsFG: eur(currentYearTotals.rcdTTC + currentYearTotals.pjTTC),
        fraisG: eur(currentYearTotals.fraisGestion),
        totalYcFG: eur(
          currentYearTotals.rcdTTC +
            currentYearTotals.pjTTC +
            currentYearTotals.fraisGestion
        ),
        reprise: 0,
        totalRcdPjFraisReprise: eur(
          currentYearTotals.rcdTTC +
            currentYearTotals.pjTTC +
            currentYearTotals.fraisGestion
        ),
      },
      annuel: {
        rcd: eur(nextYearTotals.rcdTTC),
        pj: eur(nextYearTotals.pjTTC),
        totalHorsFG: eur(nextYearTotals.rcdTTC + nextYearTotals.pjTTC),
        fraisG: eur(nextYearTotals.fraisGestion),
        totalYcFG: eur(
          nextYearTotals.rcdTTC +
            nextYearTotals.pjTTC +
            nextYearTotals.fraisGestion
        ),
        reprise: 0,
        totalRcdPjFraisReprise: eur(
          nextYearTotals.rcdTTC +
            nextYearTotals.pjTTC +
            nextYearTotals.fraisGestion
        ),
      },
    },
  ];

  return result;
}

// === on enrichit la fonction principale avec ces sorties
export function calculateRcdPremium(params: PremiumParams) {
  if (params.subContractingPercent > 15 || params.tradingPercent > 15)
    throw new Error("Refus: sous-traitance/négoce > 15%");
  if (params.headcountETP > 8) throw new Error("Refus: effectif > 8 ETP");
  if (params.caDeclared > params.tables.plafondCA)
    throw new Error("Refus: CA > plafond CA");

  // 1) Prime HT (base + coeffs)
  const base = computeHTBase(
    params.caDeclared,
    params.headcountETP,
    params.activities,
    params.tables,
    {
      hasQualification: params.coeff.hasQualification,
      creationDateISO: params.coeff.creationDateISO,
      yearsExperience: params.coeff.yearsExperience,
      previousRcdStatus: params.coeff.previousRcdStatus,
      previousResiliationDate: params.coeff.previousResiliationDate ?? null,
      lossHistory: params.coeff.lossHistory,
    }
  );

  // 1bis) Détail par activité (tableaux)
  const activityBreakdown = buildActivityBreakdown(
    base.CA_total,
    params.activities,
    params.tables,
    base.coeffTotal,
    base.pmini
  );

  // 2) Taxes / Frais / PJ / TTC
  const includePJ =
    params.schedule.includePJ ?? params.tables.pjEnabledByDefault ?? true;
  const totals = buildTTCAndExtras(
    base.primeHT,
    params.territory,
    params.tables,
    params.schedule.periodicity,
    includePJ
  );

  // 3) Échéancier
  const schedule = buildSchedule(totals, params.schedule);

  // 3bis) Tableau détaillé par année
  const yearlyDetail = buildYearlyDetail(
    schedule,
    params.schedule.effectiveDateISO
  );

  // 3ter) Tableau prime détail par poste
  const primeDetailByPoste = buildPrimeDetailByPoste(
    schedule,
    totals,
    params.schedule.effectiveDateISO
  );

  // 4) Récap “façon Excel”
  const recap: RecapLikeExcel = {
    ttcAnnuelAvecPJ: eur(totals.ttc),
    baseRcdHT: eur(base.primeHT),
    coeffTotalPct: Math.round(100 * base.coeffTotal),
    fraisGestionPct: Math.round(100 * (params.tables.fraisGestionRate ?? 0)),
    fraisGestionMontant: eur(totals.fraisGestion),
    taxeAssuranceMontant: eur(totals.taxe),
    taxeAssuranceTaux: Math.round(1000 * (totals.taxRate ?? 0)) / 10, // ex 0.045 -> 4.5
    fraisFractionnementHT: eur(totals.fraisFract),
    nbEcheances: totals.nEch,
    protectionJuridiqueTTC: eur(totals.pjTTC),
    totalAutres: eur(totals.taxe + totals.fraisFract + totals.pjTTC),
  };

  // Calculs additionnels pour l'affichage
  const effectiveDate = parseISO(params.schedule.effectiveDateISO);
  const daysRemainingInYear = daysDiffInclusive(
    effectiveDate,
    dateSerial(yearOf(effectiveDate), 12, 31)
  );
  const daysInYear = DAYS_IN_YEAR;

  return {
    // Données d'entrée
    inputsEcho: params,

    // Analyse du CA
    caAnalysis: {
      caDeclared: base.CA_declared,
      caPerETP: base.ETP > 0 ? base.CA_declared / base.ETP : 0,
      caCorrected: base.CA_total,
      correctionApplied: base.CA_total !== base.CA_declared,
      etpCount: base.ETP,
      isAbovePminiThreshold: base.isAbovePminiThreshold,
      caAbovePmini: base.caAbovePmini,
      pminiThreshold: params.tables.plafondPmini,
    },

    // Détail complet du calcul de base
    baseBreakdown: {
      ...base,
      // versions arrondies utiles pour affichage
      primeHT_rounded: eur(base.primeHT),
      primeMini_afterCoeff_rounded: eur(base.primeMiniHT_afterCoeff),
      primeBeyond_afterCoeff_rounded: eur(base.primeAuDelaHT_afterCoeff),
      primeBeforeCoeff_rounded: eur(base.primeBeforeCoeff),
      tauxMoyenBase_percent: Math.round(base.tauxMoyenBase * 10000) / 100, // en %
      txMoyAuDela_percent: Math.round(base.txMoyAuDela * 10000) / 100, // en %
    },

    // Détail par activité enrichi
    activityBreakdown,

    // Détail des coefficients
    coefficientsDetail: base.coeffBreakdown,

    // Récapitulatif façon Excel
    recapLikeExcel: recap,

    // Détail taxes et frais
    taxesAndFees: {
      taxes: {
        rate: totals.taxRate,
        amount: totals.taxe,
        territory: params.territory,
      },
      fees: {
        managementFeeRate: params.tables.fraisGestionRate ?? 0,
        managementFeeAmount: totals.fraisGestion,
        installmentCount: totals.nEch,
        installmentFeesHT: totals.fraisFract,
        unitCostPerInstallment: params.tables.echeanceUnitCost,
      },
      ...totals,
      taxRate_percent: Math.round(totals.taxRate * 1000) / 10, // ex: 4.5%
      fraisGestionRate_percent:
        Math.round((params.tables.fraisGestionRate ?? 0) * 1000) / 10,
      pjIncluded: includePJ,
      pjRate_percent: includePJ
        ? Math.round((PJ_HT / base.primeHT) * 1000) / 10
        : 0,
    },

    // Analyse temporelle
    scheduleAnalysis: {
      effectiveDate: params.schedule.effectiveDateISO,
      periodicity: params.schedule.periodicity,
      nbEcheances: totals.nEch,
      daysRemainingInYear,
      daysInYear,
      prorataFirstYear:
        Math.round((daysRemainingInYear / daysInYear) * 1000) / 10, // en %
      pjIncluded: includePJ,
      pjAnnualPremiumTTC: totals.pjTTC,
      totalAnnualHT: base.primeHT + totals.fraisFract,
      totalAnnualTTC: totals.ttc,
      averageInstallmentTTC: totals.ttc / totals.nEch,
      schedule, // échéancier complet
    },

    // Méta-informations
    calculationMeta: {
      timestamp: new Date().toISOString(),
      activitiesCount: params.activities.length,
      activityCodes: params.activities.map((a) => a.code),
      hasSubcontracting: params.subContractingPercent > 0,
      hasTrading: params.tradingPercent > 0,
      caCorrectionApplied: base.CA_total !== base.CA_declared,
      isAbovePminiThreshold: base.isAbovePminiThreshold,
      rulesApplied: {
        caCorrection: base.CA_total !== base.CA_declared,
        primeMinForced: base.isPrimeMinForced,
        degressivityApplied: activityBreakdown.rows.some(
          (r) => r.degressivityApplied
        ),
        coefficientsApplied: Math.abs(base.coeffTotal) > 0.001,
        pjIncluded: includePJ,
      },
      limits: {
        pminiPlancher: params.tables.pminiPlancher,
        plafondPmini: params.tables.plafondPmini,
        plafondCA: params.tables.plafondCA,
        maxETP: 8,
        maxSubcontracting: 15,
        maxTrading: 15,
      },
      territory: params.territory,
    },

    // Tableau détaillé par année
    yearlyDetail,

    // Tableau prime détail par poste
    primeDetailByPoste,

    // Totaux et échéancier pour compatibilité
    totals,
    schedule,
  };
}

function verifRefus(params: {
  activiteSansEtreAssure: boolean;
  experienceDirigeant: number;
  ancienneAssurance: string;
}) {
  const { activiteSansEtreAssure, experienceDirigeant, ancienneAssurance } =
    params;

  const refus = {
    activiteSansEtreAssure: activiteSansEtreAssure,
    experienceDirigeant: experienceDirigeant < 1,
    // ancienneAssurance: ancienneAssurance === "RESILIE",
    ancienneAssurance: false,
  };

  return refus;
}

function calculateMajorations(params: {
  etp: number;
  nbActivites: number;
  qualif: boolean;
  dateCreation: Date;
  tempsSansActivite12mois: boolean;
  anneeExperience: number;
  assureurDefaillant: boolean;
  nombreAnneeAssuranceContinue: number;
}) {
  const {
    etp,
    nbActivites,
    qualif,
    dateCreation,
    tempsSansActivite12mois,
    anneeExperience,
    assureurDefaillant,
    nombreAnneeAssuranceContinue,
  } = params;

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
    if (anneeExperience > 5) return -0.05;
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
    tempsSansActivite12mois: tempsSansActivite12mois ? 0.2 : 0,
    anneeExperience: calculMajExp(anneeExperience),
    assureurDefaillant: assureurDefaillant ? 0.2 : 0,
    nombreAnneeAssuranceContinue: calculMajNAAC(nombreAnneeAssuranceContinue),
  };

  return majorations;
}
const tableauTax = [
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
  const { caDeclared, tableauDeg } = params;

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
    if (caDeclared < 250_000) {
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
export function calculPrimeRCD(params: {
  caDeclared: number;
  etp: number;
  activites: { code: number; caSharePercent: number }[];
  dateCreation: Date;
  tempsSansActivite12mois: boolean;
  anneeExperience: number;
  assureurDefaillant: boolean;
  nombreAnneeAssuranceContinue: number;
  qualif: boolean;
  ancienneAssurance: string;
  activiteSansEtreAssure: boolean;
  experienceDirigeant: number;
  // Nouveaux paramètres pour la reprise du passé
  nomDeLAsurreur: string;
  dateEffet?: string; // Date d'effet du contrat (ISO)
  dateFinCouverturePrecedente?: string; // Date de fin de couverture précédente (ISO)
  sinistresPrecedents?: SinistrePasse[]; // Sinistres des 5 dernières années
  tauxTI?: number; // Taux TI par année (ex: 0.700 pour N)
  coefficientAntecedent?: number; // Coefficient selon ancienneté
}) {
  const {
    caDeclared,
    etp,
    activites: activitesRaw,
    dateCreation,
    tempsSansActivite12mois,
    anneeExperience,
    assureurDefaillant,
    nombreAnneeAssuranceContinue,
    qualif,
    ancienneAssurance,
    activiteSansEtreAssure,
    experienceDirigeant,
    // Paramètres reprise du passé
    nomDeLAsurreur,
    dateEffet,
    dateFinCouverturePrecedente,
    sinistresPrecedents = [],
    tauxTI = 0.7, // Valeur par défaut pour l'année N
    coefficientAntecedent = 1.0,
  } = params;

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

  const caCalculee = caDeclared;

  const refus = verifRefus({
    activiteSansEtreAssure,
    experienceDirigeant,
    ancienneAssurance,
  });

  const isAssureurDefaillant = assureursDefaillants.includes(nomDeLAsurreur);

  const majorations = calculateMajorations({
    etp,
    nbActivites: activites.length,
    qualif,
    dateCreation,
    tempsSansActivite12mois,
    anneeExperience,
    assureurDefaillant,
    nombreAnneeAssuranceContinue,
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
    refus: boolean;
    refusReason: string;
    returnTab: returnTab[];
    PminiHT: number;
    PrimeHT: number;
    majorations: typeof majorations;
    reprisePasseResult?: ReprisePasseResult; // Résultat du calcul de reprise du passé
  };

  const plafond = 70_000;

  const returnTab: returnTab[] = [];

  const returnValue: returnValue = {
    refus:
      refus.activiteSansEtreAssure ||
      refus.experienceDirigeant ||
      refus.ancienneAssurance,
    refusReason: refus.activiteSansEtreAssure
      ? "Activité sans être assurée"
      : refus.experienceDirigeant
      ? "Expérience du dirigeant"
      : refus.ancienneAssurance
      ? "Ancienne assurance"
      : "",
    returnTab: [],
    PminiHT: 0,
    PrimeHT: 0,
    majorations: majorations,
    reprisePasseResult: undefined,
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
    caDeclared,
    tableauDeg: tableauDegAvant,
  });
  console.log("tableauDeg", tableauDeg);

  activites.forEach((activite) => {
    const rate = tableauTax.find((tax) => tax.code === activite.code)?.rate;
    const tauxBase = rate ? rate * (1 + majorations.dateCreation) : 0;
    const primeMiniAct = tauxBase * plafond;
    const degMax = tableauDeg.find(
      (deg) => deg.code === activite.code
    )?.degressivity;
    const deg400k = tableauDeg.find(
      (deg) => deg.code === activite.code && deg.type === "CA"
    )?.degressivity;
    const primeRefAct = deg400k ? primeMiniAct * deg400k : primeMiniAct;
    const prime100Ref = deg400k
      ? tauxBase * deg400k * caCalculee - primeRefAct
      : 0;
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

  returnValue.PminiHT =
    plafond *
    calculSommeTauxActPartCa(activites, tableauTax) *
    (1 + majorations.dateCreation);
  returnValue.PrimeHT =
    returnValue.PminiHT +
    returnTab.reduce((acc, activite) => acc + activite.Prime100Min, 0);
  returnValue.returnTab = returnTab;

  // Calcul de la reprise du passé si activée
  if (isAssureurDefaillant && dateEffet && dateFinCouverturePrecedente) {
    try {
      const reprisePasseResult = calculReprisePasseRCD({
        tauxTI,
        primeAnnuelleHT: returnValue.PrimeHT,
        dateEffet,
        dateFinCouverturePrecedente,
        sinistresPrecedents,
        coefficientAntecedent,
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

// ========== CALCUL REPRISE DU PASSÉ ==========

type SinistrePasse = {
  year: number;
  numClaims: number;
  totalCost: number;
};

type ReprisePasseParams = {
  tauxTI: number; // Taux TI par année (ex: 0.700 pour N, 0.686 pour N-1, etc.)
  primeAnnuelleHT: number; // Prime annuelle calculée avec tous les coefficients
  dateEffet: string; // Date d'effet du contrat (ISO)
  dateFinCouverturePrecedente: string; // Date de fin de couverture précédente (ISO)
  sinistresPrecedents: SinistrePasse[]; // Sinistres des 5 dernières années
  coefficientAntecedent: number; // Coefficient selon ancienneté (0.3, 0.6, 1, 1.4, 1.7, etc.)
};

type ReprisePasseResult = {
  // Calculs intermédiaires
  pourcentageAnneeReprise: number; // % de l'année de reprise (ex: 10/12 = 83.33%)
  tauxTIPondere: number; // Taux TI pondéré par le %

  // Analyse sinistralité
  ratioSP: number; // S/P = (coût sinistres cumulé) / (prime annuelle HT * coeff antécédent)
  frequenceSinistres: number; // Min(Nb sinistres / Nb années ; Nb sinistres avec suite / Nb années)

  // Classification selon le tableau
  categorieAnciennete: string; // "< 3ans", "3 à 7 ans", "> 7 ans"
  categorieFrequence: string; // "0", "0 à 0.5", "0.5 à 1", "1 à 2", "> 2"
  categorieRatioSP: string; // "0", "0 à 0.5", "0.5 à 0.7", "0.7 à 1", "> 1"

  // Résultat final
  coefficientMajoration: number; // Coefficient de majoration à appliquer (0.8 à 1.3 ou "Analyse Cie")
  analyseCompagnieRequise: boolean; // true si "Analyse Cie" dans le tableau
  primeReprisePasseTTC: number; // Prime de reprise du passé TTC finale

  // Détail du calcul
  calculDetail: {
    sommeDesTauxTI: number; // Somme des taux TI pondérés
    primeAnnuelleAvecCoeff: number; // Prime * coefficient antécédent
    primeRepriseAvantMajoration: number; // Somme(TI) × Prime annuelle calculée avec tous les coefficients
    primeRepriseApresMajoration: number; // Avant majoration × coefficient majoration
  };
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
    tauxTI,
    primeAnnuelleHT,
    dateEffet,
    dateFinCouverturePrecedente,
    sinistresPrecedents,
    coefficientAntecedent,
  } = params;

  // 1. Calcul du pourcentage de l'année de reprise
  const dateEffetObj = parseISO(dateEffet);
  const dateFinObj = parseISO(dateFinCouverturePrecedente);

  // Calculer la différence en mois (exemple du document: 10/12 de N-9)
  const diffMs = dateEffetObj.getTime() - dateFinObj.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const pourcentageAnneeReprise = Math.min(1, diffDays / 365); // Plafonné à 100%

  // 2. Taux TI pondéré par le pourcentage
  const tauxTIPondere = tauxTI * pourcentageAnneeReprise;

  // 3. Analyse de la sinistralité
  const nbAnnees =
    sinistresPrecedents.length > 0
      ? Math.max(
          1,
          new Date().getFullYear() -
            Math.min(...sinistresPrecedents.map((s) => s.year))
        )
      : 1;

  const totalCoutSinistres = sinistresPrecedents.reduce(
    (sum, s) => sum + s.totalCost,
    0
  );
  const totalNbSinistres = sinistresPrecedents.reduce(
    (sum, s) => sum + s.numClaims,
    0
  );
  const nbSinistresAvecSuite = sinistresPrecedents.filter(
    (s) => s.numClaims > 0
  ).length;

  // Calcul S/P selon la formule du document
  const primeAnnuelleAvecCoeff = primeAnnuelleHT * coefficientAntecedent;
  const ratioSP =
    primeAnnuelleAvecCoeff > 0
      ? totalCoutSinistres / primeAnnuelleAvecCoeff
      : 0;

  // Calcul fréquence selon la formule du document
  const freq1 = nbAnnees > 0 ? totalNbSinistres / nbAnnees : 0;
  const freq2 = nbAnnees > 0 ? nbSinistresAvecSuite / nbAnnees : 0;
  const frequenceSinistres = Math.min(freq1, freq2);

  // 4. Classification selon les tableaux
  let categorieAnciennete: string;
  if (nbAnnees < 3) categorieAnciennete = "< 3ans";
  else if (nbAnnees <= 7) categorieAnciennete = "3 à 7 ans";
  else categorieAnciennete = "> 7 ans";

  let categorieFrequence: string;
  if (frequenceSinistres === 0) categorieFrequence = "0";
  else if (frequenceSinistres <= 0.5) categorieFrequence = "0 à 0.5";
  else if (frequenceSinistres <= 1) categorieFrequence = "0.5 à 1";
  else if (frequenceSinistres <= 2) categorieFrequence = "1 à 2";
  else categorieFrequence = "> 2";

  let categorieRatioSP: string;
  if (ratioSP === 0) categorieRatioSP = "0";
  else if (ratioSP <= 0.5) categorieRatioSP = "0 à 0.5";
  else if (ratioSP <= 0.7) categorieRatioSP = "0.5 à 0.7";
  else if (ratioSP <= 1) categorieRatioSP = "0.7 à 1";
  else categorieRatioSP = "> 1";

  // 5. Détermination du coefficient de majoration selon le tableau
  let coefficientMajoration = 1.0;
  let analyseCompagnieRequise = false;

  // Logique basée sur le tableau de la deuxième image
  // Cette logique devrait être affinée selon les règles exactes du tableau
  if (categorieAnciennete === "< 3ans") {
    if (categorieFrequence === "0") {
      coefficientMajoration = 1.0;
    } else if (categorieFrequence === "0 à 0.5") {
      if (categorieRatioSP === "0 à 0.5") coefficientMajoration = 1.1;
      else if (categorieRatioSP === "0.5 à 0.7") coefficientMajoration = 1.2;
      else if (categorieRatioSP === "0.7 à 1") coefficientMajoration = 1.3;
      else analyseCompagnieRequise = true;
    } else {
      analyseCompagnieRequise = true;
    }
  } else if (categorieAnciennete === "3 à 7 ans") {
    if (categorieFrequence === "0") {
      coefficientMajoration = 0.9;
    } else if (categorieFrequence === "0 à 0.5") {
      if (categorieRatioSP === "0 à 0.5") coefficientMajoration = 0.97;
      else if (categorieRatioSP === "0.5 à 0.7") coefficientMajoration = 1.1;
      else if (categorieRatioSP === "0.7 à 1") coefficientMajoration = 1.2;
      else analyseCompagnieRequise = true;
    } else {
      analyseCompagnieRequise = true;
    }
  } else {
    // > 7 ans
    if (categorieFrequence === "0") {
      coefficientMajoration = 0.8;
    } else if (categorieFrequence === "0 à 0.5") {
      if (categorieRatioSP === "0 à 0.5") coefficientMajoration = 0.9;
      else if (categorieRatioSP === "0.5 à 0.7") coefficientMajoration = 1.0;
      else if (categorieRatioSP === "0.7 à 1") coefficientMajoration = 1.1;
      else if (categorieRatioSP === "> 1") coefficientMajoration = 1.2;
    } else if (categorieFrequence === "0.5 à 1") {
      if (categorieRatioSP === "0.5 à 0.7") coefficientMajoration = 0.95;
      else if (categorieRatioSP === "0.7 à 1") coefficientMajoration = 1.05;
      else if (categorieRatioSP === "> 1") coefficientMajoration = 1.15;
      else analyseCompagnieRequise = true;
    } else {
      analyseCompagnieRequise = true;
    }
  }

  // 6. Calculs finaux
  const sommeDesTauxTI = tauxTIPondere; // Dans cet exemple simple, on n'a qu'un taux
  const primeRepriseAvantMajoration = sommeDesTauxTI * primeAnnuelleHT;
  const primeRepriseApresMajoration = analyseCompagnieRequise
    ? primeRepriseAvantMajoration
    : primeRepriseAvantMajoration * coefficientMajoration;

  // Prime TTC (exemple avec 20% de taxe, à adapter selon le territoire)
  const primeReprisePasseTTC = primeRepriseApresMajoration * 1.2;

  return {
    pourcentageAnneeReprise: Math.round(pourcentageAnneeReprise * 10000) / 100, // en %
    tauxTIPondere,
    ratioSP: Math.round(ratioSP * 100) / 100,
    frequenceSinistres: Math.round(frequenceSinistres * 100) / 100,
    categorieAnciennete,
    categorieFrequence,
    categorieRatioSP,
    coefficientMajoration,
    analyseCompagnieRequise,
    primeReprisePasseTTC: Math.round(primeReprisePasseTTC),
    calculDetail: {
      sommeDesTauxTI,
      primeAnnuelleAvecCoeff,
      primeRepriseAvantMajoration: Math.round(primeRepriseAvantMajoration),
      primeRepriseApresMajoration: Math.round(primeRepriseApresMajoration),
    },
  };
}
