import React from "react";
import { Quote, FormData } from "@/lib/types";

interface OfferLetterPreviewProps {
  quote: Quote;
  formData: FormData;
}

const OfferLetterPreview = ({ quote, formData }: OfferLetterPreviewProps) => {
  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === "") return "N/A";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "N/A";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("fr-FR");
    } catch (e) {
      return "N/A";
    }
  };

  const formatBoolean = (value: boolean | undefined) => {
    return value ? "OUI" : "NON";
  };

  // Données de calcul simulées (à remplacer par les vraies données du quote)
  const calculationData = {
    primeRCDProvisoire: 1500.0,
    primePJ: 150.0,
    totalRCDPJ: 1650.0,
    honoraireGestion: 165.0,
    montantRCDPJFrais: 1815.0,
    primeRCDReprisePasse: 300.0,
    primeTotale: 2115.0,
    taxes: 423.0,
    totalTTC: 2538.0,
  };

  return (
    <div className="bg-white p-8 text-black font-sans text-sm leading-relaxed">
      {/* Page 1 - Déclaration du proposant */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">
          PROPOSITION D'ASSURANCE RESPONSABILITÉ CIVILE DÉCENNALE
        </h1>

        <div className="mb-6 border-b pb-4">
          <div className="flex justify-between items-center mb-4">
            <p className="font-medium">
              Durée de validité du projet : 30 jours
            </p>
            <div className="text-right">
              <p className="font-medium">Reference dossier : {quote.id}</p>
              <p className="font-medium">N° code : {quote.id}</p>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Déclaration du proposant
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="font-medium">Nom de la société / Raison sociale :</p>
            <p className="border-b border-gray-300 pb-1">
              {formData.companyName || "N/A"}
            </p>
          </div>
          <div>
            <p className="font-medium">Forme juridique :</p>
            <p className="border-b border-gray-300 pb-1">
              {formData.legalForm || "N/A"}
            </p>
          </div>
          <div>
            <p className="font-medium">Auto-entrepreneur :</p>
            <div className="flex space-x-4">
              <span>OUI □</span>
              <span>NON □</span>
            </div>
          </div>
          <div>
            <p className="font-medium">Nom & Prénom du ou des dirigeants :</p>
            <p className="border-b border-gray-300 pb-1">
              {formData.directorName || "N/A"}
            </p>
          </div>
          <div>
            <p className="font-medium">Rue du siège social :</p>
            <p className="border-b border-gray-300 pb-1">
              {formData.address || "N/A"}
            </p>
          </div>
          <div>
            <p className="font-medium">CP Ville du siège social :</p>
            <p className="border-b border-gray-300 pb-1">
              {formData.postalCode} {formData.city}
            </p>
          </div>
          <div>
            <p className="font-medium">N° SIREN</p>
            <p className="border-b border-gray-300 pb-1">
              {formData.siret || "N/A"}
            </p>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">
          Votre déclaration
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Date d'effet souhaitée :</p>
              <p className="border-b border-gray-300 pb-1">
                {formatDate(formData.dateDeffet)}
              </p>
            </div>
            <div>
              <p className="font-medium">
                Chiffre d'affaires total du dernier exercice ou chiffre
                d'affaires prévisionnel si création d'entreprise en euros hors
                taxes : €
              </p>
              <p className="border-b border-gray-300 pb-1">
                {formatCurrency(formData.chiffreAffaires)}
              </p>
            </div>
          </div>

          <div>
            <p className="font-medium">
              Part de chiffre d'affaires total hors taxes maximum pour les
              activités sous-traitées (le sous-traitant doit être titulaire d'un
              contrat d'assurance RC Décennale de dix ans minimum) :
            </p>
            <div className="flex items-center space-x-2">
              <p className="border-b border-gray-300 pb-1 w-20">
                {formData.subContractingPercent || "N/A"}%
              </p>
              <p className="text-xs text-gray-600">
                Le sous-traitant doit être titulaire d'un contrat d'assurance RC
                Décennale de dix ans minimum
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium">
                Effectif y compris le chef d'entreprise : personnes
              </p>
              <p className="border-b border-gray-300 pb-1">
                {formData.nombreSalaries || "N/A"}
              </p>
            </div>
            <div>
              <p className="font-medium">Date de création de l'entreprise :</p>
              <p className="border-b border-gray-300 pb-1">
                {formatDate(
                  formData.companyCreationDate || formData.creationDate
                )}
              </p>
            </div>
          </div>

          <div>
            <p className="font-medium">
              Expérience professionnelle (y compris en qualité de salarié) :
              années
            </p>
            <div className="flex space-x-6">
              <span>Moins de 1 an (refus): □</span>
              <span>1 à 3 ans: □</span>
              <span>3 à 5 ans: □</span>
              <span>Sup à 5 ans: □</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Expérience déclarée: {formData.experienceMetier || "N/A"} ans
            </p>
          </div>

          <div>
            <p className="font-medium">
              La précédente assurance a été souscrite le :
            </p>
            <p className="border-b border-gray-300 pb-1">
              {formatDate(formData.previousResiliationDate)}
            </p>
          </div>

          <div>
            <p className="font-medium">
              Le contrat d'assurance de l'entreprise est-il encore en cours :
            </p>
            <div className="flex space-x-4">
              <span>OUI □</span>
              <span>NON, résilié à la date du □</span>
              <span>Jamais assuré □</span>
            </div>
          </div>

          <div>
            <p className="font-medium">Le contrat a été résilié :</p>
            <div className="space-y-2">
              <div>
                <span>Par l'assuré: □</span>
                <span className="ml-4">
                  motif de la résiliation: {formData.motifResiliation || "N/A"}
                </span>
              </div>
              <div>
                <span>Par l'assureur: □</span>
                <span className="ml-4">motif de la résiliation: N/A</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-6">
            <span>
              Avez-vous déclaré un sinistre au cours des 36 derniers mois (même
              sans suite)? {formatBoolean(formData.sinistre36Mois)} □
            </span>
          </div>

          <div className="flex space-x-6">
            <span>
              Avez-vous connaissance d'événements susceptibles d'engager votre
              responsabilité? {formatBoolean(formData.evenementsResponsabilite)}{" "}
              □
            </span>
          </div>

          <div>
            <p className="font-medium">Nombre total d'activités :</p>
            <p className="border-b border-gray-300 pb-1">
              {formData.activities?.length || 0}
            </p>
          </div>

          <div className="flex space-x-6">
            <span>
              Le souscripteur fait-il l'objet d'une procédure de redressement,
              liquidation judiciaire ou de sauvetage ?{" "}
              {formatBoolean(formData.procedureCollective)} □
            </span>
          </div>

          <div>
            <p className="font-medium">
              Le souscripteur réalise-t-il du négoce de matériaux?{" "}
              {formatBoolean(formData.negoceMateriaux)} □
            </p>
            {formData.negoceMateriaux && (
              <div className="mt-2 space-y-2">
                <div>
                  <p className="font-medium">Si oui, Nature des produits :</p>
                  <p className="border-b border-gray-300 pb-1">
                    {formData.natureProduitsNegoce || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="font-medium">
                    Chiffre d'affaires réalisé en négoce de matériaux : €
                  </p>
                  <p className="border-b border-gray-300 pb-1">
                    {formatCurrency(formData.chiffreAffairesNegoce)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <h4 className="text-lg font-semibold mb-4 text-gray-800">
            Garantie reprise du passé en cas de défaillance d'un précédent
            assureur :
          </h4>
          <div className="flex items-start space-x-2">
            <span>
              OUI, je souhaite souscrire l'extension garantie reprise du passé
              pour les 10 années précédant la souscription du présent contrat □
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-2 leading-relaxed">
            La garantie reprise du passé sera accordée au titre du contrat, les
            garanties Responsabilité pour dommages de nature Décennale et
            Responsabilité du sous-traitant en cas de dommage de nature
            Décennale seront étendues aux Chantiers dont la Date d'Ouverture de
            chantier est comprise dans la ou les périodes déclarées suivant
            l'attestation annexée à la proposition commerciale, et ne pouvant
            pas remonter à plus de 10 ans antérieurement à la date d'effet du
            contrat. Il est entendu qu'au titre du contrat sont exclus les faits
            ou événements dommageables, ou sinistres dont l'Assuré pouvait avoir
            connaissance à la date d'effet du contrat. (Les autres conditions
            des Conditions générales, auxquelles cette extension ne déroge pas
            devant être satisfaites). La prime afférente à la garantie est
            perçue une seule fois à la souscription. Les effets de cette
            garantie sont strictement limités aux activités déclarées au
            présentes Conditions particulières.
          </p>
        </div>
      </div>

      {/* Page 2 - Activités Garanties et Montants */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          ACTIVITÉS GARANTIES
        </h2>
        <div className="mb-4 text-gray-600">
          <p>N° d'activité, selon nomenclature, en annexe</p>
          <p>Libellé(s)</p>
        </div>

        <h3 className="text-xl font-semibold mb-4 text-gray-900">
          MONTANT DES GARANTIES ET DES FRANCHISES
        </h3>

        <table className="w-full border-collapse border border-gray-400 mb-4">
          <thead>
            <tr className="bg-blue-800 text-white">
              <th className="border border-gray-400 px-4 py-2 text-left">
                COUVERTURE
              </th>
              <th
                className="border border-gray-400 px-4 py-2 text-center"
                colSpan={2}
              >
                LIMITES
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                FRANCHISE
              </th>
            </tr>
            <tr className="bg-blue-700 text-white">
              <th className="border border-gray-400 px-4 py-2 text-left"></th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                PAR SINISTRE
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                PAR ANNÉE D'ASSURANCE
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                PAR SINISTRE
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                RC AVANT/APRES RÉCEPTION
                <br />
                <span className="text-sm text-gray-600">dont :</span>
              </td>
              <td className="border border-gray-400 px-4 py-2">2 000 000€</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">1 000€</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                DOMMAGES MATÉRIELS
              </td>
              <td className="border border-gray-400 px-4 py-2">1 500 000€</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">1 000€</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                DOMMAGES IMMATERIELS
              </td>
              <td className="border border-gray-400 px-4 py-2">200 000€</td>
              <td className="border border-gray-400 px-4 py-2">400 000€</td>
              <td className="border border-gray-400 px-4 py-2">1 000€</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                ATTEINTES À L'ENVIRONNEMENT
              </td>
              <td className="border border-gray-400 px-4 py-2">200 000€</td>
              <td className="border border-gray-400 px-4 py-2">400 000€</td>
              <td className="border border-gray-400 px-4 py-2">1 000€</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                FAUTES INEXCUSABLES
              </td>
              <td className="border border-gray-400 px-4 py-2">750 000€</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">1 000€</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-gray-400 px-4 py-2 font-bold">
                RC DECENNALE
              </td>
              <td
                className="border border-gray-400 px-4 py-2 font-bold"
                colSpan={2}
              >
                Montant max du chantier : 15 000 000€
              </td>
              <td className="border border-gray-400 px-4 py-2">-</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                R.C DECENNALE pour travaux de construction soumis à l'obligation
                d'assurance
                <br />
                <span className="text-xs text-gray-600">
                  <strong>En Habitation :</strong> Le montant de la garantie
                  couvre le coût des travaux de réparation des dommages à
                  l'ouvrage.
                  <br />
                  <strong>Hors habitation :</strong> Le montant de la garantie
                  couvre le coût des travaux de réparation des dommages à
                  l'ouvrage dans la limite du coût total de construction déclaré
                  par le maître d'ouvrage et sans pouvoir être supérieur au
                  montant prévu au I de l'article R. 243-3 du code des
                  assurances.
                  <br />
                  <strong>En présence d'un CCRD :</strong> Lorsqu'un Contrat
                  Collectif de Responsabilité Décennale (CCRD) est souscrit au
                  bénéfice de l'assuré, le montant de la garantie est égal au
                  montant de la franchise absolue stipulée par ledit contrat
                  collectif.
                </span>
              </td>
              <td className="border border-gray-400 px-4 py-2">2 000 000€</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">1 000€ (*)</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                R.C DECENNALE en tant que sous-traitant en cas de dommages de
                nature décennale
              </td>
              <td className="border border-gray-400 px-4 py-2">2 000 000€</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">1 000€ (*)</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                R.C DECENNALE pour travaux de construction non soumis à
                l'obligation d'assurance conformément à l'article L243-1.1
                paragraphe 1 du Code des Assurances
              </td>
              <td className="border border-gray-400 px-4 py-2">500 000€</td>
              <td className="border border-gray-400 px-4 py-2">800 000€</td>
              <td className="border border-gray-400 px-4 py-2">1 000€ (*)</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-gray-400 px-4 py-2 font-bold">
                RC CONNEXES À LA RC DECENNALE
              </td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                BON FONCTIONNEMENT DES ÉLÉMENTS D'ÉQUIPEMENTS DISSOCIABLES DES
                OUVRAGES SOUMIS À L'ASSURANCE OBLIGATOIRE
                <br />
                <span className="text-xs text-gray-600">
                  (Cette garantie est maintenue pour une durée de 2 ans à
                  compter de la réception des chantiers ouverts durant la
                  période de garantie, telle que précisée à l'article 1792-3 du
                  Code Civil.)
                </span>
              </td>
              <td className="border border-gray-400 px-4 py-2" colSpan={2}>
                600 000€
                <br />
                <span className="text-xs text-gray-600">
                  Montant unique pour l'ensemble des garanties BON
                  FONCTIONNEMENT, DOMMAGES IMMATERIELS CONSECUTIFS, DOMMAGES AUX
                  EXISTANTS et DOMMAGES INTERMEDIAIRES
                  <br />
                  Dont 100 000 € au titre des DOMMAGES INTERMEDIAIRES et
                  DOMMAGES IMMATERIELS CONSECUTIFS cumulés
                </span>
              </td>
              <td className="border border-gray-400 px-4 py-2">
                1 000€ (*)
                <br />
                <span className="text-xs text-gray-600">
                  NOTA : en cas de sinistre engageant la garantie principale et
                  une ou des garanties connexes, seule une franchise sera
                  appliquée €
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mb-4">
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-4 py-2 text-left">
                  DOMMAGES IMMATÉRIELS CONSÉCUTIFS
                </th>
                <th className="border border-gray-400 px-4 py-2 text-left"></th>
                <th className="border border-gray-400 px-4 py-2 text-left"></th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-4 py-2 text-left">
                  DOMMAGES AUX EXISTANTS
                </th>
                <th className="border border-gray-400 px-4 py-2 text-left"></th>
                <th className="border border-gray-400 px-4 py-2 text-left"></th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-4 py-2 text-left">
                  DOMMAGES MATÉRIELS INTERMÉDIAIRES AFFECTANT UN OUVRAGE SOUMIS
                  À L'ASSURANCE OBLIGATOIRE
                </th>
                <th className="border border-gray-400 px-4 py-2 text-left"></th>
                <th className="border border-gray-400 px-4 py-2 text-left"></th>
              </tr>
            </thead>
          </table>
        </div>

        <p className="text-xs text-gray-600 mb-4">
          (*): Franchise doublée en cas de sous-traitance à une entreprise non
          assurée en Responsabilité Civile Décennale pour ces travaux
        </p>
      </div>

      {/* Page 3 - Produits d'assurance et détails des primes */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b-2 border-blue-800 pb-2">
          PRODUITS D'ASSURANCES CONCERNÉS :
        </h3>
        <p className="mb-4">
          Selon les clauses et les conditions générales susmentionnées, le
          contrat à pour lieu de garantir l'assuré contre les risques suivants :
        </p>
        <ul className="list-disc pl-6 mb-6">
          <li>Sa Responsabilité Civile Professionnelle</li>
          <li>Sa Responsabilité Civile Décennale</li>
          <li>- Des dommages à l'ouvrage en cours de travaux</li>
          <li>- La protection Juridique Complément RCD</li>
        </ul>

        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b-2 border-blue-800 pb-2">
          DETAILS DE LA PRIME :
        </h3>

        {/* Tableau des primes année en cours */}
        <h4 className="font-semibold mb-2">
          PRIMES année en cours pour la période du au
        </h4>
        <table className="w-full border-collapse border border-gray-400 mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-4 py-2 text-left"></th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Montants H.T
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Montants Taxes
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Montant TTC
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                Prime RCD provisionnelle hors reprise du passé
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeRCDProvisoire)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeRCDProvisoire * 0.2)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeRCDProvisoire * 1.2)}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                Prime Protection Juridique Complément RCD
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primePJ)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primePJ * 0.2)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primePJ * 1.2)}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                Montant total RCD + PJ
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.totalRCDPJ)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.totalRCDPJ * 0.2)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.totalRCDPJ * 1.2)}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                Honoraire de gestion
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.honoraireGestion)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.honoraireGestion * 0.2)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.honoraireGestion * 1.2)}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                Montant RCD +PJ+ Frais gestion
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.montantRCDPJFrais)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.montantRCDPJFrais * 0.2)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.montantRCDPJFrais * 1.2)}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                Prime RCD pour la garantie reprise du passé (Prime unique à la
                souscription)
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeRCDReprisePasse)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeRCDReprisePasse * 0.2)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeRCDReprisePasse * 1.2)}
              </td>
            </tr>
            <tr className="bg-blue-50">
              <td className="border border-gray-400 px-4 py-2 font-bold">
                Prime totale à régler( avec reprise passé)
              </td>
              <td className="border border-gray-400 px-4 py-2 font-bold">
                {formatCurrency(calculationData.primeTotale)}
              </td>
              <td className="border border-gray-400 px-4 py-2 font-bold">
                {formatCurrency(calculationData.taxes)}
              </td>
              <td className="border border-gray-400 px-4 py-2 font-bold">
                {formatCurrency(calculationData.totalTTC)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Tableau des primes annuelles */}
        <h4 className="font-semibold mb-2">
          PRIMES annuelles pour la période du au
        </h4>
        <table className="w-full border-collapse border border-gray-400 mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-4 py-2 text-left"></th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Montants H.T
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Montants Taxes
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Montant TTC
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                Prime RCD provisionnelle hors reprise du passé
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeRCDProvisoire)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeRCDProvisoire * 0.2)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeRCDProvisoire * 1.2)}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                Prime Protection Juridique Complément RCD
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primePJ)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primePJ * 0.2)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primePJ * 1.2)}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                Montant total RCD + PJ
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.totalRCDPJ)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.totalRCDPJ * 0.2)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.totalRCDPJ * 1.2)}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                Honoraire de gestion
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.honoraireGestion)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.honoraireGestion * 0.2)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.honoraireGestion * 1.2)}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                Montant RCD +PJ+ Frais gestion
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.montantRCDPJFrais)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.montantRCDPJFrais * 0.2)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.montantRCDPJFrais * 1.2)}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                Prime RCD pour la garantie reprise du passé (Prime unique à la
                souscription)
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeRCDReprisePasse)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeRCDReprisePasse * 0.2)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeRCDReprisePasse * 1.2)}
              </td>
            </tr>
            <tr className="bg-blue-50">
              <td className="border border-gray-400 px-4 py-2 font-bold">
                Prime totale à régler( avec reprise passé)
              </td>
              <td className="border border-gray-400 px-4 py-2 font-bold">
                {formatCurrency(calculationData.primeTotale)}
              </td>
              <td className="border border-gray-400 px-4 py-2 font-bold">
                {formatCurrency(calculationData.taxes)}
              </td>
              <td className="border border-gray-400 px-4 py-2 font-bold">
                {formatCurrency(calculationData.totalTTC)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Page 4 - Échéancier et modalités */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b-2 border-blue-800 pb-2">
          ECHEANCIER (y compris reprise passé si incluse)
        </h3>
        <table className="w-full border-collapse border border-gray-400 mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-4 py-2 text-left">
                ECHEANCIER (y compris reprise passé si incluse)
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Montants H.T
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Montants Taxes
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Montant TTC
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                PRIME pour la période du au
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeTotale)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.taxes)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.totalTTC)}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-4 py-2">
                PRIME pour la période du au
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.primeTotale)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.taxes)}
              </td>
              <td className="border border-gray-400 px-4 py-2">
                {formatCurrency(calculationData.totalTTC)}
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b-2 border-blue-800 pb-2">
          DETAIL DES PAIEMENTS A EFFECTUER :
        </h3>

        <table className="w-full border-collapse border border-gray-400 mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-4 py-2 text-left">
                Date
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Total HT €
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Taxe €
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Total TTC €
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                RCD
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">PJ</th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Frais
              </th>
              <th className="border border-gray-400 px-4 py-2 text-left">
                Reprise
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
              <td className="border border-gray-400 px-4 py-2">-</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <span>Dont TTC €</span>
            <div className="border-b border-gray-300 w-20"></div>
          </div>
          <div className="flex items-center space-x-2">
            <span>□</span>
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-6">
          * Le montant forfaitaire est révisable selon le chiffre d'affaires HT
          et l'indice national (BT01), les honoraires ENCYCLIE ASSURANCES, les
          taxes accessoires et la PJ.
        </p>

        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b-2 border-blue-800 pb-2">
          MODALITES DE GESTION
        </h3>

        <div className="space-y-4 mb-6">
          <div>
            <p className="font-semibold mb-2">1) Les pièces à joindre :</p>
            <p className="mb-2">
              Cette offre est valable sous condition de la remise des éléments
              cités ci-dessous :
            </p>
            <div className="border border-gray-300 p-4 min-h-[100px] bg-gray-50">
              {/* Les pièces justificatives seront listées ici */}
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">
              2) Les modalités de règlement :
            </p>
            <ul className="list-disc pl-6">
              <li>Périodicité de règlement: {formData.periodicity || "N/A"}</li>
              <li>Nombre d'échéances pour la reprise du passé si incluse :</li>
            </ul>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4 text-blue-800">
          Vos assureurs :
        </h3>

        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>
            <strong>FIDELIDADE :</strong> FIDELIDADE, succursale française de la
            société FIDELIDADE Companhia de Seguros, S.A, société anonyme de
            droit portugais, au capital de 150 000 000 euros, dont le siège
            social est situé Av. da Boavista, 1269-076 Lisboa, Portugal,
            immatriculée au Registre du commerce de Lisbonne sous le numéro 500
            276 280, établissement principal en France situé 12-14, rond-point
            des Champs-Élysées 75008 Paris, immatriculée au RCS Paris sous le
            numéro 422 443 128.
          </li>
          <li>
            <strong>Cfdp Assurances :</strong> Cfdp Assurances, société anonyme
            au capital de 3 000 000 euros, dont le siège social est situé 43
            avenue du Général de Gaulle 69006 Lyon, immatriculée au RCS Lyon
            sous le numéro 414 233 723, régie par le code des assurances.
          </li>
        </ul>

        <h3 className="text-lg font-semibold mb-4 text-blue-800">
          VOS DÉCLARATIONS :
        </h3>

        <p className="mb-4">Le souscripteur déclare :</p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>
            Ne pas intervenir sur des ouvrages exceptionnels ou inhabituels.
          </li>
          <li>
            Que les travaux de construction seront effectués avec des matériaux
            et procédés courants.
          </li>
          <li>
            Ne pas contracter pour la conception, direction ou surveillance de
            travaux en qualité de maître d'ouvrage ou de sous-traitant.
          </li>
          <li>
            Ne pas avoir exercé sans assurance Responsabilité Civile Décennale
            au cours des 10 dernières années.
          </li>
          <li>
            Ne pas avoir déclaré de sinistre au cours des 36 derniers mois, ni
            aucun sinistre sans suite au cours de cette période.
          </li>
          <li>
            Ne pas agir en qualité de "constructeur de maison individuelle"
            (réalisation complète d'un ouvrage, conception et réalisation).
          </li>
          <li>
            Ne pas vendre exclusivement des produits de construction au sens de
            l'article 1792-4 du Code civil.
          </li>
          <li>
            Ne pas exercer d'activité de "négoce de matériaux" dépassant 15% de
            son chiffre d'affaires.
          </li>
          <li>
            Ne pas agir en qualité de "constructeur de maison individuelle"
            (avec ou sans plans, au sens de la loi n°90-1129 du 19 décembre
            1990) ou d'activités similaires (construction de corps de bâtiment
            et de couverture sur un même site).
          </li>
          <li>
            Ne pas exercer d'activité de conception, direction ou surveillance
            de travaux.
          </li>
        </ul>
      </div>

      {/* Page 5 - Conditions et déclarations finales */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b-2 border-blue-800 pb-2">
          CONDITIONS ET DÉCLARATIONS
        </h3>

        <div className="space-y-4 mb-6">
          <div>
            <p className="font-semibold mb-2">Conditions :</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>
                Les sous-traitants doivent être assurés en Responsabilité Civile
                Décennale avec capitalisation de prime.
              </li>
              <li>
                Le chiffre d'affaires de l'activité principale doit représenter
                au minimum 30% du chiffre d'affaires hors taxes de l'entreprise.
              </li>
              <li>
                Le chiffre d'affaires annuel doit être ≤ 500 000€, ou ≤ 70 000€
                pour les auto-entrepreneurs.
              </li>
              <li>
                Les travaux doivent être réalisés en Martinique, Guadeloupe,
                Guyane, St Barthélemy, Saint Martin, La Réunion, Mayotte (hors
                métropole).
              </li>
              <li>
                Pour les travaux soumis à l'assurance obligatoire : montant du
                projet ≤ 500 000€, et coût total de construction (tous corps
                d'état, y compris honoraires) ≤ 15 000 000€.
              </li>
              <li>
                Pour les travaux non soumis à l'assurance obligatoire : montant
                du projet ≤ 350 000€, et coût total de construction (tous corps
                d'état, y compris honoraires) ≤ 1 000 000€.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Déclarations du souscripteur :</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>
                Le souscripteur certifie ne pas avoir connaissance d'événements,
                de faits ou de sinistres non déclarés susceptibles d'engager sa
                responsabilité.
              </li>
              <li>
                Le souscripteur certifie que les renseignements fournis dans la
                demande de proposition sont sincères, exacts et complets et
                constituent un élément essentiel du contrat.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">
              Conséquences en cas de fausse déclaration :
            </p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>
                <strong>Dissimulation volontaire / Fausse déclaration :</strong>{" "}
                Peut entraîner la nullité du contrat (Art. L.113-8 du Code des
                Assurances).
              </li>
              <li>
                <strong>Omission / Déclaration inexacte :</strong> Peut
                entraîner une majoration de prime, la résiliation du contrat ou
                une réduction des indemnités en cas de sinistre (Art. L.113-9 du
                Code des Assurances).
              </li>
            </ul>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b-2 border-blue-800 pb-2">
          PROTECTION DES DONNÉES PERSONNELLES (RGPD)
        </h3>

        <div className="space-y-3 text-sm mb-6">
          <p>
            Les données à caractère personnel (DCP) collectées par ENCYCLIE sont
            traitées aux fins de conclusion, d'exécution et de gestion du
            contrat d'assurance pour l'assuré et les bénéficiaires, avant et
            après souscription.
          </p>
          <p>
            Les DCP sont destinées aux services autorisés d'ENCYCLIE et peuvent
            être transmises à nos partenaires contractuels pour la gestion du
            contrat et aux réassureurs. Elles ne seront pas utilisées à d'autres
            fins ni communiquées à d'autres organismes sans votre consentement
            exprès, libre et éclairé.
          </p>
          <p>
            Les données sont conservées par ENCYCLIE en tant que responsable de
            traitement, dans le respect des durées de conservation
            réglementaires et sans excéder la durée nécessaire aux finalités
            pour lesquelles elles sont collectées.
          </p>
          <p>
            Les DCP peuvent être transférées hors de l'Espace économique
            européen, dans le respect de la réglementation en vigueur afin
            d'assurer un niveau de sécurité et de protection de la vie privée et
            des droits fondamentaux adéquat.
          </p>
          <p>
            Conformément au RGPD et à la loi française relative à la protection
            des données, l'assuré et les bénéficiaires disposent d'un droit
            d'accès, de rectification, d'effacement, de portabilité des données
            et d'opposition pour des motifs légitimes (incluant le
            traitement/profilage automatisé), de limitation du traitement et de
            décider du sort de leurs données après leur décès. Pour exercer ces
            droits, contactez : ENCYCLIE DONNÉES PERSONNELLES, 42 RUE NOTRE-DAME
            DES VICTOIRES 75002 PARIS, Email:
            souscriptionRCD@encyclie-construction.com
          </p>
        </div>

        <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b-2 border-blue-800 pb-2">
          BASE DE L'OFFRE ET DOCUMENTS RÉFÉRENCÉS
        </h3>

        <div className="space-y-3 text-sm">
          <p>
            L'offre RCD DROM-COM est établie sur la base des éléments du
            questionnaire transmis par le proposant à son intermédiaire. Le
            proposant est responsable de l'exactitude de ces renseignements.
          </p>
          <p>Le devis comprend les références aux documents suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Conditions Générales : ENCYCLIE BAT-CG_FIDELIDADE_01_05_2025
            </li>
            <li>Document d'Information sur le Produit d'Assurance (DIPA)</li>
            <li>Nomenclature des activités souscrites avec Encyclie BAT</li>
            <li>CG PJ COMPLEMENT RCD-8178-122021</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-600 text-xs mt-8 pt-4 border-t border-gray-300">
        <p>Document généré le {formatDate(new Date().toISOString())}</p>
        <p>
          Ceci est une prévisualisation et n'a pas de valeur contractuelle sans
          signature.
        </p>
      </div>
    </div>
  );
};

export default OfferLetterPreview;
