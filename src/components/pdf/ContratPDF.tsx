import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { Quote, FormData } from "@/lib/types";
import { getTaxeByRegion, tableauTax } from "@/lib/tarificateurs/rcd";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 40,
    fontSize: 11,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 20,
  },
  logo: {
    width: 90,
    height: 45,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 10,
  },
  section: {
    marginBottom: 14,
  },
  box: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  strong: {
    fontWeight: "bold",
  },
  small: {
    fontSize: 9,
    color: "#6b7280",
  },
  table: {
    marginTop: 8,
    marginBottom: 12,
    border: "1px solid #e5e7eb",
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F39200",
    borderBottom: "1px solid #C36C0B",
  },
  th: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "center",
    borderRight: "1px solid #C36C0B",
  },
  row: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    color: "#374151",
    textAlign: "left",
    borderRight: "1px solid #e5e7eb",
  },
  listItem: {
    marginBottom: 3,
    fontSize: 10,
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: "1px solid #e5e7eb",
  },
  footerText: {
    fontSize: 11,
    color: "#374151",
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 9,
    color: "#6b7280",
  },
  infoBox: {
    backgroundColor: "#fef3c7",
    border: "1px solid #f59e0b",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
});

interface ContractRCDPDFProps {
  baseUrl?: string;
  quote?: Quote;
  formData?: FormData;
  calculationResult?: any;
}

