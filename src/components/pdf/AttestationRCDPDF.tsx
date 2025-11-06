import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { Quote } from "@/lib/types";
import { tableauTax } from "@/lib/tarificateurs/rcd";

// Styles professionnels pour l'attestation
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 40,
    fontSize: 10,
    lineHeight: 1.5,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#000000",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000000",
    textDecoration: "underline",
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 6,
    color: "#000000",
  },
  paragraph: {
    fontSize: 10,
    marginBottom: 8,
    textAlign: "justify",
    color: "#000000",
  },
  bold: {
    fontWeight: "bold",
  },
  italic: {
    fontStyle: "italic",
  },
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #000000",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableHeader: {
    backgroundColor: "#F3F4F6",
    fontWeight: "bold",
    fontSize: 9,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    paddingHorizontal: 2,
  },
  tableCellCenter: {
    textAlign: "center",
  },
  infoField: {
    flexDirection: "row",
    marginBottom: 4,
    fontSize: 10,
  },
  fieldLabel: {
    fontWeight: "bold",
    marginRight: 5,
    minWidth: 120,
  },
  fieldValue: {
    flex: 1,
  },
  listItem: {
    fontSize: 10,
    marginBottom: 5,
    paddingLeft: 10,
  },
  signatureSection: {
    marginTop: 30,
    fontSize: 10,
  },
  footer: {
    marginTop: 20,
    fontSize: 8,
    color: "#666666",
    textAlign: "justify",
    lineHeight: 1.3,
  },
});

interface AttestationRCDPDFProps {
  quote: Quote;
  contractNumber?: string;
  startDate?: string;
  endDate?: string;
  attestationDate?: string;
  validityStartDate?: string;
  validityEndDate?: string;
}

