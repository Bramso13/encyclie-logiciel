import { prisma } from "./prisma";
import {
  calculPrimeRCD,
  getTaxeByRegion,
  getTaxeProtectionJuridiqueByRegion,
} from "./tarificateurs/rcd";

// Fonction de calcul dynamique basée sur le mapping
export const calculateWithMapping = (
  quoteData: any,
  parameterMapping: Record<string, string>,
  formFields: Record<string, any>
) => {
  try {
    console.log("=== CALCUL DYNAMIQUE AVEC MAPPING ===");
    console.log("FormData:", quoteData.formData);
    console.log("CompanyData:", quoteData.companyData);
    console.log("ParameterMapping:", parameterMapping);
    console.log("FormFields:", formFields);

    // Construire les paramètres à partir du mapping
    const mappedParams: any = {};

    Object.entries(parameterMapping).forEach(([paramKey, fieldKey]) => {
      if (fieldKey && (formFields[fieldKey] || quoteData.formData[paramKey] || quoteData.formData[fieldKey])) {
        const field = formFields[fieldKey];
        const value =
          quoteData.formData[fieldKey] ??
          quoteData.formData[paramKey] ??
          field?.default;

        // Conversion selon le type de champ et le paramètre
        switch (paramKey) {
          case "honoraireGestion":
            console.log("value", value, "paramKeyOuai", paramKey);
            if (field?.type === "number" || value !== undefined) {
              mappedParams[paramKey] = Number(value) || 0;
            }
            break;
          case "nonFournitureBilanN_1":
            console.log("value", value, "paramKey", paramKey);
            mappedParams[paramKey] = Boolean(value);

            break;
          case "territory":
            if (field?.type === "select" || value !== undefined) {
              mappedParams[paramKey] = value ?? "";
            }
            mappedParams.taxeAssurance = getTaxeByRegion(value);
            mappedParams.taxeProtectionJuridique =
              getTaxeProtectionJuridiqueByRegion(value);
            break;
          case "directorName":
            if (field?.type === "text" || field?.type === "select" || value !== undefined) {
              mappedParams[paramKey] = value ?? "";
            }
            break;
          case "reprisePasse":
            if (field?.type === "checkbox" || value !== undefined) {
              mappedParams[paramKey] = Boolean(value);
            }
            break;
          case "enCreation":
            console.log("value", value, "paramKey", paramKey);
            if (field?.type === "checkbox" || value !== undefined) {
              mappedParams[paramKey] = Boolean(value);
            }
            break;
          case "caDeclared":
          case "etp":
          case "anneeExperience":
            console.log("value", value, "paramKeyKeyKey", paramKey);
            mappedParams[paramKey] = Number(value) || 0;
            break;
          case "nombreAnneeAssuranceContinue":
          case "partSoutraitance":
          case "partNegoce":
            if (field?.type === "number" || value !== undefined) {
              mappedParams[paramKey] = Number(value) || 0;
            }
            break;

          case "dateCreation":
          case "dateEffet":
            if (field?.type === "date" || value !== undefined) {
              mappedParams[paramKey] = value ? new Date(value) : new Date();
            }
            break;

          case "tempsSansActivite":
          case "sansActiviteDepuisPlusDe12MoisSansFermeture":
          case "absenceDeSinistreSurLes5DernieresAnnees":
            mappedParams[paramKey] = value;
            break;
          case "fractionnementPrime": {
            // Normaliser pour RCD : annuel | mensuel | trimestriel | semestriel
            const raw = String(value ?? "").toLowerCase().trim();
            const allowed: Array<"annuel" | "mensuel" | "trimestriel" | "semestriel"> = [
              "annuel",
              "mensuel",
              "trimestriel",
              "semestriel",
            ];
            if (allowed.includes(raw as any)) {
              mappedParams[paramKey] = raw;
            } else if (raw === "annual" || raw === "annuelle") {
              mappedParams[paramKey] = "annuel";
            } else if (raw === "monthly" || raw === "mensuelle") {
              mappedParams[paramKey] = "mensuel";
            } else if (raw === "quarterly" || raw === "trimestrielle") {
              mappedParams[paramKey] = "trimestriel";
            } else if (raw === "half-yearly" || raw === "semestrielle") {
              mappedParams[paramKey] = "semestriel";
            } else {
              mappedParams[paramKey] = "annuel";
            }
            break;
          }

          case "qualif":
          case "assureurDefaillant":
          case "protectionJuridique":
            if (field?.type === "checkbox" || value !== undefined) {
              mappedParams[paramKey] = Boolean(value);
            }
            break;

          case "nomDeLAsurreur":
            if (field?.type === "text" || field?.type === "select" || value !== undefined) {
              mappedParams[paramKey] = value ?? "";
            }
            break;

          case "dateFinCouverturePrecedente":
            if (field?.type === "date" || value !== undefined) {
              mappedParams[paramKey] = value ? new Date(value) : new Date();
            }
            break;

          case "activites":
            // Pour les activités, utiliser les données du formulaire
            if (
              quoteData.formData.activities &&
              Array.isArray(quoteData.formData.activities)
            ) {
              mappedParams[paramKey] = quoteData.formData.activities.map(
                (a: any) => ({
                  code: parseInt(a.code),
                  caSharePercent: Number(a.caSharePercent),
                })
              );
            } else {
              mappedParams[paramKey] = [];
            }
            break;

          case "sinistresPrecedents":
            // Pour les sinistres, utiliser les données du formulaire
            mappedParams[paramKey] = quoteData.formData.lossHistory || [];
            break;
        }
      }
    });

    // Vérifier que tous les paramètres obligatoires sont présents
    const requiredParams = ["caDeclared", "etp", "activites"];
    const missingParams = requiredParams.filter(
      (param) => !mappedParams[param]
    );

    if (missingParams.length > 0) {
      throw new Error(
        `Paramètres obligatoires manquants : ${missingParams.join(", ")}`
      );
    }

    console.log("Paramètres mappés:", mappedParams);

    // Utiliser les valeurs par défaut pour les paramètres non mappés
    const finalParams = {
      // Valeurs par défaut
      caDeclared: 500000,
      etp: 3,
      activites: [],
      dateCreation: new Date(),
      tempsSansActivite: "NON" as any,
      anneeExperience: 5,
      assureurDefaillant: false,
      nombreAnneeAssuranceContinue: 3,
      qualif: false,
      nomDeLAsurreur: "AXA",
      dateEffet: new Date(),
      sinistresPrecedents: [],
      sansActiviteDepuisPlusDe12MoisSansFermeture: "NON" as
        | "OUI"
        | "NON"
        | "CREATION",
      absenceDeSinistreSurLes5DernieresAnnees: "OUI" as
        | "OUI"
        | "NON"
        | "CREATION"
        | "ASSUREUR_DEFAILLANT"
        | "A_DEFINIR",
      protectionJuridique: true,
      fractionnementPrime: "annuel" as
        | "annuel"
        | "mensuel"
        | "trimestriel"
        | "semestriel",
      partSoutraitance: 0,
      partNegoce: 0,
      nonFournitureBilanN_1: false,
      reprisePasse: false,
      taxeAssurance: getTaxeByRegion(quoteData.formData.territory),
      taxeProtectionJuridique: getTaxeProtectionJuridiqueByRegion(
        quoteData.formData.territory
      ),
      // Remplacer par les valeurs mappées
      ...mappedParams,
    };

    console.log("Paramètres finaux:", finalParams);

    const result = calculPrimeRCD(finalParams);
    console.log("Résultat calcul:", result);
    return result;
  } catch (error) {
    console.error("Erreur calcul dynamique:", error);
    throw error;
  }
};

export const getBrokerCode = async (userId: string) => {
  const response = await fetch(`/api/brokers/code`);
  const data = await response.json();
  return data.code;
};

export const getBrokerInfo = async (userId: string) => {
  const response = await fetch(`/api/brokers/info`);
  const data = await response.json();
  return data.broker;
};