const ContractRCDPDF: React.FC<ContractRCDPDFProps> = ({
  baseUrl,
  quote,
  formData,
  calculationResult,
}) => {
  const logoSrc = `${baseUrl ? baseUrl : ""}/couleur_1.png`;

  // Fonction pour formater les dates
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "XX/XX/XXXX";
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "XX/XX/XXXX";
    }
  };

  // Fonction pour obtenir l'échéance annuelle (31/12 par défaut)
  const getEcheanceAnnuelle = () => {
    if (formData?.dateDeffet) {
      try {
        const dateEffet = new Date(formData.dateDeffet);
        // L'échéance est généralement le 31/12 de chaque année
        return "31/12";
      } catch (e) {
        return "31/12";
      }
    }
    return "31/12";
  };

  // Fonctions utilitaires
  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === "") return "N/A";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "N/A";
    return Math.round(num).toLocaleString("fr-FR");
  };

  const formatBoolean = (value: boolean | undefined) => {
    return value ? "OUI" : "NON";
  };

  function financial(x: number | undefined | null) {
    if (x === undefined || x === null) return "0";
    return x.toFixed(2);
  }

  // Récupérer les valeurs dynamiques
  const dateEffet = formData?.dateDeffet
    ? formatDate(formData.dateDeffet)
    : "XX/XX/XXXX";
  const dateEdition = quote?.createdAt
    ? formatDate(quote.createdAt)
    : formatDate(new Date().toISOString());
  const echeanceAnnuelle = getEcheanceAnnuelle();
  const nomSouscripteur = formData?.companyName || "N/A";
  const prenomNom = formData?.directorName || "";
  const numeroClient = quote?.reference || "N/A";
  const nomComplet = `${nomSouscripteur} ${prenomNom}`.trim();
  // Indice de référence - valeur par défaut si non trouvée
  const indiceReference = "992,7"; // Valeur par défaut, à ajuster si disponible dans calculationResult

  // Informations du souscripteur
  const raisonSociale = formData?.companyName || "N/A";
  const formeJuridique = formData?.legalForm || "N/A";
  const autoEntrepreneur = formatBoolean(
    formData?.legalForm?.toLowerCase() === "entreprise individuelle" ||
      formData?.autoEntrepreneur
  );
  const dirigeants = formData?.directorName || "N/A";
  const adresseSiege = formData?.address || "N/A";
  const cpVilleSiege =
    `${formData?.postalCode || ""} ${formData?.city || ""}`.trim() || "N/A";
  const siret = formData?.siret || "N/A";
  const telephone = formData?.phoneNumber || "N/A";
  const email = formData?.mailAddress || "N/A";

  // Déclarations
  const chiffreAffaires = formData?.chiffreAffaires || "N/A";
  const partSousTraitance = formData?.subContractingPercent || "0";
  const effectif = formData?.nombreSalaries || "N/A";
  const dateCreation = formatDate(
    formData?.companyCreationDate || formData?.creationDate
  );
  const experience = formData?.experienceMetier || "N/A";
  const datePrecedenteAssurance = formatDate(formData?.previousResiliationDate);
  const contratEnCours = formatBoolean(
    formData?.previousRcdStatus === "EN_COURS"
  );
  const contratResilie = formatBoolean(
    formData?.previousRcdStatus === "RESILIE"
  );
  const motifResiliation = formData?.motifResiliation || "N/A";
  const sinistre36Mois = formatBoolean(formData?.sinistre36Mois);
  const evenementsResponsabilite = formatBoolean(
    formData?.evenementsResponsabilite
  );
  const nombreActivites = formData?.activities?.length || 0;
  const procedureCollective = formatBoolean(formData?.procedureCollective);
  const negoceMateriaux = formatBoolean(formData?.negoceMateriaux);
  const natureProduitsNegoce = formData?.natureProduitsNegoce || "N/A";
  const caNegoce = formatCurrency(formData?.chiffreAffairesNegoce);
  const garantieReprisePasse = formatBoolean(formData?.garantieReprisePasse);

  // Primes depuis calculationResult
  const periodeDebut = calculationResult?.echeancier?.echeances?.[0]
    ?.debutPeriode
    ? formatDate(calculationResult.echeancier.echeances[0].debutPeriode)
    : "XX/XX/XXXX";
  const periodeFin = calculationResult?.echeancier?.echeances?.[
    (calculationResult?.echeancier?.echeances?.length || 1) - 1
  ]?.finPeriode
    ? formatDate(
        calculationResult.echeancier.echeances[
          calculationResult.echeancier.echeances.length - 1
        ].finPeriode
      )
    : "XX/XX/XXXX";

  const primeRCDHT = calculationResult?.echeancier?.echeances
    ? financial(
        calculationResult.echeancier.echeances.reduce(
          (sum: number, echeance: any) =>
            sum + (echeance.rcd - echeance.taxe || 0),
          0
        )
      )
    : "0";
  const primeRCDTaxes = calculationResult?.echeancier?.echeances
    ? financial(
        calculationResult.echeancier.echeances.reduce(
          (sum: number, echeance: any) => sum + (echeance.taxe || 0),
          0
        )
      )
    : "0";
  const primeRCDTTC = calculationResult?.echeancier?.echeances
    ? financial(
        calculationResult.echeancier.echeances.reduce(
          (sum: number, echeance: any) => sum + (echeance.rcd || 0),
          0
        )
      )
    : "0";

  const primePJHT = calculationResult?.echeancier?.echeances
    ? financial(
        calculationResult.echeancier.echeances.reduce(
          (sum: number, echeance: any) => sum + (echeance.pj || 0),
          0
        ) *
          (1 - getTaxeByRegion(quote?.formData?.territory || ""))
      )
    : "0";
  const primePJTaxes = calculationResult?.echeancier?.echeances
    ? financial(
        calculationResult.echeancier.echeances.reduce(
          (sum: number, echeance: any) => sum + (echeance.pj || 0),
          0
        ) * getTaxeByRegion(quote?.formData?.territory || "")
      )
    : "0";
  const primePJTTC = calculationResult?.echeancier?.echeances
    ? financial(
        calculationResult.echeancier.echeances.reduce(
          (sum: number, echeance: any) => sum + (echeance.pj || 0),
          0
        )
      )
    : "0";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <Image src={logoSrc} style={styles.logo} />
          <Text style={styles.subtitle}>
            Conditions particulières – Responsabilité Civile Professionnelle et
            Décennale
          </Text>
        </View>

        {/* Encart d'identification */}
        <View style={styles.box}>
          <Text>
            <Text style={styles.strong}>CONTRAT N°</Text> :{" "}
            <Text style={styles.strong}>
              {quote?.reference || "20220XRCDWAK"}
            </Text>
          </Text>
          <Text>
            Type d'assurance : Responsabilité Civile Professionnelle et
            Décennale
          </Text>
          <Text>Date d'effet : {dateEffet}</Text>
          <Text>Édité le : {dateEdition}</Text>
          <Text>Échéance annuelle : {echeanceAnnuelle}</Text>
          <Text>
            Nom du souscripteur : Numéro Client : {numeroClient} {nomComplet}
          </Text>
          <Text>Indice de référence : {indiceReference}</Text>
        </View>

        {/* Assureur / Distributeur */}
        <View style={styles.section}>
          <Text>
            <Text style={styles.strong}>ASSUREUR</Text> : WAKAM, Société Anonyme
            au capital de 4 658 992 €, siège social 120-122 rue Réaumur, 75002
            PARIS, Immatriculée au Registre du Commerce et des Sociétés de
            Paris, sous le numéro 562 117 085
          </Text>
          <Text>
            <Text style={styles.strong}>CFDP Assurances SA</Text> – Entreprise
            régie par le Code des Assurances – Immatriculée au registre du
            commerce et des Sociétés de Lyon sous le numéro 958 506 156 – Siège
            social : Immeuble l'Europe - 62 Rue de Bonnel - 69003 LYON
          </Text>
          <Text>
            <Text style={styles.strong}>
              DISTRIBUTEUR ET GESTIONNAIRE DES CONTRATS
            </Text>{" "}
            : ENCYCLIE CONSTRUCTION – 21 Rue de l'Eglise 44210 Pornic - SAS au
            capital de 1 000 € - SIREN 897 796 785 – RCS ST NAZAIRE – N° ORIAS :
            21 004 564
          </Text>
          <Text>
            <Text style={styles.strong}>GESTIONNAIRE DES SINISTRES</Text> : ACS
            Solutions SAS – Le Carillon, 6 Esplanade Charles de Gaulle, 92000
            NANTERRE – Société de droit français au capital de 97 479,30 €
            immatriculée au RCS de Nanterre sous le numéro 502 915 507
          </Text>
        </View>

        {/* Préambule */}
        <View style={styles.section}>
          <Text>
            Les présentes Conditions Particulières prévalent sur les Conditions
            Générales jointes (Réf. ENCYCLIE BAT-CG_WAKAM_082022), dont le
            souscripteur reconnaît avoir reçu un exemplaire, constituent le
            contrat d'assurance conclu entre :
          </Text>
        </View>

        {/* Parties */}
        <View style={styles.section}>
          <Text style={styles.title}>le SOUSCRIPTEUR :</Text>
          <Text>Nom de la société / Raison sociale : {raisonSociale}</Text>
          <Text>Forme juridique : {formeJuridique}</Text>
          <Text>Auto-entrepreneur : {autoEntrepreneur}</Text>
          <Text>Nom & Prénom du ou des dirigeants : {dirigeants}</Text>
          <Text>Rue du siège social : {adresseSiege}</Text>
          <Text>CP Ville du siège social : {cpVilleSiege}</Text>
          <Text>N°Immatriculation au répertoire des métiers : {siret}</Text>
          <Text>Tél : {telephone}</Text>
          <Text>Email : {email}</Text>
          <Text style={{ marginTop: 8 }}>
            et l'<Text style={styles.strong}>ASSUREUR</Text> : WAKAM (nouveau
            nom de LA PARISIENNE ASSURANCES), Société Anonyme au capital de 4
            658 992 €, siège social 120-122 rue Réaumur, 75002 PARIS,
            Immatriculée au Registre du Commerce et des Sociétés de Paris, sous
            le numéro 562 117 085
          </Text>
          <Text style={styles.small}>
            L'autorité française chargée du contrôle de la Compagnie d'assurance
            ci-dessus désignée est l'Autorité de Contrôle Prudentiel et de
            Résolution (ACPR), dont le siège est 4 Place de Budapest - CS 92459
            - 75436 Paris Cedex 09; cet organisme public exerce son contrôle sur
            les sociétés d'assurances listées à l'article L. 310-2 du Code des
            Assurances.
          </Text>
        </View>

        {/* Chapitre 1 – Déclarations */}
        <View style={styles.section}>
          <Text style={styles.title}>
            CHAPITRE 1 – DÉCLARATIONS DU SOUSCRIPTEUR
          </Text>
          <Text style={styles.strong}>Votre déclaration :</Text>
          <Text>
            Chiffre d'affaires total du dernier exercice ou chiffre d'affaires
            prévisionnel si création d'entreprise en euros hors taxes :{" "}
            {chiffreAffaires} €
          </Text>
          <Text>
            Part de chiffre d'affaires total hors taxes maximum pour les
            activités sous-traitées (le Souscripteur demande à chacun de ses
            sous-traitants participant à la construction une attestation
            d'assurance décennale valable à la date de DROC, précisant que la
            garantie s'applique lorsque le proposant agit en qualité de
            sous-traitant) : {partSousTraitance}%
          </Text>
          <Text>
            Effectif y compris le chef d'entreprise : {effectif} personnes
          </Text>
          <Text>Date de création de l'entreprise : {dateCreation}</Text>
          <Text>
            Expérience professionnelle (y compris en qualité de salarié) :{" "}
            {experience} ans
          </Text>
          <Text>
            La précédente assurance a été souscrite le :{" "}
            {!formData?.assureurDefaillant
              ? datePrecedenteAssurance
              : "Assureur défaillant"}
          </Text>
          <Text>
            Le contrat d'assurance de l'entreprise est-il encore en cours :{" "}
            {contratEnCours}
          </Text>
          {/* <Text>
            Le contrat a été résilié : {contratResilie ? "OUI" : "NON"}
            {formData?.previousInsurer
              ? `, autre contrat chez ${formData.previousInsurer}`
              : ""}
          </Text> */}
          <Text>
            Par l'assuré : motif de la résiliation :{" "}
            {!formData?.assureurDefaillant
              ? motifResiliation
              : "Assureur défaillant"}
          </Text>
          <Text>
            Par l'assureur : motif de la résiliation :{" "}
            {formData?.resiliePar === "ASSUREUR"
              ? "Non-Paiement de la prime Sinistre Modification d'activité"
              : "N/A"}
          </Text>
          <Text>
            Avez-vous déclaré un sinistre au cours des 36 derniers mois (même
            sans suite) ? {sinistre36Mois}
          </Text>
          <Text>
            Avez-vous connaissance d'événements susceptibles d'engager votre
            responsabilité ? {evenementsResponsabilite}
          </Text>
          <Text>Nombre total d'activités : {nombreActivites}</Text>
          <Text>
            Le souscripteur fait-il l'objet d'une procédure de redressement,
            liquidation judiciaire ou de sauvetage ? {procedureCollective}
          </Text>
          <Text>
            Le souscripteur réalise-t-il du négoce de matériaux ?{" "}
            {negoceMateriaux}
          </Text>
          {negoceMateriaux === "OUI" && (
            <>
              <Text>Si oui, Nature des produits : {natureProduitsNegoce}</Text>
              <Text>
                Chiffre d'affaires réalisé en négoce de matériaux : {caNegoce} €
              </Text>
            </>
          )}
          <View style={styles.infoBox}>
            <Text style={styles.strong}>
              Garantie reprise du passé en cas de défaillance d'un précédent
              assureur :
            </Text>
            <Text>
              {garantieReprisePasse === "OUI"
                ? "OUI, je souhaite souscrire l'extension garantie reprise du passé pour les 10 années précédant la souscription du présent contrat"
                : "NON, je ne souhaite pas souscrire l'extension garantie reprise du passé"}
            </Text>
            <Text>
              La garantie reprise du passé sera accordée au titre du contrat,
              les garanties Responsabilité pour dommages de nature Décennale et
              Responsabilité du sous-traitant en cas de dommage de nature
              Décennale seront étendues aux Chantiers dont la Date d'Ouverture
              de chantier est comprise dans la ou les périodes déclarées suivant
              l'attestation annexée à la proposition commerciale, et ne pouvant
              pas remonter à plus de 10 ans antérieurement à la date d'effet du
              contrat. Il est entendu qu'au titre du contrat sont exclus les
              faits ou événements dommageables, ou sinistres dont l'Assuré
              pouvait avoir connaissance à la date d'effet du contrat. (Les
              autres conditions des Conditions générales, auxquelles cette
              extension ne déroge pas devant être satisfaites).
            </Text>
            <Text>
              La prime afférente à la garantie est perçue une seule fois à la
              souscription.
            </Text>
            <Text>
              Les effets de cette garantie sont strictement limités aux
              activités déclarées au présentes Conditions particulières.
            </Text>
          </View>
          <Text style={styles.strong}>Le souscripteur déclare :</Text>
          <Text style={styles.listItem}>
            - Ne pas intervenir sur des ouvrages exceptionnels et/ou inusuels ;
          </Text>
          <Text style={styles.listItem}>
            - Que les travaux de construction seront réalisés avec des matériaux
            et suivant des procédés relevant de technique courante ;
          </Text>
          <Text style={styles.listItem}>
            - Ne pas passer de marchés portant sur la conception, la direction
            et/ou la surveillance de travaux que ce soit en qualité de locateur
            ou de sous-traitant.
          </Text>
          <Text style={styles.listItem}>
            - Ne pas avoir exercé d'activité sans être assuré en Responsabilité
            Civile Décennale au cours des 10 dernières années
          </Text>
          <Text style={styles.listItem}>
            - Ne pas avoir déclaré de sinistre au cours des 36 derniers mois OU
            avoir déclaré des sinistre(s) sans suite durant cette période.
          </Text>
          <Text style={styles.listItem}>
            - Ne pas intervenir sur des ouvrages d'un coût maximum TTC
            n'excédant pas : 15 000 000 € pour un ouvrage soumis à l'obligation
            d'assurance et 1 000 000€ pour les ouvrages non soumis à
            l'obligation d'assurance.
          </Text>
          <Text style={styles.listItem}>
            - Ne pas exercer l'activité « contractant général » (personne
            physique ou morale qui s'engage, au travers d'un contrat de louage
            d'ouvrage unique à la conception et la réalisation, dans son
            intégralité, d'un ouvrage)
          </Text>
          <Text style={styles.listItem}>
            - Ne pas exercer une activité exclusive de vendeur de produits de
            construction visée à l'article 1792-4 du Code Civil
          </Text>
          <Text style={styles.listItem}>
            - Ne pas exercer une activité de « négoce de matériaux » supérieur à
            15% de son Chiffre d'affaires
          </Text>
          <Text style={styles.listItem}>
            - Ne pas exercer une activité de « constructeur de maisons
            individuelle », (avec ou sans fourniture de plans telle que visée
            dans la loi n°90-1129 du 19 décembre 1990 et son décret
            d'application du 27 novembre 1991) et assimilés (réalisation sur un
            même chantier du clos et couvert)
          </Text>
          <Text style={styles.listItem}>
            - Ne pas exercer d'activité de conception, direction ou surveillance
            de travaux
          </Text>
          <Text style={styles.listItem}>
            - Ne pas donner en sous-traitance des travaux au-delà de 15% de son
            chiffre d'affaires maximum.
          </Text>
          <Text style={styles.listItem}>
            - Sous-traiter des travaux uniquement à des entreprises assurées
            pour ces travaux confiés, en Responsabilité Civile Décennale, auprès
            d'assureurs qui gèrent les risques sous le régime comptable de la
            capitalisation des primes.
          </Text>
          <Text style={styles.listItem}>
            - Avoir une activité principale représentant au minimum 30% de son
            chiffre d'affaires HT
          </Text>
          <Text style={styles.listItem}>
            - Réaliser un chiffre d'affaires annuel inférieur ou égal à 500 000€
            ou 70 000€ si auto-entrepreneur
          </Text>
          <Text style={styles.listItem}>
            - Exercer ses travaux dans les territoires suivant : Martinique,
            Guadeloupe, Guyane, St Barthelemy, Saint Martin, Réunion, Mayotte à
            l'exclusion de la France Métropolitaine.
          </Text>
          <Text style={styles.listItem}>
            - Que si le chiffre d'affaires venait à augmenter de plus de 30% en
            cours de la Période d'Assurance par rapport au dernier chiffre
            d'affaires déclaré, le souscripteur devra déclarer cette évolution à
            l'Assureur dans un délai de quinze (15) jours à compter du moment où
            il en a connaissance.
          </Text>
          <Text style={[styles.strong, { marginTop: 8 }]}>
            Le souscripteur certifie ne pas avoir connaissance, d'évènement(s),
            fait(s) ou sinistre(s) susceptibles d'engager sa responsabilité en
            dehors de ceux éventuellement déclarés à la souscription.
          </Text>
        </View>

        {/* Chapitre 2 – Montants des garanties et franchises - TABLEAU COMPLET */}
        <View style={styles.section}>
          <Text style={styles.title}>
            CHAPITRE 2 – MONTANT DES GARANTIES ET DES FRANCHISES
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>COUVERTURE</Text>
              <Text style={styles.th}>LIMITES</Text>
              <Text style={styles.th}>FRANCHISE</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>
                RC AVANT/APRÈS RÉCEPTION dont :
              </Text>
              <Text style={styles.td}>2 000 000€ PAR SINISTRE</Text>
              <Text style={styles.td}>1 000€</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>DOMMAGES MATÉRIELS</Text>
              <Text style={styles.td}>1 500 000€ PAR SINISTRE</Text>
              <Text style={styles.td}>1 000€</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>DOMMAGES IMMATÉRIELS</Text>
              <Text style={styles.td}>
                200 000€ PAR SINISTRE / 400 000€ PAR ANNÉE D'ASSURANCE
              </Text>
              <Text style={styles.td}>1 000€</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>
                ATTEINTES À L'ENVIRONNEMENT
              </Text>
              <Text style={styles.td}>
                200 000€ PAR SINISTRE / 400 000€ PAR ANNÉE D'ASSURANCE
              </Text>
              <Text style={styles.td}>1 000€</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>FAUTES INEXCUSABLES</Text>
              <Text style={styles.td}>750 000€ PAR SINISTRE</Text>
              <Text style={styles.td}>1 000€</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>RC DECENNALE</Text>
              <Text style={styles.td}>
                Montant max du chantier : 15 000 000€
              </Text>
              <Text style={styles.td}>-</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>
                R.C DECENNALE pour travaux de construction soumis à l'obligation
                d'assurance
              </Text>
              <Text style={styles.td}>
                En Habitation : Le montant de la garantie couvre le coût des
                travaux de réparation des dommages à l'ouvrage. Hors habitation
                : Le montant de la garantie couvre le coût des travaux de
                réparation des dommages à l'ouvrage dans la limite du coût total
                de construction déclaré par le maître d'ouvrage et sans pouvoir
                être supérieur au montant prévu au I de l'article R. 243-3 du
                code des assurances. En présence d'un CCRD : Lorsqu'un Contrat
                Collectif de Responsabilité Décennale (CCRD) est souscrit au
                bénéfice de l'assuré, le montant de la garantie est égal au
                montant de la franchise absolue stipulée par ledit contrat
                collectif.
              </Text>
              <Text style={styles.td}>1 000€ (*)</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>
                R.C DECENNALE en tant que sous-traitant en cas de dommages de
                nature décennale
              </Text>
              <Text style={styles.td}>2 000 000€</Text>
              <Text style={styles.td}>1 000€ (*)</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>
                R.C DECENNALE pour travaux de construction non soumis à
                l'obligation d'assurance conformément à l'article L243-1.1
                paragraphe 1 du Code des Assurances
              </Text>
              <Text style={styles.td}>
                500 000€ PAR SINISTRE / 800 000€ PAR ANNÉE D'ASSURANCE
              </Text>
              <Text style={styles.td}>1 000€ (*)</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>
                RC CONNEXES À LA RC DECENNALE
              </Text>
              <Text style={styles.td}>-</Text>
              <Text style={styles.td}>-</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>
                BON FONCTIONNEMENT DES ÉLÉMENTS D'ÉQUIPEMENTS DISSOCIABLES DES
                OUVRAGES SOUMIS À L'ASSURANCE OBLIGATOIRE (Cette garantie est
                maintenue pour une durée de 2 ans à compter de la réception des
                chantiers ouverts durant la période de garantie, telle que
                précisée à l'article 1792-3 du Code Civil.)
              </Text>
              <Text style={styles.td}>
                600 000€ Montant unique pour l'ensemble des garanties BON
                FONCTIONNEMENT, DOMMAGES IMMATERIELS CONSECUTIFS, DOMMAGES AUX
                EXISTANTS et DOMMAGES INTERMEDIAIRES. Dont 100 000 € au titre
                des DOMMAGES INTERMEDIAIRES et DOMMAGES IMMATERIELS CONSECUTIFS
                cumulés
              </Text>
              <Text style={styles.td}>
                1 000€ (*) NOTA : en cas de sinistre engageant la garantie
                principale et une ou des garanties connexes, seule une franchise
                sera appliquée
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>
                DOMMAGES IMMATÉRIELS CONSÉCUTIFS
              </Text>
              <Text style={styles.td}>-</Text>
              <Text style={styles.td}>-</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>
                DOMMAGES AUX EXISTANTS
              </Text>
              <Text style={styles.td}>-</Text>
              <Text style={styles.td}>-</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>
                DOMMAGES MATÉRIELS INTERMÉDIAIRES AFFECTANT UN OUVRAGE SOUMIS À
                L'ASSURANCE OBLIGATOIRE
              </Text>
              <Text style={styles.td}>-</Text>
              <Text style={styles.td}>-</Text>
            </View>
          </View>
          <Text style={styles.small}>
            (*) : Franchise doublée en cas de sous-traitance à une entreprise
            non assurée en Responsabilité Civile Décennale pour ces travaux
          </Text>
        </View>

        {/* Chapitre 3 – Activités souscrites */}
        <View style={styles.section}>
          <Text style={styles.title}>
            CHAPITRE 3 – ACTIVITÉ(S) SOUSCRITE(S) PAR L'ASSURÉ AU TITRE DU
            PRÉSENT CONTRAT :
          </Text>
          <Text style={styles.strong}>ACTIVITÉS GARANTIES</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.th}>
                N° d'activité, selon nomenclature, en annexe
              </Text>
              <Text style={styles.th}>Libellé(s)</Text>
            </View>
            {formData?.activities && formData.activities.length > 0 ? (
              formData.activities.map((activity: any, idx: number) => (
                <View key={idx} style={styles.row}>
                  <Text style={styles.td}>{activity.code || "—"}</Text>
                  <Text style={styles.td}>
                    {tableauTax.find(
                      (tax) => tax.code.toString() === activity.code?.toString()
                    )?.title || "—"}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.row}>
                <Text style={[styles.td, { flex: 2 }]}>
                  Aucune activité déclarée
                </Text>
              </View>
            )}
          </View>
          <Text>
            Le périmètre des activités garanties et leurs exclusions sont
            définis dans le document Annexe 1 « Nomenclature des activités
            souscrites avec Encyclie BAT », réf Encyclie Construction 2022,
            joint au présent contrat.
          </Text>
          <Text style={styles.strong}>
            Seules les activités déclarées dans le tableau, ci-dessus, seront
            garanties. Elles constituent un élément déterminant dans
            l'acceptation des garanties et la conclusion du présent contrat.
          </Text>
          <Text>
            Les activités sous-traitées sont celles garanties par le présent
            contrat.
          </Text>
          <Text style={styles.strong}>
            Les travaux accessoires ou complémentaires, compris, le cas échéant,
            dans la définition des activités, ne doivent, en aucun cas, faire
            l'objet d'un marché de travaux à part entière. A défaut, ces travaux
            seront réputés non garantis.
          </Text>
        </View>

        {/* Chapitre 4 – Clauses spéciales */}
        <View style={styles.section}>
          <Text style={styles.title}>CHAPITRE 4 – CLAUSES SPÉCIALES</Text>
          <Text style={styles.strong}>
            - La garantie s'applique pour des marchés de travaux dont le montant
            n'excède pas 1 000 000 EUR et pour des opérations de construction
            dont le coût total (Tous corps d'état et y compris honoraires)
            n'excède pas 15.000.000 EUR pour les ouvrages soumis à l'obligation
            d'assurance. De même, la garantie s'applique pour des marchés dont
            le montant n'excède pas 350 000 EUR et pour des opérations de
            construction dont le coût total (Tous corps d'état et y compris
            honoraires) n'excède pas 1 000 000 EUR pour les ouvrages non soumis
            à l'obligation d'assurance.
          </Text>
          <Text style={styles.strong}>
            AU DELA DE CES MONTANTS, L'ASSURE DEVRA SOLLICITER UNE EXTENSION DE
            GARANTIE AUPRES DE L'ASSUREUR.
          </Text>
          <Text>
            - Il est précisé que, conformément aux stipulations des présentes
            Conditions particulières et conformément aux déclarations faites par
            le proposant sur le questionnaire préalable d'assurance, seules les
            activités susmentionnées sont garanties par le présent contrat à
            l'exclusion de toutes autres activités même si elles sont
            mentionnées au Kbis ou sur le papier en-tête de l'assuré.
          </Text>
          <Text>
            - Il est également précisé, que si l'assuré souhaite garantir, pour
            son entreprise, d'autres activités que celles prévues au présent
            contrat, ce dernier devra prévenir son intermédiaire afin de les
            faire couvrir par une autre police d'assurance adaptée.
          </Text>
        </View>

        {/* Chapitre 5 – Étendue géographique */}
        <View style={styles.section}>
          <Text style={styles.title}>CHAPITRE 5 – ÉTENDUE GÉOGRAPHIQUE</Text>
          <Text style={styles.strong}>
            Les présentes conditions particulières couvrent les risques situés
            dans les départements, régions et collectivités d'outre mer
            (DROM-COM) suivants uniquement :
          </Text>
          <Text style={styles.listItem}>- Réunion</Text>
          <Text style={styles.listItem}>- Mayotte</Text>
          <Text style={styles.listItem}>- Martinique</Text>
          <Text style={styles.listItem}>- Guadeloupe</Text>
          <Text style={styles.listItem}>- Saint-Martin</Text>
          <Text style={styles.listItem}>- Guyane</Text>
          <Text style={styles.listItem}>- Saint-Barthelémy</Text>
        </View>

        {/* Chapitre 6 – Détails de la prime */}
        <View style={styles.section}>
          <Text style={styles.title}>CHAPITRE 6 – DÉTAILS DE LA PRIME :</Text>
          <Text style={styles.strong}>Primes</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>
                PRIMES année en cours pour la période du {periodeDebut} au{" "}
                {periodeFin}
              </Text>
              <Text style={styles.th}>Montants H.T</Text>
              <Text style={styles.th}>Montants Taxes</Text>
              <Text style={styles.th}>Montant TTC</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>
                Prime RCD provisionnelle hors reprise du passé
              </Text>
              <Text style={styles.td}>{primeRCDHT} €</Text>
              <Text style={styles.td}>{primeRCDTaxes} €</Text>
              <Text style={styles.td}>{primeRCDTTC} €</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.td, { flex: 2 }]}>Prime PJ</Text>
              <Text style={styles.td}>
                {primePJHT !== "0" ? `${primePJHT} €` : "-"}
              </Text>
              <Text style={styles.td}>
                {primePJTaxes !== "0" ? `${primePJTaxes} €` : "-"}
              </Text>
              <Text style={styles.td}>
                {primePJTTC !== "0" ? `${primePJTTC} €` : "-"}
              </Text>
            </View>
          </View>
          <Text style={styles.strong}>
            Prime minimale de souscription : 2 400 €
          </Text>
          <Text style={styles.strong}>Mode de Calcul de la Prime :</Text>
          <Text style={styles.strong}>Prime provisionnelle :</Text>
          <Text>
            Une prime provisionnelle est payable d'avance à la souscription et à
            chaque échéance annuelle. La prime provisionnelle est ajustée
            annuellement, à compter de la réception des derniers éléments
            variables déclarés, tenant compte de l'évolution de ces derniers.
          </Text>
          <Text style={styles.strong}>Prime définitive :</Text>
          <Text>
            La prime définitive pour chaque Période d'Assurance est déterminée,
            à l'expiration de cette période. La prime définitive au titre de la
            période d'assurance est égale au produit de la prime provisionnelle
            par le rapport entre le chiffre d'affaires réellement réalisé par
            l'assuré et le chiffre d'affaires utilisé pour le calcul de la prime
            provisionnelle. Si la prime définitive est supérieure à la prime
            provisionnelle perçue pour la même période, une prime d'ajustement
            égale à la différence est due par l'Assuré. Si la prime définitive
            est inférieure à la prime provisionnelle, cette dernière reste
            acquise aux Assureurs.
          </Text>
          <Text style={styles.strong}>
            Prime provisionnelle au renouvellement :
          </Text>
          <Text>
            La nouvelle prime provisionnelle est égale au produit de : - la
            prime provisionnelle de l'année précédente ajustée des éventuelles
            modifications tarifaires suivant l'article 8.4 ; par - le rapport
            entre le dernier chiffre d'affaires déclaré et celui déclaré l'année
            précédente. Il est à noter que cette prime ne pourra pas être
            inférieure à la prime minimale de souscription.
          </Text>
          <Text style={styles.strong}>Paiement de la prime :</Text>
          <Text>
            La prime est payable d'avance à l'échéance indiquée dans la
            quittance. La première échéance est due à la signature du contrat.
            L'attestation d'assurance sera remise une fois le paiement de la
            première échéance effectué. Si le Souscripteur ne paie pas la
            première prime ou une prime suivante dans les dix (10) jours de son
            échéance, l'Assureur peut poursuivre l'exécution du contrat en
            justice. La loi autorise également l'Assureur à suspendre les
            garanties du contrat trente (30) jours après l'envoi d'une lettre
            recommandée de mise en demeure, voire à résilier le contrat dix (10)
            jours après l'expiration de ce délai de trente (30) jours (article
            L. 113-3 du Code des assurances).
          </Text>
        </View>

        {/* Chapitre 7 – Durée du contrat */}
        <View style={styles.section}>
          <Text style={styles.title}>CHAPITRE 7 – DURÉE DU CONTRAT :</Text>
          <Text style={styles.strong}>À effet du {dateEffet}.</Text>
          <Text style={styles.strong}>
            Contrat à tacite reconduction avec échéance principale le 1er
            janvier de chaque année.
          </Text>
          <Text>
            Pour la garantie de responsabilité décennale, y compris pour les
            ouvrages non soumis à l'obligation d'assurance, le présent contrat
            ne couvre que les travaux portant sur des ouvrages ayant fait
            l'objet d'une déclaration d'ouverture de chantier pendant la période
            de validité du présent contrat.
          </Text>
          <Text>
            Dans le cas où la garantie reprise du passé est accordée, les
            garanties Responsabilité pour dommages de nature Décennale et
            Responsabilité du sous-traitant en cas de dommage de nature
            Décennale sont étendues aux prestations commencées antérieurement à
            la date de prise d'effet du contrat à l'exclusion des faits ou
            évènements dommageables dont l'assuré pouvait avoir connaissance à
            la date d'effet du contrat. Les activités et la période couvertes
            sont celles mentionnées dans la Conditions Particulières.
          </Text>
          <Text>
            Pour les garanties de responsabilité civile du sous-traitant, la
            garantie est déclenchée par le fait dommageable, tel que prévu par
            l'article L124-5 du code des assurances. La garantie déclenchée par
            le fait dommageable couvre l'assuré contre les conséquences
            pécuniaires des sinistres, dès lors que le fait dommageable survient
            entre la prise d'effet initiale de la garantie et sa date de
            résiliation ou d'expiration, quelle que soit la date des autres
            éléments constitutifs du sinistre.
          </Text>
          <Text>
            Pour les autres garanties de responsabilité civile, y compris la
            garantie de responsabilité décennale pour des travaux de
            construction non soumis à l'obligation d'assurance ainsi que pour
            les garanties de Bon Fonctionnement, Dommages matériels
            intermédiaires, Dommages matériels aux Existants et Dommages
            Immatériels Consécutifs, conformément aux dispositions de l'article
            L124-5 du code des assurances, la garantie est déclenchée par la
            réclamation. La garantie déclenchée par la réclamation couvre
            l'assuré contre les conséquences pécuniaires des sinistres, dès lors
            que le fait dommageable est antérieur à la date de résiliation ou
            d'expiration de la garantie, et que la première réclamation est
            adressée à l'assuré ou à son assureur entre la prise d'effet
            initiale de la garantie et l'expiration d'un délai subséquent à sa
            date de résiliation ou d'expiration mentionné par le contrat, quelle
            que soit la date des autres éléments constitutifs des sinistres.
            Toutefois, la garantie ne couvre les sinistres dont le fait
            dommageable a été connu de l'assuré postérieurement à la date de
            résiliation ou d'expiration que si, au moment où l'assuré a eu
            connaissance de ce fait dommageable, cette garantie n'a pas été
            resouscrite ou l'a été sur la base du déclenchement par le fait
            dommageable. L'assureur ne couvre pas l'assuré contre les
            conséquences pécuniaires des sinistres s'il établit que l'assuré
            avait connaissance du fait dommageable à la date de la souscription
            de la garantie. Le délai subséquent est de 10 ans dans le cas
            présent.
          </Text>
          <Text>
            L'Assuré peut résilier le contrat chaque année par lettre
            recommandée adressée à l'Assureur au moins 2 mois avant la date
            d'échéance principale. Ce droit appartient, dans les mêmes
            conditions, à l'Assureur.
          </Text>
        </View>

        {/* Chapitre 8 – Déclaration de sinistres */}
        <View style={styles.section}>
          <Text style={styles.title}>
            CHAPITRE 8 – DÉCLARATION DE SINISTRES :
          </Text>
          <Text>
            Toutes les déclarations de sinistre doivent être envoyées à
            l'adresse suivante :
          </Text>
          <Text style={styles.strong}>« SERVICE SINISTRE ENCYCLIE »</Text>
          <Text>42 RUE NOTRE-DAME DES VICTOIRES</Text>
          <Text>75002 PARIS</Text>
          <Text>
            Ou par mail à l'adresse : contact@encyclie-construction.com
          </Text>
        </View>

        {/* Chapitre 9 – Réclamations */}
        <View style={styles.section}>
          <Text style={styles.title}>CHAPITRE 9 – RÉCLAMATIONS :</Text>
          <Text>
            Toutes les réclamations doivent être adressées au Service Gestion
            des Réclamations d'ENCYCLIE CONSTRUCTION à l'adresse suivante :
          </Text>
          <Text style={styles.strong}>
            « SERVICE RECLAMATIONS ENCYCLIE CONSTRUCTION »
          </Text>
          <Text>42 RUE NOTRE-DAME DES VICTOIRES</Text>
          <Text>75002 PARIS</Text>
          <Text>Ou par mail à : contact@encyclie-construction.com</Text>
          <Text>
            Encyclie s'engage à accuser réception de votre correspondance dans
            un délai de 10 jours ouvrables (sauf si Encyclie vous a déjà apporté
            une réponse au cours de ce délai), et à traiter votre réclamation
            dans un délai maximal de 2 mois à compter de la réception de votre
            courrier. En cas de non-satisfaction sur la réponse apportée, vous
            pouvez vous adresser à Wakam, en écrivant à l'adresse suivante :
          </Text>
          <Text style={styles.strong}>WAKAM</Text>
          <Text>Service Réclamations</Text>
          <Text>120-122 Rue Réaumur</Text>
          <Text>TSA 60235</Text>
          <Text>75083 PARIS Cedex 02</Text>
          <Text>
            Wakam s'engage à accuser réception de votre correspondance dans un
            délai de 10 jours ouvrables (sauf si Wakam vous a déjà apporté une
            réponse au cours de ce délai), et à traiter votre réclamation dans
            un délai maximal de 2 mois à compter de la réception de votre
            courrier.
          </Text>
          <Text>
            Les réclamations portant sur une prestation d'assistance sont à
            adresser au prestataire d'assistance dont les coordonnées sont
            indiquées sur vos Conditions Particulières. Il vous répondra
            directement dans les délais cités ci-dessus et vous précisera, en
            cas de refus de faire droit en totalité ou partiellement à votre
            réclamation, les voies de recours possibles, notamment l'existence
            et les coordonnées du (des) médiateur(s) compétent(s), lorsqu'il(s)
            existe(nt).
          </Text>
          <Text>
            Après épuisement des procédures internes de réclamations propres à
            Wakam, vous pouvez saisir par écrit le Médiateur de France Assureurs
            :
          </Text>
          <Text>
            Soit directement sur le site du médiateur de l'assurance :
          </Text>
          <Text>http://www.mediation-assurance.org/Saisir+le+mediateur</Text>
          <Text>Soit par courrier à l'adresse suivante :</Text>
          <Text>La Médiation de l'Assurance</Text>
          <Text>TSA 50 110</Text>
          <Text>75441 Paris cedex 09</Text>
          <Text>
            Le Médiateur est une personnalité extérieure à Wakam qui exerce sa
            mission en toute indépendance. Ce recours est gratuit. Il rend un
            avis motivé dans les 3 mois qui suivent sa saisine.
          </Text>
          <Text>
            La procédure de recours au médiateur et la « Charte de la médiation
            » de France Assureurs sont librement consultables sur le site :
            www.franceassureurs.fr
          </Text>
          <Text>
            Pour l'ensemble des offres « dématérialisées » vous avez également
            la possibilité d'utiliser la plateforme de Résolutions des Litiges
            en Ligne de la Commission Européenne au lien suivant :
            http://ec.europa.eu/consumers/odr/
          </Text>
        </View>

        {/* TRAITEMENT DE DONNÉES PERSONNELLES */}
        <View style={styles.section}>
          <Text style={styles.title}>TRAITEMENT DE DONNÉES PERSONNELLES</Text>
          <Text style={styles.strong}>Informatique et Libertés :</Text>
          <Text>
            Les informations contenues dans ce document sont destinées aux
            propres fichiers de la Société et éventuellement à ceux d'organismes
            professionnels de l'assurance. Vous avez la possibilité de demander
            la communication des renseignements vous concernant, le cas échéant,
            de les faire rectifier dans les conditions prévues par la loi 78-17
            du 6 janvier 1978 relative à l'informatique, aux fichiers et aux
            libertés.
          </Text>
          <Text style={styles.strong}>Données personnelles :</Text>
          <Text>
            Le souscripteur certifie que les informations données (recueillies
            dans la demande de proposition) pour l'entreprise demandeuse de la
            proposition commerciale présente, qui servent d'élément essentiel à
            la constitution et la rédaction du contrat sont honnêtes, exactes et
            complètes.
          </Text>
          <Text style={styles.listItem}>
            - Toute(s) réticence(s) ou fausse(s) déclaration(s)
            intentionnelle(s) de votre part peut entrainer la nullité de votre
            contrat (art.L.113-8 du code des assurances)
          </Text>
          <Text style={styles.listItem}>
            - Toute(s) omission(s) ou déclaration(s) inexacte(s) peut vous
            exposer à une révision à la hausse de votre cotisation ou à une
            résiliation du contrat, entrainer une réduction d'indemnités en cas
            de sinistre (art L.113-9 du code des assurances).
          </Text>
          <Text>
            Vous êtes informé que les données personnelles figurant dans le
            présent document dans le cadre de l'évaluation du risque et de
            l'établissement de votre contrat sont collectées par l'intermédiaire
            d'ENCYCLIE CONSTRUCTION, pour le compte de Wakam agissant en tant
            que responsable de traitement.
          </Text>
          <Text>
            Pour toute question, renseignement, ou pour exercer vos droits
            relatifs à vos données personnelles, veuillez contacter notre
            Délégué à la Protection des Données : à l'adresse suivante : Délégué
            à la Protection des Données, Wakam 120-122 rue Réaumur 75002 Paris -
            France
          </Text>
          <Text>ou par courriel : dpo@wakam.fr</Text>
          <Text>
            Vous pouvez également consulter le paragraphe sur les données
            personnelles des Conditions Générales pour avoir toutes les
            informations relatives aux traitements de vos données personnelles
            et à l'exercice de vos droits.
          </Text>
        </View>

        {/* AUTRES DISPOSITIONS */}
        <View style={styles.section}>
          <Text style={styles.title}>AUTRES DISPOSITIONS</Text>
          <Text style={styles.strong}>Sanctions :</Text>
          <Text>
            Toutes aggravations de risques, réticences ou fausses déclarations,
            omissions ou inexactitudes dans vos déclarations peuvent entraîner
            les sanctions prévues aux articles L. 113-4 (dénonciation du contrat
            ou modification du montant de prime), L. 113-8 (nullité du contrat)
            et L. 113-9 (réduction des indemnités ou résiliation du contrat) du
            Code des Assurances.
          </Text>
          <Text style={styles.strong}>Exclusion :</Text>
          <Text style={styles.strong}>
            Sont exclus des garanties du présent contrat tous les sinistres
            ayant pour origine des faits ou circonstances connus du souscripteur
            antérieurement à la date d'effet du contrat.
          </Text>
          <Text style={styles.strong}>Renvois, ajouts et modifications :</Text>
          <Text>
            Sont nuls, tous renvois, adjonctions ou modifications matérielles
            non revêtues du visa de l'Assureur ou de son représentant autorisé.
          </Text>
          <Text style={styles.strong}>
            Déclaration annuelle des éléments variables aux Assureurs :
          </Text>
          <Text>
            Annuellement, l'Assuré fournit à la Compagnie la déclaration de son
            chiffre d'affaires annuel et de son effectif, selon les modalités
            prévues dans la circulaire annuelle de déclaration des éléments
            variables et tel que mentionné aux Conditions Générales du présent
            contrat. Il est convenu que la déclaration de ces éléments variables
            doit correspondre à la dernière déclaration réalisée par l'Assuré
            auprès de l'administration fiscale.
          </Text>
          <Text>
            En cas de résiliation, l'Assuré déclare les éléments variables pour
            établissement de la prime définitive de la dernière Période
            d'assurance dans les deux (2) mois suivant la demande formulée par
            l'Assureur.
          </Text>
          <Text style={styles.strong}>Sous-traitance :</Text>
          <Text>
            Lorsque vous sous-traitez des travaux, vous êtes dans l'obligation
            de collecter les attestations d'assurance de vos sous-traitants, et
            de les joindre à votre circulaire annuelle de déclaration des
            éléments variables.
          </Text>
        </View>

        {/* PIÈCES CONSTITUTIVES */}
        <View style={styles.section}>
          <Text style={styles.title}>
            LE PRESENT CONTRAT EST CONSTITUÉ PAR LES DOCUMENTS SUIVANTS QUI
            PREVALENT DANS L'ORDRE CI-APRES :
          </Text>
          <Text>- Les présentes Conditions Particulières,</Text>
          <Text>
            - L'ANNEXE 1 « Nomenclature des activités souscrites avec Encyclie
            BAT »
          </Text>
          <Text>- Les Conditions Générales ENCYCLIE BAT-CG_WAKAM_082022</Text>
          <Text style={styles.strong}>
            LE SOUSCRIPTEUR DECLARE AVOIR PRIS CONNAISSANCE DU DOCUMENT
            D'INFORMATION SUR LE PRODUIT D'ASSURANCE PREALABLEMENT A LA
            SOUSCRIPTION DU CONTRAT.
          </Text>
          <Text style={styles.strong}>
            LE SOUSCRIPTEUR DECLARE AVOIR RECU, PRIS CONNAISSANCE ET ACCEPTÉ LES
            TERMES DE L'ENSEMBLE DES DOCUMENTS CONSTITUANT LE PRESENT CONTRAT.
          </Text>
          <Text>Fait à Paris, en deux exemplaires le {dateEdition}</Text>
          <Text>ENCYCLIE CONSTRUCTION, LE SOUSCRIPTEUR</Text>
          <Text>Par délégation de l'Assureur :</Text>
        </View>

        {/* ANNEXE 1 – Nomenclature complète */}
        <View style={styles.section}>
          <Text style={styles.title}>
            ANNEXE 1 – Nomenclature des activités souscrites avec Encyclie BAT
          </Text>
          <Text style={styles.small}>
            Les activités ne peuvent être assurées au-delà des conditions
            ci-dessous :
          </Text>

          <Text style={[styles.strong, { marginTop: 8 }]}>
            PREPARATION ET AMENAGEMENT DU SITE
          </Text>
          <Text style={styles.strong}>1 - VOIRIES ET RESEAUX DIVERS</Text>
          <Text style={styles.small}>
            Réalisation de réseaux de canalisations d'eau, de réseaux enterrés
            ou aériens de distribution électrique ou VDI (Voie Données Images),
            d'éclairage et leurs supports, de voiries, de réseaux
            d'assainissement collectif à l'exclusion des stations d'épuration,
            de systèmes d'assainissements autonomes, de parcs de stationnement
            non couverts, de formes d'ouvrages sportifs non couverts. Cette
            activité comprend : La réalisation de zones circulables privatives
            par tous matériaux sauf revêtements à base de résine avec ou sans
            incorporation de granulats, Les terrasses maçonnées, plages et
            margelles de piscines privatives, avec revêtement de surface en
            matériaux durs ou bois, La réalisation de poteaux et clôtures
            maçonnées ou non, La réalisation de murs (n'ayant pas de fonction de
            soutènement) par enrochement non lié ou par gabions avec remplissage
            par pierres, pour une hauteur n'excédant pas 2 mètres,
            L'installation en extérieur de récupérateurs d'eau de pluie sans
            raccordement au réseau sanitaire. Le déneigement Les travaux
            accessoires ou complémentaires de terrasses et de fouilles
          </Text>
          <Text style={styles.small}>
            Sont exclus : La réalisation de réseaux publics d'adduction ou de
            distribution d'eaux, de distribution de gaz et de fluides,
            d'électricité Les travaux de pavage de voies publiques La
            réalisation et l'entretien de routes, pistes d'aéroport. La mise en
            œuvre d'équipements routiers et notamment marquages, signalisation,
            équipements de sécurité. Les travaux ferroviaires Les revêtements de
            terrains sportifs y compris complexes pelouses / support Le drainage
            agricole et irrigation La réalisation d'ouvrages de soutènement
          </Text>

          <Text style={[styles.strong, { marginTop: 8 }]}>
            STRUCTURES ET GROS ŒUVRE
          </Text>
          <Text style={styles.strong}>
            2 - MAÇONNERIE ET BETON ARME SAUF PRECONTRAINT IN SITU
          </Text>
          <Text style={styles.small}>
            Réalisation de maçonnerie en béton armé préfabriqué ou non, en béton
            précontraint préfabriqué (hors précontraint in situ), en blocs
            agglomérés de mortier ou de béton cellulaire, en pierre naturelle ou
            brique, ceci tant en infrastructure qu'en superstructure, par toutes
            les techniques de maçonneries de coulage, hourdage (hors revêtement
            mural agrafé, attaché ou collé). Limité aux ouvrages et aux travaux
            : Comportant des murs porteurs en maçonnerie jusqu'à 6 niveaux, dont
            deux au maximum en sous-sol, Comportant des ossatures porteuses en
            béton armé ne présentant pas de difficultés importantes du point de
            vue des études et de l'exécution, dans la limite d'ouvrages ne
            dépassant pas 6 niveaux, dont deux au maximum en sous-sol,
            D'entretien et de transformation des constructions et de leurs
            accessoires, limités à 6 niveaux sur deux niveaux maximum de
            sous-sol au maximum y compris les ouvertures limitées à 5 mètres de
            largeur. De reprises en sous-œuvre d'infrastructures sur un niveau
            de sous-sol, à l'exclusion des reprises en sous-œuvre par pieux,
            micro-pieux, parois moulées et des créations de niveaux de sous-sol
            supplémentaires
          </Text>
          <Text style={styles.small}>
            Cette activité comprend les travaux de : Fondations superficielles
            (semelles filantes, isolées, radiers et puits courts) Enduits
            intérieurs ou extérieurs projetés à la machine ou réalisés
            manuellement, à base d'un liant hydraulique, adjuvanté ou non,
            Ravalement en maçonnerie Dallage à l'exclusion du dallage industriel
            Chapes sauf chapes fluides et sols coulés à base de résine, Travaux
            de pavage privatifs
          </Text>
          <Text style={styles.small}>
            Cette activité comprend les travaux complémentaires et accessoires
            de : Terrassement et de démolition, sans utilisation d'explosifs,
            préalables à l'exécution de votre marché de travaux, Drainage et
            canalisations enterrées, Complément d'étanchéité des murs ou parois
            enterrés, dans la limite de 100 m2 par chantier, Imperméabilisation
            de cuvelage de locaux enterrés en complément de son propre ouvrage
            de maçonnerie, Assainissement autonome filière traditionnelle ainsi
            que leurs canalisations, Assainissement collectif, ainsi que leurs
            canalisations, à l'exclusion des stations d'épuration, Pose de
            matériaux contribuant à l'isolation intérieure, Pose de renforts
            bois ou métal nécessités par l'ouverture de baies et les reprises en
            sous-œuvre Pose d'huisseries à sceller, Pose de chevrons et pannes
            sablières ainsi que des autres éléments simples de charpente, ne
            comportant ni entaille, ni assemblage, et scellés directement à la
            maçonnerie, et à l'exclusion de toute charpente préfabriquée
            Plâtrerie y compris menuiseries intégrées aux cloisons, Revêtement
            de surfaces en carrelage ou en tout autre produit en matériaux durs,
            naturels ou artificiels (hors agrafages, attaches), Pose de
            résilient acoustique ou d'isolation sous chape ou formes flottantes,
            Etanchéité sous carrelage hors étanchéité de plancher intermédiaire
            et revêtements en matériaux durs à base minérale non immergés pour
            une surface maximum autorisée de 100 m2 par chantier, Protection par
            imperméabilisation des supports de carrelage, de faïence et de
            revêtements en matériaux durs à base minérale, Préparation des
            supports par application d'enduits de lissage ou de réagréage d'une
            épaisseur n'excédant pas 10mm, Réalisation d'enduits de sol de
            dressage autre que sols coulés à base de résine, d'une épaisseur
            n'excédant pas 30mm.
          </Text>
          <Text style={styles.small}>
            Sont exclus : La réalisation de fondations semi-profondes et
            profondes La réalisation de parois de soutènement structurellement
            autonomes soutenant les terres sur une hauteur supérieure à 2,5
            mètres La construction, réparation et entretien d'âtres et foyers
            Les ouvrages étanches en béton armé ou précontraint, enterrés,
            semi-enterrés ou en élévation La construction de piscines Le dallage
            à usage industriel La restauration pierre de taille, ou maçonnerie
            des monuments historiques La construction de planchers translucides
            La réalisation d'ouvrages mouillés
          </Text>

          <Text style={styles.strong}>3 - CHARPENTE ET STRUCTURE EN BOIS</Text>
          <Text style={styles.small}>
            Réalisation de charpentes, structures et ossatures à base de bois à
            l'exclusion des façades-rideaux. Limitation aux ouvrages et aux
            travaux : De charpente traditionnelle à 2 pans sans raccord,
            inférieurs à 12 mètres de portée De pose de charpente en bois
            lamellé-collé inférieures à 12 mètres de portée De fourniture et
            pose d'ouvrages de charpente et de structures industrialisées en
            bois jusqu'à 12 mètres de portée. De fourniture et pose, à partir
            d'éléments fabriqués par des tiers, des structures en ossature bois
            pour des bâtiments comportant un rez-de-chaussée + un étage au
            maximum, sous réserve que la construction ne soit pas réalisée avec
            la qualité de constructeur de maisons individuelles, selon les
            termes de la loi n°90-1129 du 19 février 1990.
          </Text>
          <Text style={styles.small}>
            Cette activité comprend les travaux complémentaires et accessoires
            de : Couverture par bac acier ou aluminium, plaques fibres-ciment,
            plaques bituminées ou plastiques, Bardage, châssis divers, Supports
            de couverture ou d'étanchéité, Plafonds, faux plafonds, cloisons en
            bois et autres matériaux, Planchers et parquets, Isolation thermique
            et acoustique liées à l'ossature ou à la charpente, Mise en œuvre de
            matériaux ou de tous éléments métalliques ou béton concourant à
            l'édification, au renforcement ou à la Stabilité des charpentes et
            escaliers y compris garde-corps, Application de produits de
            protection des bois et traitement préventif des bois, réalisés
            exclusivement en complément d'un marché de travaux de charpente ou
            structure en bois.
          </Text>
          <Text style={styles.small}>
            Sont exclus : La construction d'ouvrage réalisé avec la qualité de
            Constructeur de Maisons Individuelles, selon les termes de la loi
            n°90-1129 du 19 février 1990 est exclue de cette activité.
            Traitement curatif des bois.
          </Text>

          <Text style={styles.strong}>
            4 - CHARPENTE ET STRUCTURE METALLIQUE
          </Text>
          <Text style={styles.small}>
            Réalisation de charpentes, structures et ossatures métalliques à
            l'exclusion des façades-rideaux. Cette activité comprend notamment
            la construction de structures pour : Des hangars agricoles, Des
            bâtiments pour des activités industrielles, tertiaires, commerciales
            comprenant poteaux, fermes, pans de fers et éléments de combles
            Poutres et solives pour planchers Passerelles légères à travée
            unique et plates-formes annexes
          </Text>
          <Text style={styles.small}>
            Limité aux ouvrages et aux travaux : Des ouvrages de bâtiments ou
            structures similaires à caractéristiques courantes dont la portée
            est inférieure à 20 mètres et la hauteur 10 mètres entre le sol et
            le faîtage Des constructions industrialisées ne dépassant pas 2
            niveaux
          </Text>
          <Text style={styles.small}>
            Cette activité comprend les travaux accessoires ou complémentaires
            de : Couverture, châssis divers, lorsque ceux-ci sont directement
            fixés à l'ossature, Supports de couverture ou d'étanchéité,
            Protection et traitement contre la corrosion, Travaux en sous-œuvre
            par structure métallique, Isolation thermique et acoustique liées à
            l'ossature ou à la charpente. Peinture intumescente
          </Text>
          <Text style={styles.small}>
            Sont exclus les ouvrages : Organes de stockages verticaux (silos) ou
            horizontaux pour produits granulaires ou pulvérulents Pylônes et
            tours de transmission Ossature d'appareil de levage, de manutention,
            de transport Ponts et passerelles, mobiles ou non, suspendus ou non
            Organes de retenue d'eau (vannes, écluses, …) Ponts roulants et tous
            autres ouvrages de charpente métallique mobile
          </Text>

          <Text style={[styles.strong, { marginTop: 8 }]}>CLOS ET COUVERT</Text>
          <Text style={styles.strong}>5 - COUVERTURE</Text>
          <Text style={styles.small}>
            Réalisation en tous matériaux (hors structures textiles et hors
            structures gonflées), y compris par bardeau bitumé, de couverture,
            vêtage, vêture. Cette activité comprend les travaux de : Zinguerie
            et éléments accessoires en tous matériaux, Pose de fenêtres de toit
            y compris exutoires de fumées, Réalisation sans limitation de
            surface par chantier, de couvertures au-delà de 900 mètres
            d'altitude, par double toiture ventilée ou toiture chaude type
            «sarking», avec étanchéité complémentaire en sous-toiture sur
            support continu. Réalisation d'isolation et d'écran sous toiture,
            Ravalement et réfection des souches hors combles, Installation de
            paratonnerres.
          </Text>
          <Text style={styles.small}>
            Cette activité comprend les travaux accessoires et complémentaire de
            : Etanchéité de toiture pour une surface maximum limitée à 150 m2
            par chantier par mise en œuvre de matériaux bitumineux ou de
            synthèse sur des supports horizontaux ou inclinés, y compris la pose
            du support d'étanchéité et dans la limite éventuelle fixée au
            procédé, la mise en œuvre de matériaux d'isolation et inclut tous
            travaux préparant l'application ou assurant la protection du
            revêtement étanche, ainsi que ceux complétant l'étanchéité des
            ouvrages, Réalisation de bardages verticaux, Pose d'éléments de
            charpente non assemblée.
          </Text>
          <Text style={styles.small}>
            Sont exclus : L'isolation des vêtages La pose de capteurs solaires
            intégrés en toiture La pose de panneaux photovoltaïque.
          </Text>

          <Text style={styles.strong}>
            6 - MENUISERIES EXTERIEURES BOIS ET PVC
          </Text>
          <Text style={styles.small}>
            Réalisation de menuiseries extérieures bois et PVC, y compris leur
            revêtement de protection, à l'exclusion des façades rideaux. Cette
            activité comprend les travaux de : Mise en œuvre des éléments de
            remplissage en produits verriers ou de synthèse pour un usage
            similaire, notamment polycarbonates, polyméthacrylates, etc.
            Calfeutrement sur chantier des joints de menuiserie, Travaux
            d'habillage et des liaisons intérieures - extérieures Mise en œuvre
            des fermetures et protections solaires intégrées ou non, Pose de
            garde-corps, rampes, balustrades et mains courantes, Pose de
            fenêtres de toit y compris exutoires de fumées, Réalisation de
            verrières de surface inférieure à 20 m2 et d'une portée maximum
            n'excédant pas 6 m. Réalisation de vérandas de surface au sol
            inférieure à 30 m2 et d'une portée maximum n'excédant pas 6 m, à
            l'exclusion des fondations, des structures maçonnées et des capteurs
            solaires.
          </Text>
          <Text style={styles.small}>
            Les travaux accessoires et complémentaires : Vitrerie et de
            miroiterie Commandes et branchements électriques éventuels, Mise en
            œuvre des matériaux ou produits contribuant, à l'isolation thermique
            et/ou acoustique, et à la sécurité incendie, Application de produits
            de protection des bois et traitement préventif des bois, réalisés
            uniquement en complément d'un marché de travaux de menuiseries
            extérieures, et à l'exclusion des traitements curatifs des bois.
          </Text>

          <Text style={styles.strong}>
            7 - MENUISERIES EXTERIEURES METALLIQUES
          </Text>
          <Text style={styles.small}>
            Réalisation de menuiseries extérieures métalliques, y compris leur
            revêtement de protection, à l'exclusion des façades rideaux. Cette
            activité comprend les travaux de : Mise en œuvre des éléments de
            remplissage en produits verriers ou de synthèse pour un usage
            similaire, notamment polycarbonates, polyméthacrylates, etc.
            Calfeutrement sur chantier des joints de menuiserie, Travaux
            d'habillage et des liaisons intérieures - extérieures Mise en œuvre
            des fermetures et protections solaires intégrées ou non, Pose de
            garde-corps, rampes, balustrades et mains courantes, Pose de
            fenêtres de toit y compris exutoires de fumées, Réalisation de
            verrières de surface inférieure à 20 m2 et d'une portée maximum
            n'excédant pas 6 m. Réalisation de vérandas de surface au sol
            inférieure à 30 m2 et d'une portée maximum n'excédant pas 6 m, à
            l'exclusion des fondations, des structures maçonnées et des capteurs
            solaires.
          </Text>
          <Text style={styles.small}>
            Les travaux accessoires et complémentaires : Vitrerie et de
            miroiterie Commandes et branchements électriques éventuels, Mise en
            œuvre des matériaux ou produits contribuant, à l'isolation thermique
            et/ou acoustique, et à la sécurité incendie, Application de produits
            de protection des bois et traitement préventif des bois, réalisés
            uniquement en complément d'un marché de travaux de menuiseries
            extérieures, et à l'exclusion des traitements curatifs des bois.
          </Text>

          <Text style={styles.strong}>8 - BARDAGES DE FAÇADE</Text>
          <Text style={styles.small}>
            Entreprise qui assure le calepinage et la pose des éléments façonnés
            et des fixations, par bardage simple peau, ou bardage double peau
            avec incorporation d'isolant, à l'exclusion des façades rideaux.
            L'activité se limite à des bardages : De 10 mètres de hauteur
            maximum, Verticaux, Sur bâtiments de forme simple type
            parallélépipède Avec moins de 5 % en surface de parties vitrées.
          </Text>
          <Text style={styles.small}>
            Sont exclus : Les panneaux sandwichs et des bardages spécifiques
            comme ceux dits à cassettes et les polycarbonates, polyméthacrylates
            ou autres verres synthétiques
          </Text>

          <Text style={[styles.strong, { marginTop: 8 }]}>
            DIVISION ET AMENAGEMENTS
          </Text>
          <Text style={styles.strong}>9 - MENUISERIES INTÉRIEURES</Text>
          <Text style={styles.small}>
            Réalisation de tous travaux de menuiserie intérieure, y compris leur
            revêtement de protection, quel que soit le matériau utilisé, pour :
            Les portes, murs, plafonds, faux plafonds, cloisons, planchers y
            compris surélevés, en bois ou plaques de plâtre, Les parquets à
            l'exclusion des sols sportifs, Les revêtements de sols et murs à
            base de bois, Les escaliers et garde-corps, Les stands, expositions,
            fêtes, agencements et mobiliers notamment plans de travail. Les
            cloisons mobiles, amovibles ou démontables
          </Text>
          <Text style={styles.small}>
            Cette activité comprend : La mise en œuvre des éléments de
            remplissage en produits verriers ou de synthèse pour un usage
            similaire, notamment polycarbonates, polyméthacrylates, etc… La pose
            de vitrerie et de miroiterie, La pose de plaques de plâtre ainsi que
            la réalisation des bandes joints, La mise en œuvre des matériaux ou
            produits contribuant à l'isolation thermique et/ou acoustique, à
            l'étanchéité à l'air et à la sécurité incendie, Le traitement
            préventif des bois réalisé exclusivement en complément d'un marché
            de travaux de menuiseries intérieures.
          </Text>
          <Text style={styles.small}>
            Sont exclus : Le traitement curatif du bois Parquets d'une surface
            supérieure à 500 m2 d'un seul tenant Parquets pour des locaux
            recevant du public et/ou salle de sports Parquets de tous types
            nécessitant une fabrication à dimensions spéciales, dont les
            planchers de scènes, les parquets en pavés de bois debout.
            Restauration de menuiseries des monuments historiques. Agencement de
            laboratoires, salles blanches, salles grises, salles propres
            Traitement acoustique de salles, studios d'enregistrements
          </Text>

          <Text style={styles.strong}>
            10 - PLÂTRERIE- STAFF - STUC - GYPSERIE
          </Text>
          <Text style={styles.small}>
            Réalisation en intérieur de cloisonnements, contre-cloisons,
            doublages, plafonds en plâtre, en matériaux à base de plâtre, en
            éléments de terre cuite, ou en plaques à base de ciment. Cette
            activité comprend les travaux accessoires et complémentaires :
            Faux-plafonds démontables ou fixes tous matériaux, Matériaux ou
            produits, en intérieur, contribuant à l'isolation thermique et/ou
            acoustique, à l'étanchéité à l'air et à la sécurité incendie,
            Bandes-joints, Menuiseries intégrées aux cloisons, Plafonds
            suspendus en extérieur avec plaques de plâtre spécifique en sous
            face de volumes couverts.
          </Text>
          <Text style={styles.small}>
            Sont exclus : Restauration plâtres, chaux, staff, stuc des monuments
            historiques.
          </Text>

          <Text style={styles.strong}>11 - SERRURERIE – METALLERIE</Text>
          <Text style={styles.small}>
            Réalisation de serrureries, ferronnerie et métallerie, à l'exclusion
            des charpentes métalliques. Cette activité comprend la fabrication
            et/ou l'installation : De portes et portails et le raccordement des
            alimentations électriques et automatismes nécessaires au
            fonctionnement de ces équipements, D'escaliers métalliques y compris
            avec incorporation de marches tous matériaux, De garde-corps,
            rampes, balustrades et mains courantes, De protections métalliques
            fixes ou ouvrantes contre le vol, De verrières de surface inférieure
            à 20 m2 et d'une portée maximum n'excédant pas 6 m. De vérandas de
            surface au sol inférieure à 30 m2 et d'une portée maximum n'excédant
            pas 6 m, à l'exclusion des fondations, des structures maçonnées et
            des capteurs solaires De brises soleil métalliques, de faux
            planchers ou planchers techniques, D'ouvrages de ferronnerie,
          </Text>
          <Text style={styles.small}>
            Cette activité comprend les travaux accessoires et complémentaires :
            D'application de protection contre les risques de corrosion, De mise
            en œuvre des éléments de remplissage en produits verriers ou de
            synthèse pour un usage similaire, notamment polycarbonates,
            polyméthacrylates De mise en œuvre des matériaux ou produits
            contribuant à l'isolation thermique, acoustique et à la sécurité
            incendie.
          </Text>
          <Text style={styles.small}>
            Sont exclus : Les fourniture et mise en œuvre d'ouvrages de
            métallerie résistant au feu La ferronnerie d'art
          </Text>

          <Text style={styles.strong}>12 - VITRERIE - MIROITERIE</Text>
          <Text style={styles.small}>
            Réalisation de tous travaux à partir de produits verriers ou de
            synthèse pour un usage similaire, notamment polycarbonates,
            polyméthacrylates, etc., à l'exclusion des façades-rideaux. Cette
            activité comprend : L'encadrement de ces produits et leurs joints
            d'étanchéité, La pose de films solaires et de protection des
            vitrages. Remplacement de casse dans vitrine, fenêtre ou garde-corps
            existants, dans la limite de 150 kg par volume verrier, Pose de
            miroirs, étagères et autres agencements intérieurs en produits
            verriers, Pose de vitrines dans la limite de 150 kg par volume
            verrier.
          </Text>
          <Text style={styles.small}>
            Sont compris les travaux ou installations accessoires : De
            remplacement de freins de portes, serrures, paumelles, etc., De pose
            de portes et fenêtres.
          </Text>

          <Text style={styles.strong}>13 - PEINTURES</Text>
          <Text style={styles.small}>
            Réalisation de : Peintures en feuil mince, semi épais ou épais,
            vernis ou lasures, à vocation décorative, De pose de revêtements
            souples, textiles, plastiques ou assimilés sur murs ou plafonds.
            Cette activité comprend les travaux complémentaires et accessoires
            de : Ravalement par nettoyage haute pression, Préparation des
            supports par décapage mécanique, chimique ou thermique, Mise en
            œuvre en intérieur d'éléments d'habillage et/ou décoratifs en bois,
            staff, stuc, matériaux de synthèse ou métalliques, Pose de
            menuiseries intégrées aux cloisons, Pose de placards et rayonnages
            sans fabrication, Pose de revêtements en faïence, Mise en œuvre
            d'enduits décoratifs sur murs, plan de travail ou aménagements
            mobiliers. Tous travaux de tapisserie, de garnissage et de gainerie.
          </Text>
          <Text style={styles.small}>
            Sont exclus : Les travaux de protection et de réfection des façades
            par revêtement d'imperméabilisation et systèmes d'étanchéité à base
            de polymères. Les travaux sur sols sportif, sols industriels,
            parking (sauf marquage au sol)
          </Text>

          <Text style={styles.strong}>
            14 - REVÊTEMENT DE SURFACES EN MATÉRIAUX SOUPLES ET PARQUETS
          </Text>
          <Text style={styles.small}>
            Réalisation de : Parquets collés ou flottants, Pose de revêtements
            souples, en tout matériau plastique, textile, caoutchouc et produits
            similaires ou d'origine végétale, notamment en bois (feuilles de
            placage sur kraft ou sur textile, placages collés ou contreplaqués
            minces collés) ou tout autre revêtement souple relevant des mêmes
            techniques de mise en œuvre. Cette activité comprend : La
            préparation des supports par ragréage ou lissage d'une épaisseur
            n'excédant pas 10 mm, La réalisation de plafonds tendus à chaud.
          </Text>
          <Text style={styles.small}>
            Sont exclus : Sols sportifs coulés ou non Sols coulés à base de
            résine de synthèse Revêtements résilients « cuisine collective »
            Revêtements spéciaux, dont notamment les sols conducteurs, anti
            usures, anti rayon X
          </Text>

          <Text style={styles.strong}>
            15 - REVÊTEMENT DE SURFACES EN MATÉRIAUX DURS
          </Text>
          <Text style={styles.small}>
            Réalisation de revêtement de surface, hors façade extérieure, en
            matériaux durs : En carrelage ou en tout autre produit en matériaux
            durs, naturels ou artificiels (hors agrafages, attaches), Chapes, à
            l'exclusion des chapes fluides et sols coulés à base de résine.
            Cette activité comprend les travaux de : Pose de résilient
            acoustique ou isolation sous chape ou formes flottantes, Etanchéité
            sous carrelage hors étanchéité de plancher intermédiaire ou tout
            autre produit en matériaux durs, non immergés, pour une surface
            maximum de 100 m2 par chantier, Protection par imperméabilisation
            des supports intérieurs de carrelage et faïence, Préparation des
            supports par application d'enduits de lissage ou de ragréage d'une
            épaisseur n'excédant pas 10 mm, Réalisation d'enduits de sol de
            dressage autres que sols coulés à base de résine, d'une épaisseur
            n'excédant pas 30 mm.
          </Text>
          <Text style={styles.small}>
            Sont exclus : Revêtements de sols coulés à base de résine de
            synthèse Revêtements résilients « cuisine collective » Revêtements
            spéciaux de sols coulés à base de résine de synthèse pour locaux à
            risques identifiés Revêtements de sols sportifs « systèmes combinés
            » Mosaïques décoratives Revêtements spéciaux anticorrosion des
            parois et des sols Revêtements muraux attachés
          </Text>

          <Text style={styles.strong}>
            16 - ISOLATION THERMIQUE – ACOUSTIQUE
          </Text>
          <Text style={styles.small}>
            Réalisation de l'isolation thermique et / ou acoustique intérieure
            des murs, parois, sols, plafonds et toitures de tous ouvrages. Cette
            activité comprend : La mise en œuvre de matériaux contribuant à
            l'étanchéité à l'air des locaux, La mise en œuvre en intérieur de
            matériaux contribuant à la sécurité passive contre l'incendie, Le
            calorifugeage des circuits, tuyauteries et appareils.
          </Text>
          <Text style={styles.small}>
            Sont exclus : Isolation anti vibratile Isolation frigorifique de
            toute nature Isolation thermique ou acoustique intérieure par
            insufflation ou projection Planchers surélevés
          </Text>

          <Text style={[styles.strong, { marginTop: 8 }]}>LOTS TECHNIQUES</Text>
          <Text style={styles.strong}>
            17 - PLOMBERIE - INSTALLATIONS SANITAIRES
          </Text>
          <Text style={styles.small}>
            Réalisation d'installations sanitaires, de réseaux sanitaires d'eau
            chaude ou froide (distribution et évacuation), de réseaux de fluide
            ou de gaz, hors techniques de géothermie, airothermie et thermique
            solaire. Cette activité comprend les travaux accessoires et
            complémentaires : Platelage, réalisation de socle et support
            d'appareils et équipements, Tranchées, trous de passage, saignées et
            raccords, Calorifugeage, isolation thermique et acoustique
            intérieurs, Raccordement électrique du matériel, Réalisation de
            gouttières, descentes d'eaux pluviales, noues, chéneaux et de
            solins, Installation de colonnes sèches, Installation des systèmes
            d'évacuation pour ordures ménagères. Le raccordement de
            récupérateurs d'eau de pluie enterrés ou non, réservés à un usage
            privé et externe.
          </Text>
          <Text style={styles.small}>
            Sont exclus : Installations de systèmes de distribution de fluides
            médicaux, ou spéciaux Installations de réseaux de sprinklers et de
            Robinets Incendie Armés (RIA) Réalisation de réseaux sur le domaine
            public Pose de capteurs solaires thermiques intégrés Travaux de
            géothermie
          </Text>

          <Text style={styles.strong}>
            18 - INSTALLATIONS THERMIQUES DE GÉNIE CLIMATIQUE
          </Text>
          <Text style={styles.small}>
            Réalisation d'installations de chauffage (production, distribution,
            évacuation pour chaudières tous combustibles et Pompes à chaleur) et
            de refroidissement, hors techniques de géothermie et photovoltaïque.
            Cette activité comprend les travaux : D'installations sanitaires, de
            réseaux d'eau chaude ou froide sanitaire (production, distribution,
            évacuation), de réseaux de fluide ou de gaz, D'installation de
            ventilation mécanique contrôlée (VMC), De pose de capteurs solaires
            thermiques pour l'eau chaude sanitaire et/ou le chauffage d'une
            surface maximum limité à 30 m2 par chantier.
          </Text>
          <Text style={styles.small}>
            Cette activité comprend les travaux accessoires et complémentaires :
            Platelage, réalisation de socle et support d'appareils et
            équipements, Tranchées, trous de passage, saignées et raccords,
            Calorifugeage, isolation thermique et acoustique intérieurs,
            Raccordement électrique du matériel, Installations de régulation, de
            téléalarme, de télésurveillance, de télégestion et de gestion
            technique centralisée des installations concernées,
            L'entretien/maintenance des moyens de production (chaudières,
            ballons de production), de distribution (canalisations, radiateurs)
            et d'évacuation (remplacement des conduits).
          </Text>
          <Text style={styles.small}>
            Sont exclus : Installations thermiques à haute pression ou haute
            température Installations d'une puissance absorbée supérieure à 12
            kW ou calorifique supérieure à 70 kW Installations de thermiques
            industrielles, fours et cheminées industrielles, revêtements
            thermiques industriels Installations de géothermie Installations à
            énergie solaire photovoltaïque Climatiseur d'une puissance
            frigorifique unitaire supérieure à 12 kW Pose de cheminées, inserts,
            poêle à bois. Réalisation de conduits de fumées maçonnés
            Manipulation des fluides frigorigènes sauf si détention d'une
            attestation de capacité en cours de validité conforme aux
            dispositions de l'article R543-99 du Code de l'Environnement.
            Climatisation de salles blanches, salles grises, salles propres
            Installations de systèmes de distribution de fluides médicaux, ou
            spéciaux Installations de réseaux de sprinklers et de Robinets
            Incendie Armés (RIA) Réalisation de réseaux sur le domaine public
            Pose de capteurs solaires thermiques intégrés Travaux de géothermie
            Réalisation de forages Travaux de ramonage
          </Text>

          <Text style={styles.strong}>
            19 - INSTALLATION D'AÉRAULIQUE ET DE CONDITIONNEMENT D'AIR
          </Text>
          <Text style={styles.small}>
            Réalisation et entretien d'installations aérauliques (production,
            distribution, évacuation) assurant les fonctions de chauffage, de
            renouvellement et traitement de l'air, de rafraîchissement, hors
            techniques de géothermie, et pose de capteurs solaires intégrés.
            Cette activité comprend les activités accessoires et complémentaires
            : Platelage, réalisation de socle et support d'appareils et
            équipements, Les travaux complémentaires de tranchées, trous de
            passage, saignées et raccords, Le calorifugeage, l'isolation
            thermique et acoustique, Le raccordement électrique du matériel,
            L'installation de régulation, de téléalarme, de télésurveillance, de
            télégestion et de gestion technique centralisée des installations
            concernées.
          </Text>
          <Text style={styles.small}>
            Sont exclus : Climatiseur d'une puissance frigorifique unitaire
            supérieure à 12 kW Désenfumage naturel. Climatisation de salles
            blanches, salles grises, salles propres Manipulation des fluides
            frigorigènes sauf si détention d'une attestation de capacité en
            cours de validité conforme aux dispositions de l'article R543-99 du
            Code de l'Environnement. Géothermie Pose de capteurs solaires
            intégrés
          </Text>

          <Text style={styles.strong}>20 – ELECTRICITE</Text>
          <Text style={styles.small}>
            Réalisation de réseaux de distribution de courant électrique faible
            ou fort, de chauffage électrique sauf installations aérothermiques
            air/air ou air extrait/air neuf, ainsi que le raccord et
            l'installation d'appareils électriques. Cette activité comprend :
            L'installation de ventilation mécanique contrôlée (VMC) sauf en
            locaux avec présence d'une piscine, La pose de dispositifs de
            protection contre les effets de la foudre, La mise en œuvre
            d'automatismes et de systèmes domotiques, La réalisation de réseaux
            intérieurs Voix-Données-Images (VDI), Les travaux complémentaires de
            tranchées, trous de passage, saignées et raccords. - Chapes de
            protection des installations de chauffage.
          </Text>
          <Text style={styles.small}>
            Sont exclus : Les installations d'électricité de process industriel
            L'installation de systèmes d'alarme et de détection incendie ou
            intrusion pour les ERP de 1ère, 2ème, 3ème et 4ème catégorie, les
            IGH ou les sites industriels. La réalisation de réseaux de Gestion
            Technique Centralisée (GTC) ou de Gestion Technique Bâtiment (GTB),
            Pose et/ou branchement de capteurs photovoltaïques.
          </Text>
        </View>

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Soucieux de votre satisfaction, nous restons à votre disposition et
            vous prions d'agréer, Madame, Monsieur, nos sincères salutations.
          </Text>
          <Text style={styles.contactInfo}>
            <Text style={{ fontWeight: "bold" }}>Service Cotisations:</Text>{" "}
            cotisation.encycliebat@encyclie-construction.fr
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ContractRCDPDF;