const AttestationRCDPDF: React.FC<AttestationRCDPDFProps> = ({
  quote,
  contractNumber = "xxxRCDWAK",
  startDate,
  endDate,
  attestationDate,
  validityStartDate,
  validityEndDate,
}) => {
  // Fonction pour formater la date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "xx/xx/xxxx";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Date actuelle si non fournie
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const attestationDateFormatted = attestationDate
    ? formatDate(attestationDate)
    : today;
  const validityStartFormatted = validityStartDate
    ? formatDate(validityStartDate)
    : today;
  const validityEndFormatted = validityEndDate
    ? formatDate(validityEndDate)
    : "xx/xx/xxxx";
  const startDateFormatted = startDate ? formatDate(startDate) : "xxx/xxx/xxx";
  const endDateFormatted = endDate ? formatDate(endDate) : "xxx/xxx/xxx";
  const contractStartDate = startDate
    ? formatDate(startDate)
    : quote?.formData?.dateDeffet
    ? formatDate(quote.formData.dateDeffet)
    : "xx/xx/xxxx";

  // Récupérer les activités garanties
  const activities = quote?.formData?.activities || [];
  const activitiesList = activities
    .map((activity: any) => {
      const taxItem = tableauTax.find(
        (tax) => tax.code.toString() === activity.code?.toString()
      );
      return {
        code: activity.code || "",
        label: taxItem?.title || "",
      };
    })
    .filter((act: any) => act.code && act.label);

  // Données de l'entreprise
  const companyName =
    quote?.formData?.companyName || quote?.companyData?.companyName || "";
  const legalForm =
    quote?.formData?.legalForm || quote?.companyData?.legalForm || "";
  const address =
    quote?.formData?.address || quote?.companyData?.address || "";
  const postalCode =
    quote?.formData?.postalCode || quote?.companyData?.postalCode || "";
  const city = quote?.formData?.city || quote?.companyData?.city || "";
  const siren = quote?.formData?.siret
    ? quote.formData.siret.substring(0, 9)
    : quote?.companyData?.siret
    ? quote.companyData.siret.substring(0, 9)
    : "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête - Clause de suspension */}
        <View style={styles.header}>
          <Text style={[styles.paragraph, styles.bold]}>
            Conformément aux dispositions du présent contrat, il est convenu
            qu'en cas de non-paiement de la prime d'assurance à(aux)
            échéance(s) définie(s), les présentes garanties seront suspendues,
            dans les conditions prévues à l'article L113-3 du Code des
            assurances.
          </Text>
        </View>

        {/* Informations du souscripteur */}
        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>Le souscripteur</Text>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Forme Juridique :</Text>
            <Text style={styles.fieldValue}>{legalForm || "__________"}</Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Société :</Text>
            <Text style={styles.fieldValue}>{companyName || "__________"}</Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Rue :</Text>
            <Text style={styles.fieldValue}>{address || "__________"}</Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>CP Ville :</Text>
            <Text style={styles.fieldValue}>
              {postalCode && city ? `${postalCode} ${city}` : "__________"}
            </Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>N° Siren :</Text>
            <Text style={styles.fieldValue}>{siren || "__________"}</Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Numéro de contrat :</Text>
            <Text style={styles.fieldValue}>{contractNumber}</Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Date d'effet du contrat :</Text>
            <Text style={styles.fieldValue}>{contractStartDate}</Text>
          </View>
        </View>

        {/* L'assureur */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>L'assureur</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>
              WAKAM (nouveau nom de LA PARISIENNE ASSURANCES)
            </Text>
            , Société Anonyme au capital de 4 658 992€, siège social 120-122
            rue Réaumur, 75002 PARIS, Immatriculée au Registre du Commerce et
            des Sociétés de Paris, sous le numéro 562 117 085.
          </Text>
          <Text style={[styles.paragraph, { marginTop: 10 }]}>
            Le {attestationDateFormatted},
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>L'assureur atteste</Text> que la personne
            dont l'identité est mentionnée ci-dessus est titulaire du contrat
            d'Assurance responsabilité civile professionnelle et décennale n°{" "}
            {contractNumber}, pour la période du {startDateFormatted} au{" "}
            {endDateFormatted}.
          </Text>
          <Text style={styles.paragraph}>
            La présente attestation est valable du {validityStartFormatted}{" "}
            jusqu'au {validityEndFormatted} et ne constitue qu'une présomption
            de garantie à la charge de l'Assureur. Elle ne peut engager
            l'assureur au-delà des clauses et conditions du contrat auxquelles
            elle se réfère
          </Text>
        </View>

        {/* Activités garanties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activités garanties</Text>
          <Text style={[styles.paragraph, styles.italic]}>
            Activités réalisées dans le domaine du bâtiment suivant la
            Nomenclature des activités souscrites avec Encyclie BAT
          </Text>
          <Text style={[styles.paragraph, styles.italic]}>
            (Se reporter à l'annexe 1 intégrée à la présente attestation)
          </Text>

          <Text style={[styles.subsectionTitle, { marginTop: 10 }]}>
            Vous êtes garantis exclusivement pour les activités professionnelles
            ou missions suivantes :
          </Text>

          {activitiesList.length > 0 ? (
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableCellCenter]}>
                  N° d'activité, selon nomenclature, en annexe
                </Text>
                <Text style={[styles.tableCell, styles.tableCellCenter]}>
                  Libellé(s)
                </Text>
              </View>
              {activitiesList.map((activity: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tableCellCenter]}>
                    {activity.code}
                  </Text>
                  <Text style={styles.tableCell}>{activity.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.paragraph}>
              (Aucune activité spécifiée dans le contrat)
            </Text>
          )}

          <Text style={styles.paragraph}>
            Les travaux accessoires ou complémentaires compris le cas échéant
            dans la définition des activités ne doivent en aucun cas faire
            l'objet d'un marché de travaux à part entière.{" "}
            <Text style={styles.bold}>
              A défaut, ces travaux seront réputés non garantis.
            </Text>
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>
              Les activités sous-traitées sont celles qui sont garanties par le
              présent contrat.
            </Text>
          </Text>
        </View>

        {/* Conditions d'application */}
        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Les garanties objet de la présente attestation s'appliquent
          </Text>
          <Text style={styles.listItem}>
            • Aux activités professionnelles ou missions suivantes : Voir
            Activités garanties ci-dessus.
          </Text>
          <Text style={styles.listItem}>
            • Aux travaux ayant fait l'objet d'une ouverture de chantier pendant
            la période de validité mentionnée ci-dessus. L'ouverture de chantier
            est définie à l'annexe I de l'article A. 243-1 du Code des
            assurances.
          </Text>
          <Text style={styles.listItem}>
            • Aux travaux réalisés dans les DROM-COM à l'exclusion de la France
            métropolitaine.
          </Text>
          <Text style={styles.listItem}>
            • Aux chantiers dont le coût total de construction tous corps d'état
            y compris honoraires déclaré par le maître d'ouvrage, n'est pas
            supérieur :
          </Text>
          <Text style={[styles.listItem, { paddingLeft: 20 }]}>
            - À la somme de{" "}
            <Text style={styles.bold}>15 000 000 €</Text> pour les ouvrages
            soumis à obligation d'assurance
          </Text>
          <Text style={[styles.listItem, { paddingLeft: 20 }]}>
            - À la somme de <Text style={styles.bold}>1 000 000 €</Text> pour
            les ouvrages non soumis à obligation d'assurance
          </Text>
          <Text style={styles.listItem}>
            • <Text style={styles.bold}>
              A l'exclusion des Ouvrages exceptionnels et/ou inusuels.
            </Text>
          </Text>
          <Text style={styles.listItem}>
            • Aux travaux, produits et procédés de construction suivante :
          </Text>
          <Text style={styles.paragraph}>
            Travaux de construction répondant à une norme homologuée (NF DTU ou NF
            EN), à des règles Professionnelles acceptées par la C2P1 ou à des
            recommandations professionnelles du programme RAGE 2012 non mises en
            observation par la C2P2
          </Text>
          <Text style={styles.paragraph}>
            Pour des procédés ou produits faisant l'objet au jour de la
            passation du marché :
          </Text>
          <Text style={styles.listItem}>
            • D'un Agrément Technique Européen (ATE) en cours de validité ou d'une
            Evaluation Technique Européenne (ETE) bénéficiant d'un Document
            Technique d'Application (DTA), ou d'un Avis Technique (ATec),
            valides et non mis en observation par la C2P3
          </Text>
          <Text style={styles.listItem}>
            • D'une Appréciation Technique d'Expérimentation (ATEx) avec avis
            favorable,
          </Text>
          <Text style={styles.listItem}>
            • D'un Pass'innovation « vert » en cours de validité ».
          </Text>
          <Text style={[styles.paragraph, styles.italic, { fontSize: 9 }]}>
            1. Les règles professionnelles acceptées par la C2P (« Commission
            Prévention Produits mis en œuvre » de l'Agence Qualité Construction)
            sont listées à l'annexe 2 de la publication semestrielle de la C2P
            et sont consultables sur le site de l'Agence Qualité Construction
            (www.qualiteconstruction.com)
          </Text>
          <Text style={[styles.paragraph, styles.italic, { fontSize: 9 }]}>
            2. Les recommandations professionnelles RAGE 2012 (« Règles de
            l'Art Grenelle Environnement 2012 ») sont consultables sur le site
            internet du programme RAGE
            (reglesdelart-grenelle-environnement-2012.fr).
          </Text>
          <Text style={[styles.paragraph, styles.italic, { fontSize: 9 }]}>
            3. Les communiqués de la C2P sont accessibles sur le site de
            l'AQC (qualiteconstruction.com).
          </Text>
          <Text style={[styles.paragraph, styles.bold, { marginTop: 10 }]}>
            Dans le cas où les travaux réalisés ne répondent pas aux
            caractéristiques énoncées ci-dessus, l'assuré en informe l'assureur.
          </Text>
        </View>

        {/* SECTION 1 : Responsabilité Civile Décennale */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            SECTION 1 : Responsabilité Civile Décennale des ouvrages soumis à
            obligation d'assurance
          </Text>
          <Text style={[styles.subsectionTitle, { marginTop: 8 }]}>
            Nature de la garantie :
          </Text>
          <Text style={styles.paragraph}>
            Le contrat garantit la responsabilité décennale de l'assuré visée
            aux articles 1792 et suivants du code civil, dans le cadre et les
            limites prévus par les dispositions des articles L. 241-1 et L.
            241-2 du code des assurances relatives à l'obligation d'assurance
            décennale, et pour des travaux de construction d'ouvrages qui y sont
            soumis, au regard de l'article L. 243-1-1 du même code. La garantie
            couvre les travaux de réparation, notamment en cas de remplacement
            des ouvrages, qui comprennent également les travaux de démolition,
            déblaiement, dépose ou de démontage éventuellement nécessaires.
          </Text>
          <Text style={[styles.subsectionTitle, { marginTop: 8 }]}>
            Montant de la garantie :
          </Text>
          <Text style={styles.paragraph}>
            En habitation : le montant de la garantie couvre le coût des travaux
            de réparation des dommages à l'ouvrage. Hors habitation : le montant
            de la garantie couvre le coût des travaux de réparation des dommages
            à l'ouvrage dans la limite du coût total de construction déclaré par
            le maître d'ouvrage et sans pouvoir être supérieur au montant prévu
            au I de l'article R. 243-3 du code des assurances. Lorsqu'un contrat
            collectif de responsabilité décennale est souscrit au bénéfice de
            l'assuré, le montant de la garantie est égal au montant de la
            franchise absolue stipulée par ledit contrat collectif. Les frais de
            défense sont inclus dans les présents montants de garantie.
          </Text>
          <Text style={[styles.subsectionTitle, { marginTop: 8 }]}>
            Durée et maintien de la garantie :
          </Text>
          <Text style={styles.paragraph}>
            Le contrat couvre, pour la durée de la responsabilité pesant sur
            l'assuré en vertu des articles 1792 et suivants du code civil, les
            travaux ayant fait l'objet d'une ouverture de chantier pendant la
            période de validité fixée aux conditions particulières. La garantie
            afférente à ces travaux est maintenue dans tous les cas pour la même
            durée.
          </Text>
          <Text style={[styles.paragraph, styles.bold, { marginTop: 10 }]}>
            La présente attestation ne peut engager l'assureur au-delà des
            clauses et conditions du contrat auquel elle se réfère.
          </Text>
          <Text style={styles.paragraph}>
            Sa responsabilité de sous-traitant couvre le paiement des travaux de
            réparation des dommages de la nature de ceux visés aux articles 1792
            et 1792-2 du Code civil et apparus après réception, lorsque la
            responsabilité de l'assuré est engagée du fait des travaux de
            construction d'ouvrages soumis à l'obligation d'assurance, qu'il a
            réalisés en qualité de sous-traitant. Cette garantie est accordée,
            conformément à l'article 1792-4-2 du Code civil, pour une durée ferme
            de dix ans à compter de la réception.
          </Text>
        </View>

        {/* SECTION 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            SECTION 2 : Responsabilité Civile Décennale des ouvrages non soumis
            à obligation d'assurance
          </Text>
          <Text style={styles.paragraph}>
            Dans le cadre de la garantie de responsabilité décennale pour les
            ouvrages non soumis à obligation d'assurance conformément à l'article
            L 243-1-1 du Code des Assurances, ce contrat couvre les dommages
            portant atteinte à la solidité de l'ouvrage. Les interventions de
            l'assuré sur des chantiers de construction non soumis à l'obligation
            d'assurance décennale dont le coût global des travaux tous corps
            d'état HT y compris maîtrise d'œuvre, n'est pas supérieur à 1 000 000
            €. Cette garantie est gérée selon le régime de la répartition.
          </Text>
        </View>

        {/* SECTION 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            SECTION 3 : Responsabilité Civile hors responsabilité décennale
          </Text>
          <Text style={styles.paragraph}>
            Pour les marchés d'entreprise, en tant que locateur d'ouvrage ou
            sous-traitant, titulaire d'un marché de travaux que l'assuré exécute
            lui-même ou avec son personnel, et pour lequel il peut accessoirement
            faire appel à des sous-traitants.
          </Text>
          <Text style={styles.paragraph}>
            Les garanties de Responsabilité Civile s'appliquent aux réclamations
            formulées à l'encontre de l'Assuré pendant la Période de validité de
            la garantie, selon les dispositions de l'article L 124-5 du Code
            des Assurances.
          </Text>
        </View>

        {/* TABLEAU DES MONTANTS DE GARANTIE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TABLEAU DES MONTANTS DE GARANTIE</Text>
          <Text style={[styles.paragraph, { fontSize: 8, marginBottom: 5 }]}>
            (Les montants détaillés sont disponibles dans les conditions
            particulières du contrat)
          </Text>
        </View>

        {/* CLAUSES SPECIALES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLAUSES SPECIALES :</Text>
          <Text style={styles.listItem}>
            • Il est précisé que, conformément aux stipulations des présentes
            Conditions particulières et conformément aux déclarations faites par
            le souscripteur sur le questionnaire préalable d'assurance, seules
            les activités susmentionnées sont garanties par le présent contrat à
            l'exclusion de toutes autres activités même si elles sont mentionnées
            au Kbis ou sur le papier en tête de l'assuré.
          </Text>
          <Text style={styles.listItem}>
            • Il est également précisé, que si l'assuré souhaite garantir, pour
            son entreprise, d'autres activités que celles prévues au présent
            contrat, ce dernier devra prévenir son intermédiaire afin de les
            faire couvrir par une autre police d'assurance adaptée.
          </Text>
          <Text style={styles.listItem}>
            • Le souscripteur ne souhaite pas être assuré par la garantie
            optionnelle Reprise du Passé. Cette garantie ne pourra en aucun cas
            être ajoutée postérieurement à la souscription du contrat.
          </Text>
        </View>

        {/* ENCYCLIE CONSTRUCTION */}
        <View style={styles.section}>
          <Text style={[styles.subsectionTitle, { marginTop: 15 }]}>
            ENCYCLIE CONSTRUCTION, 42 RUE NOTRE-DAME DES VICTOIRES 75002 PARIS
          </Text>
          <Text style={styles.paragraph}>
            Agissant pour le compte de l'assureur en vertu d'une convention de
            délégation de gestion.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Par la présente attestation</Text>,
            l'Assureur s'engage, conformément au Code des Assurances, à couvrir
            le risque et les garanties définis :
          </Text>
          <Text style={styles.listItem}>
            • Aux dernières Conditions particulières en vigueur du contrat n°{" "}
            <Text style={styles.bold}>{contractNumber}</Text>
          </Text>
          <Text style={styles.listItem}>
            • Aux Conditions Générales ENCYCLIE BAT-CG_WAKAM_082022
          </Text>
          <Text style={[styles.paragraph, { marginTop: 10 }]}>
            <Text style={styles.bold}>Avis au Preneur d'Assurance</Text> : Ce
            contrat est soumis aux lois de la République Française.
          </Text>
        </View>

        {/* Signature */}
        <View style={styles.signatureSection}>
          <Text style={styles.paragraph}>Fait à Paris, le {today}</Text>
          <Text style={[styles.paragraph, { marginTop: 15 }]}>
            Pour l'assureur par délégation
          </Text>
          <Text style={[styles.paragraph, { marginTop: 5 }]}>
            Joshua Newoor, Président
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default AttestationRCDPDF;



