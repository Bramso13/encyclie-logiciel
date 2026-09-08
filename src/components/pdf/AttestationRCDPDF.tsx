import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { Quote } from "@/lib/types";
import { tableauTax } from "@/lib/tarificateurs/rcd";
import { CABINET, CABINET_LEGAL_FOOTER } from "@/lib/cabinet";

const ENCYCLIE_ORANGE = "#F39200";
const FOOTER_LEGAL = CABINET_LEGAL_FOOTER;

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    paddingTop: 28,
    paddingHorizontal: 36,
    paddingBottom: 56,
    fontSize: 9,
    lineHeight: 1.45,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    marginBottom: 12,
    alignItems: "center",
  },
  logo: {
    width: 86,
    height: 42,
    marginBottom: 8,
    objectFit: "contain",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.4,
    color: "#111827",
  },
  subtitle: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 3,
    color: "#374151",
  },
  headerRule: {
    marginTop: 10,
    height: 2,
    width: "100%",
    backgroundColor: ENCYCLIE_ORANGE,
  },
  clause: {
    marginTop: 12,
    marginBottom: 12,
    fontSize: 8.5,
    textAlign: "center",
    fontStyle: "italic",
    color: "#1f2937",
  },
  twoCols: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  col: {
    width: "48%",
  },
  blockTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 6,
    color: ENCYCLIE_ORANGE,
  },
  field: {
    flexDirection: "row",
    marginBottom: 2,
  },
  fieldLabel: {
    fontWeight: "bold",
    marginRight: 4,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#111827",
  },
  paragraph: {
    fontSize: 8.5,
    marginBottom: 5,
    textAlign: "justify",
  },
  listItem: {
    fontSize: 8.5,
    marginBottom: 3,
    paddingLeft: 8,
  },
  bold: {
    fontWeight: "bold",
  },
  italic: {
    fontStyle: "italic",
  },
  table: {
    marginTop: 6,
    marginBottom: 8,
    border: "1px solid #d1d5db",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e7eb",
  },
  tableHeader: {
    backgroundColor: "#FFF4E5",
  },
  th: {
    flex: 1,
    padding: 5,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  td: {
    flex: 1,
    padding: 5,
    fontSize: 8,
  },
  tdCenter: {
    textAlign: "center",
  },
  guaranteeRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e7eb",
  },
  gCover: { width: "34%", padding: 4, fontSize: 7.5 },
  gLimit: { width: "46%", padding: 4, fontSize: 7.5 },
  gFran: { width: "20%", padding: 4, fontSize: 7.5, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    borderTop: `1px solid ${ENCYCLIE_ORANGE}`,
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerLogo: {
    width: 42,
    height: 20,
    objectFit: "contain",
  },
  footerText: {
    flex: 1,
    fontSize: 6.2,
    color: "#6b7280",
    textAlign: "justify",
    lineHeight: 1.25,
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
  baseUrl?: string;
}

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

const AttestationRCDPDF: React.FC<AttestationRCDPDFProps> = ({
  quote,
  contractNumber = "xxxRCDWAK",
  startDate,
  endDate,
  attestationDate,
  validityStartDate,
  validityEndDate,
  baseUrl,
}) => {
  const logoSrc = `${baseUrl ? baseUrl : ""}/couleur_1.png`;
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

  const activities = quote?.formData?.activities || [];
  const activitiesList = activities
    .map((activity: { code?: string }) => {
      const taxItem = tableauTax.find(
        (tax) => tax.code.toString() === activity.code?.toString(),
      );
      return {
        code: activity.code || "",
        label: taxItem?.title || "",
      };
    })
    .filter((act: { code: string; label: string }) => act.code && act.label);

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

  const broker = quote?.broker;
  const brokerCabinet = broker?.companyName || broker?.name || "";
  const brokerAddress = broker?.address || "";
  const brokerPhone = broker?.phone || "";
  const brokerEmail = broker?.email || "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoSrc} style={styles.logo} />
          <Text style={styles.title}>ATTESTATION D'ASSURANCE</Text>
          <Text style={styles.subtitle}>
            Assurance de Responsabilité Civile Professionnelle et Décennale
          </Text>
          <View style={styles.headerRule} />
        </View>

        <Text style={styles.clause}>
          Conformément aux dispositions du présent contrat, il est convenu
          qu'en cas de non-paiement de la prime d'assurance à(aux)
          échéance(s) définie(s), les présentes garanties seront suspendues,
          dans les conditions prévues à l'article L113-3 du Code des
          assurances.
        </Text>

        <View style={styles.twoCols}>
          <View style={styles.col}>
            <Text style={styles.blockTitle}>Le souscripteur :</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Forme Juridique :</Text>
              <Text>{legalForm || "__________"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nom commercial :</Text>
              <Text>{companyName || "__________"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Rue :</Text>
              <Text>{address || "__________"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CP Ville :</Text>
              <Text>
                {postalCode && city ? `${postalCode} ${city}` : "__________"}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>N° Siren :</Text>
              <Text>{siren || "__________"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Numéro de contrat :</Text>
              <Text>{contractNumber}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date d'effet du contrat :</Text>
              <Text>{contractStartDate}</Text>
            </View>
          </View>
          <View style={styles.col}>
            <Text style={styles.blockTitle}>Votre intermédiaire :</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>NOM DU CABINET :</Text>
              <Text>{brokerCabinet || "ENCYCLIE CONSTRUCTION"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ADRESSE :</Text>
              <Text>
                {brokerAddress || CABINET.addressLine}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CP VILLE :</Text>
              <Text>{brokerAddress ? "" : "75002 Paris"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Tél :</Text>
              <Text>{brokerPhone || "—"}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email :</Text>
              <Text>{brokerEmail || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>L'assureur</Text>
          <Text style={styles.paragraph}>
            FIDELIDADE, Succursale française de la société FIDELIDADE Companhia
            de Seguros, S.A, Société Anonyme au capital de 509 263 524 Euros,
            dont le siège social est sis à Lisbonne, Largo de Calhariz, 30
            1249-01 Lisboa - Portugal, prise en sa succursale française sise :
            Tour Aurore – 19ème étage, 18, place des Reflets – CS 90462 – 92976
            Paris La Défense Cedex, immatriculée au Registre du Commerce et des
            Sociétés de Nanterre, sous le numéro 413 175 191 et soumise au
            contrôle de « l'Autoridade de Supervisão de Seguros e Fundos de
            Pensões (ASF) ».
          </Text>
          <Text style={[styles.paragraph, { marginTop: 6 }]}>
            Le {attestationDateFormatted},
          </Text>
          <Text style={styles.paragraph}>
            L'assureur atteste que la personne dont l'identité est mentionnée
            ci-dessus est titulaire du contrat d'Assurance responsabilité
            civile professionnelle et décennale n° {contractNumber}, pour la
            période du {startDateFormatted} au {endDateFormatted}.
          </Text>
          <Text style={styles.paragraph}>
            La présente attestation est valable du {validityStartFormatted}{" "}
            jusqu'au {validityEndFormatted} et ne constitue qu'une présomption
            de garantie à la charge de l'Assureur. Elle ne peut engager
            l'assureur au-delà des clauses et conditions du contrat auxquelles
            elle se réfère.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activités garanties</Text>
          <Text style={[styles.paragraph, styles.italic]}>
            Activités réalisées dans le domaine du bâtiment suivant la
            Nomenclature des activités souscrites avec Encyclie BAT (Se
            reporter à l'annexe 1 intégrée à la présente attestation)
          </Text>
          <Text style={styles.paragraph}>
            Vous êtes garantis exclusivement pour l'activité professionnelle ou
            mission suivante :
          </Text>
          {activitiesList.length > 0 ? (
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.th}>
                  N° d'activité, selon nomenclature, en annexe
                </Text>
                <Text style={styles.th}>Libellé(s)</Text>
              </View>
              {activitiesList.map(
                (activity: { code: string; label: string }, index: number) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.td, styles.tdCenter]}>
                      {activity.code}
                    </Text>
                    <Text style={styles.td}>{activity.label}</Text>
                  </View>
                ),
              )}
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
            Les activités sous-traitées sont celles qui sont garanties par le
            présent contrat.
          </Text>
        </View>

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
          <Text style={[styles.listItem, { paddingLeft: 18 }]}>
            • À la somme de 15 000 000 € pour les ouvrages soumis à obligation
            d'assurance
          </Text>
          <Text style={[styles.listItem, { paddingLeft: 18 }]}>
            • À la somme de 1 000 000 € pour les ouvrages non soumis à
            obligation d'assurance
          </Text>
          <Text style={styles.listItem}>
            • A l'exclusion des Ouvrages exceptionnels et/ou inusuels.
          </Text>
          <Text style={styles.listItem}>
            • pour des travaux de construction de technique courante, c'est-à-dire
            répondant à une norme homologuée (NF DTU ou NF EN) ou à des règles
            professionnelles acceptées par la C2P, ou mettant en œuvre des
            procédés ou produits bénéficiant d'une ETE / DTA / ATec valides et
            non mis en observation par la C2P, ou d'une ATEx avec avis favorable.
          </Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>
            SECTION 1 : Responsabilité Civile Décennale des ouvrages soumis à
            obligation d'assurance
          </Text>
          <Text style={styles.paragraph}>
            Le contrat garantit la responsabilité décennale de l'assuré visée
            aux articles 1792 et suivants du code civil, dans le cadre et les
            limites prévus par les dispositions des articles L. 241-1 et L.
            241-2 du code des assurances relatives à l'obligation d'assurance
            décennale, et pour des travaux de construction d'ouvrages qui y sont
            soumis, au regard de l'article L. 243-1-1 du même code. La garantie
            couvre les travaux de réparation, notamment en cas de remplacement
            des ouvrages.
          </Text>
          <Text style={styles.paragraph}>
            En habitation : le montant de la garantie couvre le coût des travaux
            de réparation des dommages à l'ouvrage. Hors habitation : dans la
            limite du coût total de construction déclaré par le maître d'ouvrage
            et sans pouvoir être supérieur au montant prévu au I de l'article R.
            243-3 du code des assurances.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            SECTION 2 : Responsabilité Civile Décennale des ouvrages non soumis
            à obligation d'assurance
          </Text>
          <Text style={styles.paragraph}>
            Dans le cadre de la garantie de responsabilité décennale pour les
            ouvrages non soumis à obligation d'assurance conformément à
            l'article L 243-1-1 du Code des Assurances, ce contrat couvre les
            dommages portant atteinte à la solidité de l'ouvrage. Les
            interventions de l'assuré sur des chantiers de construction non
            soumis à l'obligation d'assurance décennale dont le coût global des
            travaux tous corps d'état HT y compris maîtrise d'œuvre, n'est pas
            supérieur à 1 000 000 €. Cette garantie est gérée selon le régime
            de la répartition.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            SECTION 3 : Responsabilité Civile hors responsabilité décennale
          </Text>
          <Text style={styles.paragraph}>
            Pour les marchés d'entreprise, en tant que locateur d'ouvrage ou
            sous-traitant, titulaire d'un marché de travaux que l'assuré exécute
            lui-même ou avec son personnel, et pour lequel il peut
            accessoirement faire appel à des sous-traitants. Les garanties de
            Responsabilité Civile s'appliquent aux réclamations formulées à
            l'encontre de l'Assuré pendant la Période de validité de la
            garantie, selon les dispositions de l'article L 124-5 du Code des
            Assurances.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Tableau des montants de garantie
          </Text>
          <View style={styles.table}>
            <View style={[styles.guaranteeRow, styles.tableHeader]}>
              <Text style={styles.gCover}>COUVERTURE</Text>
              <Text style={styles.gLimit}>LIMITES</Text>
              <Text style={styles.gFran}>FRANCHISE</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Text style={styles.gCover}>RC AVANT/APRÈS RÉCEPTION</Text>
              <Text style={styles.gLimit}>2 000 000€ par année</Text>
              <Text style={styles.gFran}>1 000€</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Text style={styles.gCover}>DOMMAGES MATÉRIELS</Text>
              <Text style={styles.gLimit}>1 500 000€ par année</Text>
              <Text style={styles.gFran}>1 000€</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Text style={styles.gCover}>DOMMAGES IMMATÉRIELS</Text>
              <Text style={styles.gLimit}>
                200 000€ par sinistre / 400 000€ par année
              </Text>
              <Text style={styles.gFran}>1 000€</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Text style={styles.gCover}>ATTEINTES À L'ENVIRONNEMENT</Text>
              <Text style={styles.gLimit}>
                200 000€ par sinistre / 400 000€ par année
              </Text>
              <Text style={styles.gFran}>1 000€</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Text style={styles.gCover}>FAUTES INEXCUSABLES</Text>
              <Text style={styles.gLimit}>750 000€ par année</Text>
              <Text style={styles.gFran}>1 000€</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Text style={styles.gCover}>
                R.C DECENNALE (ouvrages soumis à obligation)
              </Text>
              <Text style={styles.gLimit}>
                Habitation : coût des travaux de réparation. Hors habitation :
                dans la limite du coût déclaré, sans dépasser R. 243-3.
              </Text>
              <Text style={styles.gFran}>1 000€ (*)</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Text style={styles.gCover}>R.C DECENNALE sous-traitant</Text>
              <Text style={styles.gLimit}>2 000 000€</Text>
              <Text style={styles.gFran}>1 000€ (*)</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Text style={styles.gCover}>
                R.C DECENNALE ouvrages non soumis
              </Text>
              <Text style={styles.gLimit}>
                500 000€ par sinistre / 800 000€ par année
              </Text>
              <Text style={styles.gFran}>1 000€ (*)</Text>
            </View>
            <View style={styles.guaranteeRow}>
              <Text style={styles.gCover}>
                RC CONNEXES (bon fonctionnement, DIC, existants, intermédiaires)
              </Text>
              <Text style={styles.gLimit}>
                600 000€ montant unique, dont 100 000€ au titre des dommages
                intermédiaires et DIC cumulés
              </Text>
              <Text style={styles.gFran}>1 000€ (*)</Text>
            </View>
          </View>
          <Text style={[styles.paragraph, { fontSize: 7.5 }]}>
            (*) : Franchise doublée en cas de sous-traitance à une entreprise
            non assurée en Responsabilité Civile Décennale pour ces travaux.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clauses spéciales :</Text>
          <Text style={styles.listItem}>
            • Conformément aux déclarations faites par le souscripteur,
            seules les activités susmentionnées sont garanties, à l'exclusion
            de toutes autres même si elles figurent au Kbis.
          </Text>
          <Text style={styles.listItem}>
            • Si l'assuré souhaite garantir d'autres activités, il devra
            prévenir son intermédiaire afin de les faire couvrir par une autre
            police adaptée.
          </Text>
          <Text style={styles.listItem}>
            • Le souscripteur ne souhaite pas être assuré par la garantie
            optionnelle Reprise du Passé. Cette garantie ne pourra en aucun cas
            être ajoutée postérieurement à la souscription du contrat.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.paragraph, styles.bold]}>
            ENCYCLIE CONSTRUCTION, {CABINET.fullAddress}
          </Text>
          <Text style={styles.paragraph}>
            Agissant pour le compte de l'assureur en vertu d'une convention de
            délégation de gestion.
          </Text>
          <Text style={styles.paragraph}>
            Par la présente attestation, l'Assureur s'engage, conformément au
            Code des Assurances, à couvrir le risque et les garanties définis :
          </Text>
          <Text style={styles.listItem}>
            ▪ Aux dernières Conditions particulières en vigueur du contrat n°{" "}
            {contractNumber}
          </Text>
          <Text style={styles.listItem}>
            ▪ Aux Conditions Générales ENCYCLIE BAT-CG_FIDELIDADE_01052025
          </Text>
          <Text style={styles.paragraph}>
            Avis au Preneur d'Assurance : Ce contrat est soumis aux lois de la
            République Française.
          </Text>
          <Text style={styles.paragraph}>
            Fait à Paris, le {today}
          </Text>
          <Text style={styles.paragraph}>Pour l'assureur par délégation</Text>
          <Text style={styles.bold}>Joshua Newoor, Président</Text>
        </View>

        <View style={styles.footer} fixed>
          <Image src={logoSrc} style={styles.footerLogo} />
          <Text style={styles.footerText}>{FOOTER_LEGAL}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default AttestationRCDPDF;
