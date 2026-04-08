import { Quote, CalculationResult, PaymentInstallment } from "@/lib/types";
import { useState, useEffect, useMemo } from "react";
import { buildGetEcheanceRowValues } from "@/lib/quotes/echeance-row-values";
import { genererEcheancier, getTaxeByRegion } from "@/lib/tarificateurs/rcd";
import {
  validateEcheancierInvariants,
  type TestResult,
} from "@/lib/tarificateurs/validateEcheancierInvariants";

type UnitTestResult = {
  suite: string;
  test: string;
  ok: boolean;
  detail: string;
};

/** Échéance issue du tarificateur (ligne + index d’origine pour le tableau détaillé). */
type EcheanceTarifRow = {
  finPeriode: string | Date;
  rcd?: number;
  pj?: number;
  frais?: number;
  reprise?: number;
  taxe?: number;
};
type EcheanceAvecOrigIndex = { echeance: EcheanceTarifRow; origIndex: number };

/** Bouton admin : teste le recalcul + affiche les résultats des tests pour vérification */
function TestRecalculButton({
  quote,
  calculationResult,
  setCalculationResult,
}: {
  quote: Quote;
  calculationResult: any;
  setCalculationResult: (r: CalculationResult) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const [validationResults, setValidationResults] = useState<
    TestResult[] | null
  >(null);
  const [unitTestResults, setUnitTestResults] = useState<
    UnitTestResult[] | null
  >(null);
  const [rectifiedEcheances, setRectifiedEcheances] = useState<Array<{
    date: string;
    totalHT: number;
    taxe: number;
    totalTTC: number;
    rcd: number;
    pj: number;
    frais: number;
    reprise: number;
    fraisGestion: number;
  }> | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  const handleTest = () => {
    const formData = quote.formData as unknown as Record<string, unknown>;
    const dateDeffet = formData?.dateDeffet as string | undefined;
    const territory = formData?.territory as string | undefined;
    const periodicity = formData?.periodicity as
      | "annuel"
      | "semestriel"
      | "trimestriel"
      | "mensuel"
      | undefined;

    if (!dateDeffet || !territory || !periodicity) {
      setValidationResults([
        {
          nom: "Erreur",
          ok: false,
          detail: "Paramètres manquants (dateDeffet, territory, periodicity)",
        },
      ]);
      setShowPanel(true);
      return;
    }

    const tauxTaxe = getTaxeByRegion(territory);
    if (tauxTaxe == null) {
      setValidationResults([
        {
          nom: "Erreur",
          ok: false,
          detail: `Territoire "${territory}" inconnu`,
        },
      ]);
      setShowPanel(true);
      return;
    }

    setLoading(true);
    setValidationResults(null);
    try {
      const echeancier = genererEcheancier({
        dateDebut: new Date(dateDeffet),
        tauxTaxe,
        taxe: calculationResult?.autres?.taxeAssurance ?? 0,
        totalTTC: calculationResult?.totalTTC ?? 0,
        rcd: calculationResult?.primeTotal ?? 0,
        frais: calculationResult?.autres?.fraisFractionnementPrimeHT ?? 0,
        reprise:
          calculationResult?.reprisePasseResult?.primeReprisePasseTTC ?? 0,
        fraisGestion: calculationResult?.fraisGestion ?? 0,
        periodicite: periodicity,
        taxeN1: calculationResult?.autresN1?.taxeAssurance ?? 0,
        totalTTCN1: calculationResult?.totalTTCN1 ?? 0,
        rcdN1: calculationResult?.primeTotalN1 ?? 0,
        fraisN1: calculationResult?.autresN1?.fraisFractionnementPrimeHT ?? 0,
        fraisGestionN1: calculationResult?.fraisGestionN1 ?? 0,
      });
      setCalculationResult({ ...calculationResult, echeancier });
      setRectifiedEcheances(
        echeancier.echeances.map(
          (e: {
            date: string;
            totalHT: number;
            taxe: number;
            totalTTC: number;
            rcd: number;
            pj: number;
            frais: number;
            reprise: number;
            fraisGestion: number;
          }) => ({
            date: e.date,
            totalHT: e.totalHT,
            taxe: e.taxe,
            totalTTC: e.totalTTC,
            rcd: e.rcd,
            pj: e.pj,
            frais: e.frais,
            reprise: e.reprise ?? 0,
            fraisGestion: e.fraisGestion,
          }),
        ),
      );

      const validation = validateEcheancierInvariants(echeancier.echeances, {
        rcd: calculationResult?.primeTotal ?? 0,
        taxe: calculationResult?.autres?.taxeAssurance ?? 0,
        frais: calculationResult?.autres?.fraisFractionnementPrimeHT ?? 0,
        fraisGestion: calculationResult?.fraisGestion ?? 0,
        reprise:
          calculationResult?.reprisePasseResult?.primeReprisePasseTTC ?? 0,
        totalTTC: calculationResult?.totalTTC ?? 0,
        periodicite: periodicity,
      });
      setValidationResults(validation);
      setShowPanel(true);
    } catch (err) {
      setValidationResults([{ nom: "Erreur", ok: false, detail: String(err) }]);
      setRectifiedEcheances(null);
      setShowPanel(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRunUnitTests = async () => {
    setLoadingTests(true);
    setUnitTestResults(null);
    try {
      const res = await fetch("/api/admin/run-echeancier-tests");
      const json = await res.json();
      if (json.success && json.data?.results) {
        setUnitTestResults(json.data.results);
        setShowPanel(true);
      } else {
        setUnitTestResults([
          {
            suite: "Erreur",
            test: "API",
            ok: false,
            detail: json.error ?? "Erreur inconnue",
          },
        ]);
        setShowPanel(true);
      }
    } catch (err) {
      setUnitTestResults([
        { suite: "Erreur", test: "Fetch", ok: false, detail: String(err) },
      ]);
      setShowPanel(true);
    } finally {
      setLoadingTests(false);
    }
  };

  const hasResults =
    validationResults !== null ||
    unitTestResults !== null ||
    rectifiedEcheances !== null;
  const validationPassed = validationResults
    ? validationResults.every((r) => r.ok)
    : null;
  const unitTestsPassed = unitTestResults
    ? unitTestResults.filter((r) => r.ok).length
    : null;
  const unitTestsTotal = unitTestResults ? unitTestResults.length : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleTest}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50 transition-colors"
        >
          {loading ? "Recalcul..." : "Tester recalcul"}
        </button>
        <button
          type="button"
          onClick={handleRunUnitTests}
          disabled={loadingTests}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50 transition-colors"
        >
          {loadingTests ? "Tests..." : "Lancer tests unitaires"}
        </button>
        {hasResults && (
          <button
            type="button"
            onClick={() => setShowPanel(!showPanel)}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
          >
            {showPanel ? "Masquer" : "Afficher"} résultats
          </button>
        )}
      </div>

      {showPanel && (hasResults || rectifiedEcheances) && (
        <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm max-h-[28rem] overflow-auto text-gray-900">
          <div className="font-sans font-semibold text-gray-900 mb-2">
            Résultats des tests — copie-colle pour envoi
          </div>

          {rectifiedEcheances && rectifiedEcheances.length > 0 && (
            <div className="mb-4 text-gray-900">
              <div className="font-semibold text-gray-900 mb-2">
                Échéancier rectifié ({rectifiedEcheances.length} échéance(s))
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded bg-white">
                <table className="w-full text-xs text-gray-900">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-2 py-1.5 text-left font-medium">#</th>
                      <th className="px-2 py-1.5 text-left font-medium">
                        Date
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium">
                        RCD
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium">PJ</th>
                      <th className="px-2 py-1.5 text-right font-medium">
                        Frais
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium">FG</th>
                      <th className="px-2 py-1.5 text-right font-medium">
                        Reprise
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium">
                        Total HT
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium">
                        Taxe
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium">
                        Total TTC
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rectifiedEcheances.map((e, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-2 py-1.5">{i + 1}</td>
                        <td className="px-2 py-1.5">{e.date}</td>
                        <td className="px-2 py-1.5 text-right">
                          {e.rcd.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {e.pj.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {e.frais.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {e.fraisGestion.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {e.reprise.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium">
                          {e.totalHT.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {e.taxe.toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium">
                          {e.totalTTC.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-medium">
                      <td colSpan={7} className="px-2 py-1.5 text-right">
                        Somme
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {rectifiedEcheances
                          .reduce((s, e) => s + e.totalHT, 0)
                          .toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {rectifiedEcheances
                          .reduce((s, e) => s + e.taxe, 0)
                          .toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {rectifiedEcheances
                          .reduce((s, e) => s + e.totalTTC, 0)
                          .toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {validationResults && (
            <div className="mb-4 text-gray-900">
              <div
                className={`font-semibold mb-1 ${validationPassed ? "text-green-800" : "text-red-800"}`}
              >
                Invariants sur ce devis :{" "}
                {validationPassed ? "✓ TOUS OK" : "✗ ÉCHEC"}
              </div>
              <pre className="whitespace-pre-wrap break-words text-gray-900">
                {validationResults
                  .map((r) => `${r.ok ? "✓" : "✗"} ${r.nom}: ${r.detail}`)
                  .join("\n")}
              </pre>
            </div>
          )}

          {unitTestResults && (
            <div className="text-gray-900">
              <div
                className={`font-semibold mb-1 ${unitTestsPassed === unitTestsTotal ? "text-green-800" : "text-red-800"}`}
              >
                Tests unitaires : {unitTestsPassed}/{unitTestsTotal} OK
              </div>
              <pre className="whitespace-pre-wrap break-words text-gray-900">
                {unitTestResults
                  .map(
                    (r) =>
                      `[${r.suite}] ${r.ok ? "✓" : "✗"} ${r.test}: ${r.detail}`,
                  )
                  .join("\n")}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const getFieldLabel = (path: string): string => {
  const labels: Record<string, string> = {
    primeTotal: "Prime HT Total",
    totalTTC: "Total TTC",
    caCalculee: "CA Calculé",
    PminiHT: "Prime Minimum HT",
    primeAuDela: "Prime Au-delà",
    PrimeHTSansMajorations: "Prime HT Sans Majorations",
    totalMajorations: "Total Majorations",
    protectionJuridique: "Protection Juridique",
    fraisGestion: "Frais de Gestion",
    "autres.taxeAssurance": "Taxe Assurance",
    "autres.fraisFractionnementPrimeHT": "Frais Fractionnement",
    primeAggravationBilanN_1NonFourni: "Prime Aggravation Bilan N-1",
    "reprisePasseResult.ratioSP": "Ratio S/P",
    "reprisePasseResult.frequenceSinistres": "Fréquence Sinistres",
    "reprisePasseResult.categorieAnciennete": "Catégorie Ancienneté",
    "reprisePasseResult.categorieSinistralite": "Catégorie Sinistralité",
    "reprisePasseResult.majoration": "Majoration Reprise du Passé",
  };

  // Gestion des majorations dynamiques
  if (path.startsWith("majorations.")) {
    const majKey = path.replace("majorations.", "");
    return `Majoration ${majKey.charAt(0).toUpperCase() + majKey.slice(1)}`;
  }

  return labels[path] || path;
};

export default function CalculationTab({
  quote,
  calculationResult,
  calculationError,
  originalCalculationResult,
  setCalculationResult,
  setOriginalCalculationResult,
  reprisePasseEnabled,
  handleReprisePasseChange,
  nonFournitureBilanEnabled,
  handleNonFournitureBilanChange,
  saveCalculationToDatabase,
  recalculating,
  handleRecalculate,
  session,
  onOpenParameterEditor,
  installmentsRefreshTrigger = 0,
}: {
  quote: Quote;
  calculationResult: any;
  calculationError: string | null;
  originalCalculationResult: any | null;
  setCalculationResult: (result: CalculationResult) => void;
  setOriginalCalculationResult: (result: CalculationResult | null) => void;
  reprisePasseEnabled: boolean;
  handleReprisePasseChange: (enabled: boolean) => void;
  nonFournitureBilanEnabled: boolean;
  handleNonFournitureBilanChange: (enabled: boolean) => void;
  saveCalculationToDatabase: () => void;
  recalculating: boolean;
  handleRecalculate: () => void;
  session: any;
  onOpenParameterEditor: () => void;
  installmentsRefreshTrigger?: number;
}) {
  const [paymentInstallments, setPaymentInstallments] = useState<
    PaymentInstallment[]
  >([]);
  const [loadingInstallments, setLoadingInstallments] = useState(true);

  useEffect(() => {
    if (!quote?.id) {
      setLoadingInstallments(false);
      return;
    }
    setLoadingInstallments(true);
    const fetchInstallments = async () => {
      try {
        const res = await fetch(
          `/api/payment-installments?quoteId=${quote.id}`,
        );
        if (res.ok) {
          const data = await res.json();
          const installments = (data.data?.installments ?? []).map(
            (p: any) => ({
              id: p.id,
              installmentNumber: p.installmentNumber,
              dueDate: p.dueDate ?? "",
              amountHT: p.amountHT ?? 0,
              taxAmount: p.taxAmount ?? 0,
              amountTTC: p.amountTTC ?? 0,
              rcdAmount: p.rcdAmount ?? null,
              pjAmount: p.pjAmount ?? null,
              feesAmount: p.feesAmount ?? null,
              resumeAmount: p.resumeAmount ?? null,
              periodStart: p.periodStart ?? "",
              periodEnd: p.periodEnd ?? "",
              status: p.status ?? "PENDING",
            }),
          );
          setPaymentInstallments(installments);
        } else {
          setPaymentInstallments([]);
        }
      } catch {
        setPaymentInstallments([]);
      } finally {
        setLoadingInstallments(false);
      }
    };
    fetchInstallments();
  }, [quote?.id, installmentsRefreshTrigger]);

  /**
   * Valeurs par échéance alignées sur AppelDePrimeTab ;
   * branche `modifieAlaMain` : recalcul affichage (voir story écarts montants).
   */
  const getEcheanceRowValues = useMemo(
    () =>
      buildGetEcheanceRowValues({
        modifieAlaMain: quote.modifieAlaMain === true,
        paymentInstallments,
        calculationResult,
        originalCalculationResult,
      }),
    [
      quote.modifieAlaMain,
      paymentInstallments,
      calculationResult,
      originalCalculationResult,
    ],
  );

  /** Même périmètre que le tableau « Échéancier de paiement détaillé » (filtrage année fin de période). */
  const ECHEANCIER_DETAIL_YEAR = 2026;

  const echeancesPourAffichageDetaille =
    useMemo((): EcheanceAvecOrigIndex[] => {
      if (quote.modifieAlaMain === true) {
        const sorted = [...paymentInstallments].sort(
          (a, b) => a.installmentNumber - b.installmentNumber,
        );
        return sorted
          .filter((inst) => {
            if (!inst.periodEnd) return false;
            return (
              new Date(inst.periodEnd).getFullYear() === ECHEANCIER_DETAIL_YEAR
            );
          })
          .map((inst) => ({
            echeance: {
              finPeriode: inst.periodEnd,
              rcd: inst.rcdAmount ?? undefined,
              pj: inst.pjAmount ?? undefined,
              frais: inst.feesAmount ?? undefined,
              reprise: inst.resumeAmount ?? undefined,
              taxe: inst.taxAmount ?? undefined,
            } satisfies EcheanceTarifRow,
            origIndex: inst.installmentNumber - 1,
          }));
      }

      const list = calculationResult?.echeancier?.echeances as
        | EcheanceTarifRow[]
        | undefined;
      if (!list?.length) return [];
      return list
        .map((echeance, origIndex) => ({ echeance, origIndex }))
        .filter(
          ({ echeance }) =>
            new Date(echeance.finPeriode).getFullYear() ===
            ECHEANCIER_DETAIL_YEAR,
        );
    }, [
      quote.modifieAlaMain,
      calculationResult?.echeancier?.echeances,
      paymentInstallments,
    ]);

  /** Somme des Total TTC des lignes affichées dans l’échéancier détaillé — source de vérité pour les totaux TTC affichés. */
  const sommeTotalTTCEcheancierDetaille = useMemo(() => {
    if (!echeancesPourAffichageDetaille.length) {
      return (calculationResult?.totalTTC as number) ?? 0;
    }
    return echeancesPourAffichageDetaille.reduce(
      (sum: number, { echeance, origIndex }: EcheanceAvecOrigIndex) =>
        sum + getEcheanceRowValues(echeance, origIndex).totalTTC,
      0,
    );
  }, [
    echeancesPourAffichageDetaille,
    getEcheanceRowValues,
    calculationResult?.totalTTC,
  ]);

  const sommeTotalTTCEcheancierDetailleOrigine = useMemo(() => {
    if (!originalCalculationResult?.echeancier?.echeances?.length) {
      return undefined;
    }
    const filtered = (
      originalCalculationResult.echeancier.echeances as EcheanceTarifRow[]
    )
      .map((echeance, origIndex) => ({ echeance, origIndex }))
      .filter(
        ({ echeance }) =>
          new Date(echeance.finPeriode).getFullYear() ===
          ECHEANCIER_DETAIL_YEAR,
      );
    if (!filtered.length) {
      return (originalCalculationResult.totalTTC as number) ?? undefined;
    }
    const getter = buildGetEcheanceRowValues({
      modifieAlaMain: quote.modifieAlaMain === true,
      paymentInstallments,
      calculationResult: originalCalculationResult,
      originalCalculationResult: null,
    });
    return filtered.reduce(
      (sum: number, { echeance, origIndex }: EcheanceAvecOrigIndex) =>
        sum + getter(echeance, origIndex).totalTTC,
      0,
    );
  }, [originalCalculationResult, quote.modifieAlaMain, paymentInstallments]);

  // Fonction pour obtenir des labels lisibles pour les champs

  // Fonction pour restaurer le calcul original
  const resetCalculationEditing = () => {
    if (originalCalculationResult) {
      setCalculationResult(originalCalculationResult);
      setOriginalCalculationResult(null);
    }
  };

  const isValueModified = (originalValue: any, currentValue: any) => {
    return JSON.stringify(originalValue) !== JSON.stringify(currentValue);
  };

  // Fonction pour détecter toutes les différences dans calculationResult
  const getAllDifferences = (
    original: CalculationResult | null,
    current: CalculationResult | null,
  ) => {
    if (!original || !current) return [];

    const differences: Array<{
      path: string;
      label: string;
      originalValue: any;
      currentValue: any;
      isModified: boolean;
    }> = [];

    const compareValues = (
      origObj: any,
      currObj: any,
      path: string = "",
      parentLabel: string = "",
    ) => {
      if (
        origObj === null ||
        origObj === undefined ||
        currObj === null ||
        currObj === undefined
      ) {
        if (origObj !== currObj) {
          differences.push({
            path,
            label: parentLabel,
            originalValue: origObj,
            currentValue: currObj,
            isModified: true,
          });
        }
        return;
      }

      if (typeof origObj === "object" && typeof currObj === "object") {
        const allKeys = new Set([
          ...Object.keys(origObj),
          ...Object.keys(currObj),
        ]);
        allKeys.forEach((key) => {
          const newPath = path ? `${path}.${key}` : key;
          const label = getFieldLabel(newPath);
          compareValues(origObj[key], currObj[key], newPath, label);
        });
      } else {
        const isModified = origObj !== currObj;
        differences.push({
          path,
          label: parentLabel,
          originalValue: origObj,
          currentValue: currObj,
          isModified,
        });
      }
    };

    compareValues(original, current);
    return differences.filter((diff) => diff.isModified);
  };

  const getValueWithModificationIndicator = (
    originalValue: any,
    currentValue: any,
    formatFn?: (val: any) => string,
  ) => {
    const isModified =
      originalCalculationResult && isValueModified(originalValue, currentValue);
    const displayValue = formatFn ? formatFn(currentValue) : currentValue;

    return {
      value: displayValue,
      isModified,
      originalValue: formatFn ? formatFn(originalValue) : originalValue,
    };
  };

  // Composant pour afficher une valeur modifiable avec indicateur
  const ModifiableValue = ({
    originalValue,
    currentValue,
    formatFn = (val) => val?.toLocaleString?.("fr-FR") || "0",
    suffix = " €",
    className = "",
  }: {
    originalValue: any;
    currentValue: any;
    formatFn?: (val: any) => string;
    suffix?: string;
    className?: string;
  }) => {
    const {
      value,
      isModified,
      originalValue: formattedOriginal,
    } = getValueWithModificationIndicator(
      originalValue,
      currentValue,
      formatFn,
    );

    if (!isModified) {
      return (
        <span className={className}>
          {value}
          {suffix}
        </span>
      );
    }

    return (
      <div className="relative">
        <span
          className={`${className} ${
            isModified ? "text-blue-600 font-bold" : ""
          }`}
        >
          {value}
          {suffix}
        </span>
        {isModified && (
          <div className="flex items-center mt-1 text-xs text-gray-500">
            <svg
              className="w-3 h-3 mr-1 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="line-through">
              Original: {formattedOriginal}
              {suffix}
            </span>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="space-y-6">
      {calculationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="w-5 h-5 text-red-400 mt-0.5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Erreur de calcul
              </h3>
              <p className="text-sm text-red-700 mt-1">{calculationError}</p>
            </div>
          </div>
        </div>
      )}

      {!calculationResult && !calculationError && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="w-5 h-5 text-blue-400 mt-0.5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Calcul non disponible
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Le calcul automatique n'est disponible que pour les produits RC
                Decennale (RCD).
              </p>
            </div>
          </div>
        </div>
      )}

      {calculationResult && (
        <div className="space-y-8">
          {/* Notification de modification */}
          {originalCalculationResult && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-amber-400 mt-0.5 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-amber-800">
                    Mode modification activé
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Vous visualisez une version modifiée des calculs. Les
                    valeurs changées sont indiquées visuellement. Utilisez
                    "Version originale" pour revenir aux calculs d'origine.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Header principal avec statut */}
          <div
            className={`rounded-2xl p-8 text-white shadow-xl ${
              calculationResult.refus
                ? "bg-gradient-to-br from-red-500 via-red-600 to-red-700"
                : "bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3 rounded-full ${
                    calculationResult.refus ? "bg-red-400/20" : "bg-white/20"
                  }`}
                >
                  {calculationResult.refus ? (
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {calculationResult.refus
                      ? "Demande Refusée"
                      : "Prime RCD Annuelle"}
                  </h2>
                  <p
                    className={`text-lg ${
                      calculationResult.refus
                        ? "text-red-100"
                        : "text-indigo-100"
                    }`}
                  >
                    {calculationResult.refus
                      ? calculationResult.refusReason ||
                        "Le dossier ne peut pas être accepté"
                      : "Calcul basé sur les données du formulaire"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {!calculationResult.refus && (
                  <>
                    <div className="text-4xl font-bold mb-1">
                      {sommeTotalTTCEcheancierDetaille.toLocaleString("fr-FR")}{" "}
                      €
                    </div>
                    <div className="text-indigo-200 text-sm">
                      Total TTC (somme échéancier détaillé{" "}
                      {ECHEANCIER_DETAIL_YEAR})
                    </div>
                  </>
                )}
                {calculationResult.refus && (
                  <div className="text-3xl font-bold text-red-100">
                    ⚠️ REFUS
                  </div>
                )}
              </div>
            </div>
          </div>

          {!calculationResult.refus && session?.user?.role === "ADMIN" && (
            <>
              {/* Options de calcul et boutons pour admin */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                  {/* Switches de configuration */}
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-6">
                    <div className="flex items-center space-x-3">
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input
                          type="checkbox"
                          id="reprisePasseSwitch"
                          checked={reprisePasseEnabled}
                          onChange={(e) =>
                            handleReprisePasseChange(e.target.checked)
                          }
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        />
                        <label
                          htmlFor="reprisePasseSwitch"
                          className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                            reprisePasseEnabled ? "bg-green-400" : "bg-gray-300"
                          }`}
                        ></label>
                      </div>
                      <label
                        htmlFor="reprisePasseSwitch"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        Reprise du passé
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input
                          type="checkbox"
                          id="nonFournitureBilanSwitch"
                          checked={nonFournitureBilanEnabled}
                          onChange={(e) =>
                            handleNonFournitureBilanChange(e.target.checked)
                          }
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        />
                        <label
                          htmlFor="nonFournitureBilanSwitch"
                          className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                            nonFournitureBilanEnabled
                              ? "bg-red-400"
                              : "bg-gray-300"
                          }`}
                        ></label>
                      </div>
                      <label
                        htmlFor="nonFournitureBilanSwitch"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        Non fourniture bilan N-1
                      </label>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleRecalculate}
                      disabled={recalculating}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      {recalculating ? (
                        <>
                          <svg
                            className="animate-spin w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span>Recalcul...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          <span>Recalculer</span>
                        </>
                      )}
                    </button>

                    {originalCalculationResult && (
                      <button
                        onClick={resetCalculationEditing}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                          />
                        </svg>
                        <span>Version originale</span>
                      </button>
                    )}

                    <button
                      onClick={saveCalculationToDatabase}
                      disabled={recalculating}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      {recalculating ? (
                        <>
                          <svg
                            className="animate-spin w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span>Sauvegarde...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <span>Sauvegarder le calcul</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Résumé financier */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CA Calculé */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        CA Calculé
                      </p>
                      <div className="text-2xl font-bold text-gray-900">
                        <ModifiableValue
                          originalValue={originalCalculationResult?.caCalculee}
                          currentValue={calculationResult.caCalculee}
                          className="text-2xl font-bold text-gray-900"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* CA Calculé */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Prime ANNUELLE Calcul TTC
                      </p>
                      <div className="text-2xl font-bold text-gray-900">
                        <ModifiableValue
                          originalValue={originalCalculationResult?.totalTTC}
                          currentValue={calculationResult.totalTTC}
                          className="text-2xl font-bold text-gray-900"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Prime HT */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Prime HT
                      </p>
                      <div className="text-2xl font-bold text-gray-900">
                        <ModifiableValue
                          originalValue={originalCalculationResult?.primeTotal}
                          currentValue={calculationResult.primeTotal}
                          className="text-2xl font-bold text-gray-900"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Total TTC */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total TTC
                      </p>
                      <div className="text-2xl font-bold text-indigo-600">
                        <ModifiableValue
                          originalValue={sommeTotalTTCEcheancierDetailleOrigine}
                          currentValue={sommeTotalTTCEcheancierDetaille}
                          className="text-2xl font-bold text-indigo-600"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Somme des Total TTC du tableau « Échéancier de paiement
                        détaillé » ({ECHEANCIER_DETAIL_YEAR})
                      </p>
                    </div>
                    <div className="p-3 bg-indigo-100 rounded-full">
                      <svg
                        className="w-6 h-6 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Composition détaillée */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Composition de la prime */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      Composition de la prime
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Prime minimum HT</span>
                      <span className="font-semibold text-gray-900">
                        <ModifiableValue
                          originalValue={originalCalculationResult?.PminiHT}
                          currentValue={calculationResult.PminiHT}
                        />
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Prime au-delà</span>
                      <span className="font-semibold text-gray-900">
                        <ModifiableValue
                          originalValue={originalCalculationResult?.primeAuDela}
                          currentValue={calculationResult.primeAuDela}
                        />
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">
                        Prime HT sans majorations
                      </span>
                      <span className="font-semibold text-gray-900">
                        <ModifiableValue
                          originalValue={
                            originalCalculationResult?.PrimeHTSansMajorations
                          }
                          currentValue={
                            calculationResult.PrimeHTSansMajorations
                          }
                        />
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Total majorations</span>
                      <span
                        className={`font-semibold ${
                          calculationResult.totalMajorations > 0
                            ? "text-red-600"
                            : calculationResult.totalMajorations < 0
                              ? "text-green-600"
                              : "text-gray-600"
                        }`}
                      >
                        {calculationResult.totalMajorations > 0 ? "+" : ""}
                        {(
                          (calculationResult.totalMajorations - 1) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
                      <span className="text-gray-900 font-medium">
                        Prime HT finale
                      </span>
                      <span className="font-bold text-lg text-indigo-600">
                        <ModifiableValue
                          originalValue={originalCalculationResult?.primeTotal}
                          currentValue={calculationResult.primeTotal}
                        />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Majorations appliquées */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <svg
                          className="w-5 h-5 mr-2 text-orange-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                        Majorations appliquées
                      </h3>
                      {session?.user?.role === "ADMIN" && (
                        <button
                          onClick={() => {
                            if (!originalCalculationResult) {
                              setOriginalCalculationResult(calculationResult);
                            }
                            onOpenParameterEditor();
                          }}
                          className="flex items-center px-3 py-1.5 text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Modifier les paramètres
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-6 space-y-3">
                    {calculationResult.majorations &&
                      Object.entries(calculationResult.majorations).map(
                        ([key, value]: [string, any]) => (
                          <div
                            key={key}
                            className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-gray-50"
                          >
                            <span className="text-gray-600 capitalize">
                              {key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str) => str.toUpperCase())
                                .replace(/_/g, " ")}
                            </span>
                            <span
                              className={`font-semibold px-2 py-1 rounded-full text-sm ${
                                value < 0
                                  ? "text-green-700 bg-green-100"
                                  : value > 0
                                    ? "text-red-700 bg-red-100"
                                    : "text-gray-600 bg-gray-100"
                              }`}
                            >
                              {value > 0 ? "+" : ""}
                              {(value * 100).toFixed(1)}%
                            </span>
                          </div>
                        ),
                      )}
                  </div>
                </div>
              </div>

              {/* Frais et taxes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      Frais et taxes
                    </h3>
                    {session?.user?.role === "ADMIN" && (
                      <button
                        onClick={() => {
                          if (!originalCalculationResult) {
                            setOriginalCalculationResult(calculationResult);
                          }
                          onOpenParameterEditor();
                        }}
                        className="flex items-center px-3 py-1.5 text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-md transition-colors"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Modifier
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">
                        Protection Juridique
                      </p>
                      <div className="text-xl font-bold text-blue-900">
                        <ModifiableValue
                          originalValue={
                            originalCalculationResult?.protectionJuridique
                          }
                          currentValue={calculationResult.protectionJuridique}
                          className="text-xl font-bold text-blue-900"
                        />
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">
                        Frais de gestion
                      </p>
                      <div className="text-xl font-bold text-green-900">
                        <ModifiableValue
                          originalValue={
                            originalCalculationResult?.fraisGestion
                          }
                          currentValue={calculationResult.fraisGestion}
                          className="text-xl font-bold text-green-900"
                        />
                      </div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-600 font-medium">
                        Taxe assurance
                      </p>
                      <div className="text-xl font-bold text-orange-900">
                        <ModifiableValue
                          originalValue={
                            originalCalculationResult?.autres?.taxeAssurance
                          }
                          currentValue={calculationResult.autres?.taxeAssurance}
                          className="text-xl font-bold text-orange-900"
                        />
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium">
                        Frais fractionnement
                      </p>
                      <div className="text-xl font-bold text-purple-900">
                        <ModifiableValue
                          originalValue={
                            originalCalculationResult?.autres
                              ?.fraisFractionnementPrimeHT
                          }
                          currentValue={
                            calculationResult.autres?.fraisFractionnementPrimeHT
                          }
                          className="text-xl font-bold text-purple-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reprise du passé */}
              {calculationResult.reprisePasseResult && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-amber-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Reprise du passé
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">
                          Analyse sinistralité
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ratio S/P</span>
                            <span className="font-medium">
                              {calculationResult.reprisePasseResult.ratioSP?.toFixed(
                                3,
                              ) || "0"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Fréquence sinistres
                            </span>
                            <span className="font-medium">
                              {calculationResult.reprisePasseResult.frequenceSinistres?.toFixed(
                                2,
                              ) || "0"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">
                          Classification
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ancienneté</span>
                            <span className="font-medium">
                              {calculationResult.reprisePasseResult
                                .categorieAnciennete || "-"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Fréquence</span>
                            <span className="font-medium">
                              {calculationResult.reprisePasseResult
                                .categorieFrequence || "-"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ratio S/P</span>
                            <span className="font-medium">
                              {calculationResult.reprisePasseResult
                                .categorieRatioSP || "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Résumé des calculs */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">
                          Taux de majoration
                        </h4>
                        <div className="text-2xl font-bold text-blue-800">
                          {(
                            calculationResult.reprisePasseResult
                              .tauxMajoration * 100
                          )?.toFixed(1) || "0"}
                          %
                        </div>
                        <p className="text-sm text-blue-700 mt-1">
                          Coefficient appliqué selon l'analyse sinistralité
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 mb-2">
                          Prime après sinistralité
                        </h4>
                        <div className="text-2xl font-bold text-green-800">
                          {calculationResult.reprisePasseResult.primeApresSinistralite?.toLocaleString(
                            "fr-FR",
                          ) || "0"}{" "}
                          €
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          Prime HT × Taux de majoration
                        </p>
                      </div>
                    </div>

                    {/* Tableau des années */}
                    {calculationResult.reprisePasseResult.tableauAnnees &&
                      calculationResult.reprisePasseResult.tableauAnnees
                        .length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-900 mb-4">
                            Détail par année
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                              <thead>
                                <tr className="bg-amber-100">
                                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                    Année
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">
                                    Taux TI
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">
                                    % Année
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">
                                    Prime Reprise
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {calculationResult.reprisePasseResult.tableauAnnees.map(
                                  (annee: any, index: number) => (
                                    <tr
                                      key={index}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                                        {annee.annee}
                                      </td>
                                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-right">
                                        {(annee.tauxTI * 100)?.toFixed(2) ||
                                          "0"}
                                        %
                                      </td>
                                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-right">
                                        {annee.pourcentageAnnee?.toFixed(1) ||
                                          "0"}
                                        %
                                      </td>
                                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                        {annee.primeRepriseAnnee?.toLocaleString(
                                          "fr-FR",
                                        ) || "0"}{" "}
                                        €
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-amber-900">
                            Prime reprise du passé TTC
                          </p>
                          <p className="text-sm text-amber-700">
                            Taux de majoration:{" "}
                            {(
                              calculationResult.reprisePasseResult
                                .tauxMajoration * 100
                            )?.toFixed(1) || "0"}
                            %
                          </p>
                          <p className="text-sm text-amber-700">
                            Calculée sur{" "}
                            {calculationResult.reprisePasseResult.tableauAnnees
                              ?.length || 0}{" "}
                            année(s)
                          </p>
                        </div>
                        <span className="text-2xl font-bold text-amber-900">
                          {calculationResult.reprisePasseResult.primeReprisePasseTTC?.toLocaleString(
                            "fr-FR",
                          ) || "0"}{" "}
                          €
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Échéancier - Visible pour tous les utilisateurs */}
          {!calculationResult.refus &&
            ((quote.modifieAlaMain === true &&
              paymentInstallments.length > 0) ||
              (calculationResult.echeancier?.echeances?.length ?? 0) > 0) &&
            (loadingInstallments ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                <span className="ml-3 text-gray-600">
                  Chargement des échéances...
                </span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Résumé des primes par année */}
                <div className="max-w-2xl mx-auto">
                  {(() => {
                    const currentYear = String(ECHEANCIER_DETAIL_YEAR);

                    return (
                      <>
                        {/* Prime année = même somme que l’échéancier détaillé */}
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-emerald-100 text-sm font-medium mb-2">
                                Prime {currentYear}
                              </p>
                              <div className="text-3xl font-bold mb-1">
                                {sommeTotalTTCEcheancierDetaille.toLocaleString(
                                  "fr-FR",
                                )}{" "}
                                €
                              </div>
                              <p className="text-emerald-100 text-xs">
                                {echeancesPourAffichageDetaille.length}{" "}
                                échéance(s)
                              </p>
                            </div>
                            <div className="p-4 bg-white/20 rounded-full">
                              <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Échéancier détaillé */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-emerald-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Échéancier de paiement détaillé
                    </h3>
                    {session?.user?.role === "ADMIN" && (
                      <TestRecalculButton
                        quote={quote}
                        calculationResult={calculationResult}
                        setCalculationResult={setCalculationResult}
                      />
                    )}
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                              Date échéance
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                              Début période
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                              Fin période
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              RCD HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              PJ HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Frais HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Frais Gestion HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Reprise HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Total HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Taxe
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Total TTC
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {echeancesPourAffichageDetaille.map(
                            ({
                              echeance,
                              origIndex,
                            }: {
                              echeance: any;
                              origIndex: number;
                            }) => {
                              const row = getEcheanceRowValues(
                                echeance,
                                origIndex,
                              );
                              const inst = paymentInstallments.find(
                                (p) => p.installmentNumber === origIndex + 1,
                              );
                              const dateEcheance =
                                inst?.dueDate != null
                                  ? new Date(inst.dueDate).toLocaleDateString(
                                      "fr-FR",
                                    )
                                  : echeance.date;
                              const debutPeriode =
                                inst?.periodStart != null
                                  ? new Date(
                                      inst.periodStart,
                                    ).toLocaleDateString("fr-FR")
                                  : echeance.debutPeriode;
                              const finPeriode =
                                inst?.periodEnd != null
                                  ? new Date(inst.periodEnd).toLocaleDateString(
                                      "fr-FR",
                                    )
                                  : echeance.finPeriode;
                              return (
                                <tr
                                  key={origIndex}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {dateEcheance}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {debutPeriode}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {finPeriode}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {row.rcdHT.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {row.pj.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {row.frais.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {row.fraisGestion.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {row.reprise.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                    {row.totalHT.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-orange-600 text-right">
                                    {row.taxe.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-right">
                                    {row.totalTTC.toLocaleString("fr-FR")} €
                                  </td>
                                </tr>
                              );
                            },
                          )}
                        </tbody>
                        {/* Ligne de totaux */}
                        <tfoot>
                          {(() => {
                            const totaux =
                              echeancesPourAffichageDetaille.reduce(
                                (
                                  acc: {
                                    rcdHT: number;
                                    pj: number;
                                    frais: number;
                                    fraisGestion: number;
                                    reprise: number;
                                    totalHT: number;
                                    taxe: number;
                                    totalTTC: number;
                                  },
                                  {
                                    echeance,
                                    origIndex,
                                  }: {
                                    echeance: any;
                                    origIndex: number;
                                  },
                                ) => {
                                  const row = getEcheanceRowValues(
                                    echeance,
                                    origIndex,
                                  );
                                  acc.rcdHT += row.rcdHT;
                                  acc.pj += row.pj;
                                  acc.frais += row.frais;
                                  acc.fraisGestion += row.fraisGestion;
                                  acc.reprise += row.reprise;
                                  acc.totalHT += row.totalHT;
                                  acc.taxe += row.taxe;
                                  acc.totalTTC += row.totalTTC;
                                  return acc;
                                },
                                {
                                  rcdHT: 0,
                                  pj: 0,
                                  frais: 0,
                                  fraisGestion: 0,
                                  reprise: 0,
                                  totalHT: 0,
                                  taxe: 0,
                                  totalTTC: 0,
                                },
                              );
                            return (
                              <tr className="bg-gray-100 font-semibold">
                                <td
                                  className="px-4 py-3 text-sm font-medium text-gray-900"
                                  colSpan={3}
                                >
                                  TOTAUX
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {totaux.rcdHT.toLocaleString("fr-FR")} €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {totaux.pj.toLocaleString("fr-FR")} €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {totaux.frais.toLocaleString("fr-FR")} €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {totaux.fraisGestion.toLocaleString("fr-FR")}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {totaux.reprise.toLocaleString("fr-FR")} €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {totaux.totalHT.toLocaleString("fr-FR")} €
                                </td>
                                <td className="px-4 py-3 text-sm text-orange-600 text-right">
                                  {totaux.taxe.toLocaleString("fr-FR")} €
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-right">
                                  {totaux.totalTTC.toLocaleString("fr-FR")} €
                                </td>
                              </tr>
                            );
                          })()}
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Échéancier regroupé par année */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      Échéancier par année
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                              Année
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              RCD
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              RCD HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Taxe
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              PJ
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Frais
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Frais Gestion
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Reprise
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Total TTC
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Nb échéances
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(() => {
                            const echeancesAvecIndex =
                              echeancesPourAffichageDetaille;
                            const echeances2026 = echeancesAvecIndex.filter(
                              ({ echeance }: { echeance: any }) =>
                                new Date(echeance.finPeriode).getFullYear() ===
                                2026,
                            );

                            const echeancesParAnnee = echeances2026.reduce(
                              (acc: any, { echeance, origIndex }: any) => {
                                const row = getEcheanceRowValues(
                                  echeance,
                                  origIndex,
                                );
                                const rcdTTC = row.rcdHT + row.taxe;

                                const annee = new Date(echeance.finPeriode)
                                  .getFullYear()
                                  .toString();
                                if (!acc[annee]) {
                                  acc[annee] = {
                                    annee,
                                    rcd: 0,
                                    rcdHT: 0,
                                    taxe: 0,
                                    pj: 0,
                                    frais: 0,
                                    fraisGestion: 0,
                                    reprise: 0,
                                    totalTTC: 0,
                                    nbEcheances: 0,
                                  };
                                }
                                acc[annee].rcd += rcdTTC;
                                acc[annee].rcdHT += row.rcdHT;
                                acc[annee].pj += row.pj;
                                acc[annee].frais += row.frais;
                                acc[annee].fraisGestion += row.fraisGestion;
                                acc[annee].reprise += row.reprise;
                                acc[annee].taxe += row.taxe;
                                acc[annee].totalTTC += row.totalTTC;
                                acc[annee].nbEcheances += 1;
                                return acc;
                              },
                              {},
                            );

                            return Object.values(echeancesParAnnee)
                              .sort((a: any, b: any) =>
                                a.annee.localeCompare(b.annee),
                              )
                              .map((annee: any, index: number) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {annee.annee}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.rcd.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.rcdHT.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.taxe.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.pj.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.frais.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.fraisGestion.toLocaleString("fr-FR")}{" "}
                                    €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.reprise.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                    {annee.totalTTC.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.nbEcheances}
                                  </td>
                                </tr>
                              ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Tableau croisé Postes vs Types */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                        />
                      </svg>
                      Répartition par postes et types
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                              Type
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              RCD
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              PJ
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Frais
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Frais Gestion
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Reprise
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(() => {
                            const totaux =
                              echeancesPourAffichageDetaille.reduce(
                                (acc: any, { echeance, origIndex }: any) => {
                                  const row = getEcheanceRowValues(
                                    echeance,
                                    origIndex,
                                  );
                                  acc.rcd += row.rcdHT;
                                  acc.pj += row.pj;
                                  acc.frais += row.frais;
                                  acc.fraisGestion += row.fraisGestion;
                                  acc.reprise += row.reprise;
                                  acc.totalHT += row.totalHT;
                                  acc.totalTTC += row.totalTTC;
                                  acc.taxe += row.taxe;
                                  return acc;
                                },
                                {
                                  rcd: 0,
                                  pj: 0,
                                  frais: 0,
                                  fraisGestion: 0,
                                  reprise: 0,
                                  totalHT: 0,
                                  totalTTC: 0,
                                  taxe: 0,
                                },
                              );

                            return [
                              {
                                type: "HT",
                                rcd: totaux.rcd,
                                pj: totaux.pj,
                                frais: totaux.frais,
                                fraisGestion: totaux.fraisGestion,
                                reprise: totaux.reprise,
                                total: totaux.totalHT,
                                className: "text-gray-600",
                              },
                              {
                                type: "Taxe",
                                rcd: 0,
                                pj: 0,
                                frais: 0,
                                fraisGestion: 0,
                                reprise: 0,
                                total: totaux.taxe,
                                className: "text-orange-600",
                              },
                              {
                                type: "TTC",
                                rcd: totaux.rcd,
                                pj: totaux.pj,
                                frais: totaux.frais,
                                fraisGestion: totaux.fraisGestion,
                                reprise: totaux.reprise,
                                total: totaux.totalTTC,
                                className: "text-indigo-600 font-semibold",
                              },
                            ].map((row: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td
                                  className={`px-4 py-3 text-sm font-medium ${row.className}`}
                                >
                                  {row.type}
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={row.className}>
                                    {row.rcd.toLocaleString("fr-FR")} €
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={row.className}>
                                    {row.pj.toLocaleString("fr-FR")} €
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={row.className}>
                                    {row.frais.toLocaleString("fr-FR")} €
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={row.className}>
                                    {row.fraisGestion.toLocaleString("fr-FR")} €
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={row.className}>
                                    {row.reprise.toLocaleString("fr-FR")} €
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span
                                    className={`font-semibold ${row.className}`}
                                  >
                                    {row.total.toLocaleString("fr-FR")} €
                                  </span>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ))}

          {/* Détail par activité - Visible pour ADMIN seulement */}
          {!calculationResult.refus &&
            session?.user?.role === "ADMIN" &&
            calculationResult.returnTab &&
            calculationResult.returnTab.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    Détail par activité
                  </h3>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                            Activité
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                            Part CA (%)
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                            Taux de base
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                            Prime Mini Act.
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                            Dégressivité
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                            Prime au-delà
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {calculationResult.returnTab.map(
                          (activity: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {activity.nomActivite}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                {(activity.partCA * 100).toFixed(1) || "0"}%
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                {(activity.tauxBase * 100)?.toFixed(3) || "0"}%
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                {activity.PrimeMiniAct?.toLocaleString(
                                  "fr-FR",
                                ) || "0"}{" "}
                                €
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                {activity.Deg400k > 0
                                  ? `${
                                      (activity.Deg400k * 100)?.toFixed(1) ||
                                      "0"
                                    }%`
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                {activity.Prime100Min?.toLocaleString(
                                  "fr-FR",
                                ) || "0"}{" "}
                                €
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
