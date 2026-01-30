import { Quote, CalculationResult } from "@/lib/types";
import { calculateWithMapping } from "@/lib/utils";

/**
 * Recalcule le tarif en appliquant les paramètres modifiés
 * Utilise calculateWithMapping comme le système actuel
 *
 * @param quote - Le devis original
 * @param modifiedParams - Les paramètres modifiés par l'utilisateur
 * @param parameterMapping - Le mapping dynamique du produit
 * @param formFields - Les champs du formulaire
 * @returns Le nouveau résultat de calcul
 */
export function recalculateWithParams(
  quote: Quote,
  modifiedParams: Record<string, any>,
  parameterMapping: Record<string, string>,
  formFields: Record<string, any>,
): CalculationResult {
  // Créer une copie du quote avec les paramètres modifiés
  const modifiedQuote = {
    ...quote,
    formData: {
      ...quote.formData,
      // Appliquer les modifications aux champs du formData
      ...Object.entries(modifiedParams).reduce(
        (acc, [key, value]) => {
          // Mapper les clés de paramètres vers les clés de formData
          const formDataKey = getFormDataKey(key);
          if (formDataKey) {
            acc[formDataKey] = value;
          }
          return acc;
        },
        {} as Record<string, any>,
      ),
    },
  };

  console.log("Recalcul avec quote modifié:", modifiedQuote);
  console.log("Params modifiés:", modifiedParams);

  // Utiliser calculateWithMapping comme le système actuel
  const result = calculateWithMapping(
    modifiedQuote,
    parameterMapping,
    formFields,
  );

  return result;
}

/**
 * Mapper les clés de paramètres de l'éditeur vers les clés de formData
 */
function getFormDataKey(paramKey: string): string | null {
  const mapping: Record<string, string> = {
    // CA et activités
    caDeclared: "turnover",
    etp: "fullTimeEmployees",

    // Majorations
    qualif: "professionalQualification",
    anneeExperience: "yearsOfExperience",
    nombreAnneeAssuranceContinue: "yearsOfContinuousInsurance",
    assureurDefaillant: "defaultInsurer",
    nonFournitureBilanN_1: "nonProvisionOfBalanceSheetN_1",
    tempsSansActivite: "timeWithoutActivity",
    sansActiviteDepuisPlusDe12MoisSansFermeture:
      "noActivityForOver12MonthsWithoutClosure",
    absenceDeSinistreSurLes5DernieresAnnees: "noClaimsInLast5Years",

    // Frais et taxes
    txFraisGestion: "managementFeeRate",
    protectionJuridique1an: "legalProtectionAnnual",
    taxeAssurance: "insuranceTaxRate",

    // Fractionnement
    fractionnementPrime: "periodicity",
    fraisFractionnementPrime: "installmentFees",
  };

  return mapping[paramKey] || null;
}

/**
 * Extrait les valeurs actuelles des paramètres depuis le quote
 * Pour affichage dans l'interface
 */
export function extractCurrentParams(quote: Quote): Record<string, any> {
  const formData = quote.formData;

  return {
    // CA et activités
    caDeclared: formData.chiffreAffaires ?? 0,
    etp: formData.nombreSalaries ?? 1,

    // Majorations
    qualif: formData.hasQualification ?? false,
    anneeExperience: formData.experienceMetier ?? 0,
    nombreAnneeAssuranceContinue: formData.nombreAnneeAssuranceContinue ?? 0,
    assureurDefaillant: formData.assureurDefaillant ?? false,
    // nonFournitureBilanN_1: formData.nonFournitureBilanN_1 ?? "NON",
    tempsSansActivite: formData.tempsSansActivite ?? "NON",
    sansActiviteDepuisPlusDe12MoisSansFermeture:
      formData.sansActiviteDepuisPlusDe12MoisSansFermeture ?? "NON",
    absenceDeSinistreSurLes5DernieresAnnees:
      formData.absenceDeSinistreSurLes5DernieresAnnees ?? "NON",

    // Frais et taxes (valeurs par défaut)
    txFraisGestion: 0.1,
    protectionJuridique1an: 106.0,
    taxeAssurance: 0.09, // Valeur par défaut, sera calculée selon la région

    // Fractionnement
    fractionnementPrime: formData.periodicity ?? "annuel",
    fraisFractionnementPrime: 40,
  };
}
