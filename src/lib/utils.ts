import { calculPrimeRCD, getTaxeByRegion } from "./tarificateurs/rcd";

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
      console.log("paramKeyyyy", paramKey);
      if (fieldKey && (formFields[fieldKey] || quoteData.formData[paramKey])) {
        console.log("paramKeyyyyy", paramKey);

        const field = formFields[fieldKey];
        const value = quoteData.formData[fieldKey] || field.default;

        // Conversion selon le type de champ et le paramètre
        switch (paramKey) {
          case "honoraireGestion":
            console.log("value", value, "paramKeyOuai", paramKey);
            if (field.type === "number") {
              mappedParams[paramKey] = Number(value) || 0;
            }
            break;
          case "nonFournitureBilanN_1":
            console.log("value", value, "paramKey", paramKey);
            mappedParams[paramKey] = Boolean(value);

            break;
          case "territory":
            if (field.type === "select") {
              mappedParams[paramKey] = value || "";
            }
            mappedParams.taxeAssurance = getTaxeByRegion(value);
            break;
          case "directorName":
            if (field.type === "text" || field.type === "select") {
              mappedParams[paramKey] = value || "";
            }
            break;
          case "reprisePasse":
            if (field.type === "checkbox") {
              mappedParams[paramKey] = Boolean(value);
            }
            break;
          case "enCreation":
            if (field.type === "checkbox") {
              mappedParams[paramKey] = Boolean(value);
            }
            break;
          case "caDeclared":
          case "etp":
          case "anneeExperience":
          case "nombreAnneeAssuranceContinue":
          case "partSoutraitance":
          case "partNegoce":
            if (field.type === "number") {
              mappedParams[paramKey] = Number(value) || 0;
            }
            break;

          case "dateCreation":
          case "dateEffet":
            if (field.type === "date") {
              mappedParams[paramKey] = value ? new Date(value) : new Date();
            }
            break;

          case "tempsSansActivite":
          case "sansActiviteDepuisPlusDe12MoisSansFermeture":
          case "absenceDeSinistreSurLes5DernieresAnnees":
          case "fractionnementPrime":
            mappedParams[paramKey] = value;
            break;

          case "qualif":
          case "assureurDefaillant":
          case "protectionJuridique":

          case "reprisePasse":
            if (field.type === "checkbox") {
              mappedParams[paramKey] = Boolean(value);
            }
            break;

          case "nomDeLAsurreur":
            if (field.type === "text" || field.type === "select") {
              mappedParams[paramKey] = value || "";
            }
            break;

          case "dateFinCouverturePrecedente":
            if (field.type === "date") {
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
          case "assureurDefaillant":
            if (field.type === "checkbox") {
              mappedParams[paramKey] = Boolean(value);
            }
            break;
          case "qualif":
            if (field.type === "checkbox") {
              mappedParams[paramKey] = Boolean(value);
            }
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
