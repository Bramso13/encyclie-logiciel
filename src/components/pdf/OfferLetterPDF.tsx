import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { Quote, FormData } from "@/lib/types";
import { getTaxeByRegion } from "@/lib/tarificateurs/rcd";

interface OfferLetterPDFProps {
  quote: Quote;
  formData: FormData;
  calculationResult: any;
  brokerCode: string;
  selectedDocuments: string[];
}

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontSize: 9,
    lineHeight: 1.4,
    color: "#000000",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#1f2937",
  },
  section: {
    marginBottom: 2,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1f2937",
    borderBottom: "2px solid #1e40af",
    paddingBottom: 6,
  },
  subsectionHeader: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 8,
    color: "#374151",
    borderBottom: "1px solid #9ca3af",
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottom: "1px solid #d1d5db",
    paddingBottom: 8,
  },
  headerText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  gridItem: {
    width: "50%",
    marginBottom: 8,
    paddingRight: 10,
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 8,
    borderBottom: "1px solid #d1d5db",
    paddingBottom: 2,
  },
  checkboxGroup: {
    flexDirection: "row",
    marginTop: 4,
  },
  checkbox: {
    fontSize: 8,
    marginRight: 12,
  },
  infoText: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 2,
  },
  table: {
    marginBottom: 2,
    border: "1px solid #9ca3af",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e40af",
    color: "#ffffff",
    borderBottom: "1px solid #9ca3af",
  },
  tableHeaderSecondary: {
    flexDirection: "row",
    backgroundColor: "#1e3a8a",
    color: "#ffffff",
    borderBottom: "1px solid #9ca3af",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #9ca3af",
  },
  tableRowGray: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottom: "1px solid #9ca3af",
  },
  tableCell: {
    padding: 6,
    fontSize: 7,
    borderRight: "1px solid #9ca3af",
  },
  tableCellHeader: {
    padding: 6,
    fontSize: 8,
    fontWeight: "bold",
    borderRight: "1px solid #9ca3af",
  },
  tableCellNoBorder: {
    padding: 6,
    fontSize: 7,
  },
  bulletList: {
    marginLeft: 15,
    marginBottom: 10,
  },
  bulletItem: {
    fontSize: 8,
    marginBottom: 3,
    flexDirection: "row",
  },
  bullet: {
    width: 10,
    fontSize: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 8,
  },
  paragraph: {
    fontSize: 8,
    marginBottom: 8,
    textAlign: "justify",
    lineHeight: 1.4,
  },
  paragraphSmall: {
    fontSize: 7,
    marginBottom: 6,
    textAlign: "justify",
    lineHeight: 1.3,
  },
  bold: {
    fontWeight: "bold",
  },
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTop: "1px solid #d1d5db",
    textAlign: "center",
  },
  footerText: {
    fontSize: 7,
    color: "#6b7280",
    marginBottom: 4,
  },
});

const OfferLetterPDF = ({
  quote,
  formData,
  calculationResult,
  brokerCode,
  selectedDocuments,
}: OfferLetterPDFProps) => {
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

  function financial(x: number) {
    if (x === undefined || x === null) return "";
    return x.toFixed(2);
  }

  return (
    <Document>
      {/* Page 1 - Déclaration du proposant */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          PROPOSITION D'ASSURANCE RESPONSABILITÉ CIVILE DÉCENNALE
        </Text>

        <View style={styles.headerRow}>
          <Text style={styles.headerText}>
            Durée de validité du projet : 30 jours
          </Text>
          <View>
            <Text style={styles.headerText}>
              Reference dossier : {quote.reference}
            </Text>
            <Text style={styles.headerText}>N° code : {brokerCode}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Déclaration du proposant</Text>

          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>
                Nom de la société / Raison sociale :
              </Text>
              <Text style={styles.fieldValue}>
                {formData.companyName || "N/A"}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Forme juridique :</Text>
              <Text style={styles.fieldValue}>
                {formData.legalForm || "N/A"}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Auto-entrepreneur :</Text>
              <View style={styles.checkboxGroup}>
                <Text style={styles.checkbox}>
                  {formatBoolean(
                    formData.legalForm.toLowerCase() ===
                      "entreprise individuelle"
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>
                Nom & Prénom du ou des dirigeants :
              </Text>
              <Text style={styles.fieldValue}>
                {formData.directorName || "N/A"}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Rue du siège social :</Text>
              <Text style={styles.fieldValue}>{formData.address || "N/A"}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>CP Ville du siège social :</Text>
              <Text style={styles.fieldValue}>
                {formData.postalCode} {formData.city}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>N° SIREN</Text>
              <Text style={styles.fieldValue}>{formData.siret || "N/A"}</Text>
            </View>
          </View>

          <Text style={styles.subsectionHeader}>Votre déclaration</Text>

          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>Date d'effet souhaitée :</Text>
              <Text style={styles.fieldValue}>
                {formatDate(formData.dateDeffet)}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>
                Chiffre d'affaires total du dernier exercice ou chiffre
                d'affaires prévisionnel si création d'entreprise en euros hors
                taxes : €
              </Text>
              <Text style={styles.fieldValue}>
                {formatCurrency(formData.chiffreAffaires)}
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 10 }}>
            <Text style={styles.fieldLabel}>
              Part de chiffre d'affaires total hors taxes maximum pour les
              activités sous-traitées (le sous-traitant doit être titulaire d'un
              contrat d'assurance RC Décennale de dix ans minimum) :
            </Text>
            <Text style={styles.fieldValue}>
              {formData.subContractingPercent || "N/A"}%
            </Text>
            <Text style={styles.infoText}>
              Le sous-traitant doit être titulaire d'un contrat d'assurance RC
              Décennale de dix ans minimum
            </Text>
          </View>

          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>
                Effectif y compris le chef d'entreprise : personnes
              </Text>
              <Text style={styles.fieldValue}>
                {formData.nombreSalaries || "N/A"}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.fieldLabel}>
                Date de création de l'entreprise :
              </Text>
              <Text style={styles.fieldValue}>
                {formatDate(
                  formData.companyCreationDate || formData.creationDate
                )}
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 10 }}>
            <Text style={styles.fieldLabel}>
              Expérience professionnelle (y compris en qualité de salarié) :
              années
            </Text>
            <View style={styles.checkboxGroup}>
              <Text style={styles.checkbox}>
                {parseFloat(formData.experienceMetier) < 1
                  ? "Moins de 1 an (refus)"
                  : ""}
              </Text>
              <Text style={styles.checkbox}>
                {formatBoolean(
                  parseFloat(formData.experienceMetier) >= 1 &&
                    parseFloat(formData.experienceMetier) < 3
                )
                  ? "1 à 3 ans"
                  : ""}
              </Text>
              <Text style={styles.checkbox}>
                {parseFloat(formData.experienceMetier) >= 3 &&
                parseFloat(formData.experienceMetier) < 5
                  ? "3 à 5 ans"
                  : ""}
              </Text>
            </View>
            <Text style={styles.infoText}>
              Expérience déclarée: {formData.experienceMetier || "N/A"} ans
            </Text>
          </View>

          {formData.previousResiliationDate && (
            <>
              <View style={{ marginBottom: 10 }}>
                <Text style={styles.fieldLabel}>
                  La précédente assurance a été souscrite le :
                </Text>
                <Text style={styles.fieldValue}>
                  {formatDate(formData.previousResiliationDate)}
                </Text>
              </View>

              <View style={{ marginBottom: 10 }}>
                <Text style={styles.fieldLabel}>
                  Le contrat d'assurance de l'entreprise est-il encore en cours
                  :
                </Text>
                <View style={styles.checkboxGroup}>
                  <Text style={styles.checkbox}>
                    {formatBoolean(formData.previousRcdStatus === "EN_COURS")
                      ? "OUI"
                      : "NON"}
                  </Text>
                  <Text style={styles.checkbox}>
                    {formatBoolean(formData.previousRcdStatus === "RESILIE")
                      ? "NON, résilié à la date du"
                      : "Jamais assuré"}
                  </Text>
                </View>
              </View>

              <View style={{ marginBottom: 10 }}>
                <Text style={styles.fieldLabel}>
                  Le contrat a été résilié :
                </Text>
                <Text style={styles.infoText}>
                  Par l'assuré: □ motif de la résiliation:{" "}
                  {formData.motifResiliation || "N/A"}
                </Text>
                <Text style={styles.infoText}>
                  Par l'assureur: □ motif de la résiliation: N/A
                </Text>
              </View>
            </>
          )}

          <View style={{ marginBottom: 8 }}>
            <Text style={styles.paragraph}>
              Avez-vous déclaré un sinistre au cours des 36 derniers mois (même
              sans suite)? {formatBoolean(formData.sinistre36Mois)} □
            </Text>
          </View>

          <View style={{ marginBottom: 8 }}>
            <Text style={styles.paragraph}>
              Avez-vous connaissance d'événements susceptibles d'engager votre
              responsabilité? {formatBoolean(formData.evenementsResponsabilite)}{" "}
              □
            </Text>
          </View>

          <View style={{ marginBottom: 10 }}>
            <Text style={styles.fieldLabel}>Nombre total d'activités :</Text>
            <Text style={styles.fieldValue}>
              {formData.activities?.length || 0}
            </Text>
          </View>

          <View style={{ marginBottom: 8 }}>
            <Text style={styles.paragraph}>
              Le souscripteur fait-il l'objet d'une procédure de redressement,
              liquidation judiciaire ou de sauvetage ?{" "}
              {formatBoolean(formData.procedureCollective)} □
            </Text>
          </View>

          <View style={{ marginBottom: 10 }}>
            <Text style={styles.fieldLabel}>
              Le souscripteur réalise-t-il du négoce de matériaux?{" "}
              {formatBoolean(formData.negoceMateriaux)} □
            </Text>
            {formData.negoceMateriaux && (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.fieldLabel}>
                  Si oui, Nature des produits :
                </Text>
                <Text style={styles.fieldValue}>
                  {formData.natureProduitsNegoce || "N/A"}
                </Text>
                <Text style={styles.fieldLabel}>
                  Chiffre d'affaires réalisé en négoce de matériaux : €
                </Text>
                <Text style={styles.fieldValue}>
                  {formatCurrency(formData.chiffreAffairesNegoce)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subsectionHeader}>
            Garantie reprise du passé en cas de défaillance d'un précédent
            assureur :
          </Text>
          <Text style={styles.paragraph}>
            OUI, je souhaite souscrire l'extension garantie reprise du passé
            pour les 10 années précédant la souscription du présent contrat □
          </Text>
          <Text style={styles.paragraphSmall}>
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
          </Text>
        </View>
      </Page>

      {/* Page 2 - Activités Garanties et Montants */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>ACTIVITÉS GARANTIES</Text>
        <Text style={styles.paragraph}>
          N° d'activité, selon nomenclature, en annexe
        </Text>
        <Text style={styles.paragraph}>Libellé(s)</Text>

        <Text style={styles.sectionHeader}>
          MONTANT DES GARANTIES ET DES FRANCHISES
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, { flex: 2 }]}>
              COUVERTURE
            </Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              LIMITES PAR SINISTRE
            </Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              PAR ANNÉE D'ASSURANCE
            </Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              FRANCHISE PAR SINISTRE
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              RC AVANT/APRES RÉCEPTION{"\n"}dont :
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>2 000 000€</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>1 000€</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              DOMMAGES MATÉRIELS
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>1 500 000€</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>1 000€</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              DOMMAGES IMMATERIELS
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>200 000€</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>400 000€</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>1 000€</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              ATTEINTES À L'ENVIRONNEMENT
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>200 000€</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>400 000€</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>1 000€</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              FAUTES INEXCUSABLES
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>750 000€</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>1 000€</Text>
          </View>

          <View style={styles.tableRowGray}>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: "bold" }]}>
              RC DECENNALE
            </Text>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: "bold" }]}>
              Montant max du chantier : 15 000 000€
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2, fontSize: 6 }]}>
              R.C DECENNALE pour travaux de construction soumis à l'obligation
              d'assurance{"\n"}
              En Habitation : Le montant de la garantie couvre le coût des
              travaux de réparation des dommages à l'ouvrage.{"\n"}
              Hors habitation : Le montant de la garantie couvre le coût des
              travaux de réparation des dommages à l'ouvrage dans la limite du
              coût total de construction déclaré par le maître d'ouvrage et sans
              pouvoir être supérieur au montant prévu au I de l'article R. 243-3
              du code des assurances.{"\n"}
              En présence d'un CCRD : Lorsqu'un Contrat Collectif de
              Responsabilité Décennale (CCRD) est souscrit au bénéfice de
              l'assuré, le montant de la garantie est égal au montant de la
              franchise absolue stipulée par ledit contrat collectif.
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>2 000 000€</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>1 000€ (*)</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              R.C DECENNALE en tant que sous-traitant en cas de dommages de
              nature décennale
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>2 000 000€</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>1 000€ (*)</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              R.C DECENNALE pour travaux de construction non soumis à
              l'obligation d'assurance conformément à l'article L243-1.1
              paragraphe 1 du Code des Assurances
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>500 000€</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>800 000€</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>1 000€ (*)</Text>
          </View>

          <View style={styles.tableRowGray}>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: "bold" }]}>
              RC CONNEXES À LA RC DECENNALE
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2, fontSize: 6 }]}>
              BON FONCTIONNEMENT DES ÉLÉMENTS D'ÉQUIPEMENTS DISSOCIABLES DES
              OUVRAGES SOUMIS À L'ASSURANCE OBLIGATOIRE{"\n"}
              (Cette garantie est maintenue pour une durée de 2 ans à compter de
              la réception des chantiers ouverts durant la période de garantie,
              telle que précisée à l'article 1792-3 du Code Civil.)
            </Text>
            <Text style={[styles.tableCell, { flex: 2, fontSize: 6 }]}>
              600 000€{"\n"}
              Montant unique pour l'ensemble des garanties BON FONCTIONNEMENT,
              DOMMAGES IMMATERIELS CONSECUTIFS, DOMMAGES AUX EXISTANTS et
              DOMMAGES INTERMEDIAIRES{"\n"}
              Dont 100 000 € au titre des DOMMAGES INTERMEDIAIRES et DOMMAGES
              IMMATERIELS CONSECUTIFS cumulés
            </Text>
            <Text style={[styles.tableCell, { flex: 1, fontSize: 6 }]}>
              1 000€ (*){"\n"}
              NOTA : en cas de sinistre engageant la garantie principale et une
              ou des garanties connexes, seule une franchise sera appliquée €
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRowGray}>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              DOMMAGES IMMATÉRIELS CONSÉCUTIFS
            </Text>
          </View>
          <View style={styles.tableRowGray}>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              DOMMAGES AUX EXISTANTS
            </Text>
          </View>
          <View style={styles.tableRowGray}>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              DOMMAGES MATÉRIELS INTERMÉDIAIRES AFFECTANT UN OUVRAGE SOUMIS À
              L'ASSURANCE OBLIGATOIRE
            </Text>
          </View>
        </View>

        <Text style={styles.paragraphSmall}>
          (*): Franchise doublée en cas de sous-traitance à une entreprise non
          assurée en Responsabilité Civile Décennale pour ces travaux
        </Text>
      </Page>

      {/* Page 3 - Produits d'assurance et détails des primes */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionHeader}>
          PRODUITS D'ASSURANCES CONCERNÉS :
        </Text>
        <Text style={styles.paragraph}>
          Selon les clauses et les conditions générales susmentionnées, le
          contrat à pour lieu de garantir l'assuré contre les risques suivants :
        </Text>
        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Sa Responsabilité Civile Professionnelle
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Sa Responsabilité Civile Décennale
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              - Des dommages à l'ouvrage en cours de travaux
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              - La protection Juridique Complément RCD
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>DETAILS DE LA PRIME :</Text>

        <Text style={[styles.fieldLabel, { marginBottom: 6 }]}>
          PRIMES année en cours pour la période du{" "}
          {formatDate(
            calculationResult?.echeancier?.echeances?.filter(
              (echeance: any) =>
                new Date(echeance.date).getFullYear() ===
                new Date().getFullYear()
            )[0]?.debutPeriode
          )}{" "}
          au{" "}
          {formatDate(
            calculationResult?.echeancier?.echeances
              ?.filter(
                (echeance: any) =>
                  new Date(echeance.date).getFullYear() ===
                  new Date().getFullYear()
              )
              .slice(-1)[0]?.finPeriode
          )}
        </Text>
        <View style={styles.table}>
          <View style={styles.tableRowGray}>
            <Text style={[styles.tableCellHeader, { flex: 2 }]}></Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              Montants H.T
            </Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              Montants Taxes
            </Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              Montant TTC
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Prime RCD provisionnelle hors reprise du passé
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.rcd - echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.rcd || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Prime Protection Juridique Complément RCD
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.pj || 0),
                    0
                  ) *
                  (1 - getTaxeByRegion(quote?.formData?.territory))
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.pj || 0),
                    0
                  ) * getTaxeByRegion(quote?.formData?.territory)
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.pj || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Montant total RCD + PJ
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum +
                      (echeance.rcd || 0) +
                      (echeance.pj || 0) -
                      (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.rcd || 0) + (echeance.pj || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Honoraire de gestion
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.fraisGestion || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}></Text>
            <Text style={[styles.tableCell, { flex: 1 }]}></Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Montant RCD +PJ+ Frais gestion
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum +
                      (echeance.rcd || 0) +
                      (echeance.pj || 0) +
                      (echeance.fraisGestion || 0) -
                      (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum +
                      (echeance.rcd || 0) +
                      (echeance.pj || 0) +
                      (echeance.fraisGestion || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Prime RCD pour la garantie reprise du passé (Prime unique à la
              souscription)
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.reprise || 0),
                    0
                  ) *
                  (1 - getTaxeByRegion(quote?.formData?.territory))
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.reprise || 0),
                    0
                  ) * getTaxeByRegion(quote?.formData?.territory)
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.reprise || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>

          <View style={[styles.tableRow, { backgroundColor: "#dbeafe" }]}>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: "bold" }]}>
              Prime totale à régler( avec reprise passé)
            </Text>
            <Text style={[styles.tableCell, { flex: 1, fontWeight: "bold" }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum +
                      (echeance.rcd || 0) +
                      (echeance.pj || 0) +
                      (echeance.fraisGestion || 0) +
                      (echeance.reprise || 0) -
                      (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1, fontWeight: "bold" }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1, fontWeight: "bold" }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.totalTTC || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 15, marginBottom: 6 }]}>
          PRIMES annuelles pour la période du{" "}
          {formatDate(
            calculationResult?.echeancier?.echeances[0]?.debutPeriode
          )}{" "}
          au{" "}
          {formatDate(
            calculationResult?.echeancier?.echeances[
              calculationResult?.echeancier?.echeances?.length - 1
            ]?.finPeriode
          )}
        </Text>
        <View style={styles.table}>
          <View style={styles.tableRowGray}>
            <Text style={[styles.tableCellHeader, { flex: 2 }]}></Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              Montants H.T
            </Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              Montants Taxes
            </Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              Montant TTC
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Prime RCD provisionnelle hors reprise du passé
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.rcd - echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.rcd || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Prime Protection Juridique Complément RCD
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.pj || 0),
                    0
                  ) *
                  (1 - getTaxeByRegion(quote?.formData?.territory))
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.pj || 0),
                    0
                  ) * getTaxeByRegion(quote?.formData?.territory)
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.pj || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Montant total RCD + PJ
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum +
                      (echeance.rcd || 0) +
                      (echeance.pj || 0) -
                      (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.rcd || 0) + (echeance.pj || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Honoraire de gestion
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.fraisGestion || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}></Text>
            <Text style={[styles.tableCell, { flex: 1 }]}></Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Montant RCD +PJ+ Frais gestion
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum +
                      (echeance.rcd || 0) +
                      (echeance.pj || 0) +
                      (echeance.fraisGestion || 0) -
                      (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum +
                      (echeance.rcd || 0) +
                      (echeance.pj || 0) +
                      (echeance.fraisGestion || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              Prime RCD pour la garantie reprise du passé (Prime unique à la
              souscription)
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.reprise || 0),
                    0
                  ) *
                  (1 - getTaxeByRegion(quote?.formData?.territory))
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.reprise || 0),
                    0
                  ) * getTaxeByRegion(quote?.formData?.territory)
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.reprise || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>

          <View style={[styles.tableRow, { backgroundColor: "#dbeafe" }]}>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: "bold" }]}>
              Prime totale à régler( avec reprise passé)
            </Text>
            <Text style={[styles.tableCell, { flex: 1, fontWeight: "bold" }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum +
                      (echeance.rcd || 0) +
                      (echeance.pj || 0) +
                      (echeance.fraisGestion || 0) +
                      (echeance.reprise || 0) -
                      (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1, fontWeight: "bold" }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) => sum + (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, { flex: 1, fontWeight: "bold" }]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.totalTTC || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>
        </View>
      </Page>

      {/* Page 4 - Échéancier et modalités */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionHeader}>
          ECHEANCIER (y compris reprise passé si incluse)
        </Text>
        <View style={styles.table}>
          <View style={styles.tableRowGray}>
            <Text style={[styles.tableCellHeader, { flex: 2 }]}>
              ECHEANCIER (y compris reprise passé si incluse)
            </Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              Montants H.T
            </Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              Montants Taxes
            </Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              Montant TTC
            </Text>
          </View>
          <View style={styles.table}>
            {calculationResult?.echeancier?.echeances?.map((echeance: any) => (
              <View style={styles.tableRow} key={echeance.date}>
                <Text style={[styles.tableCell, { flex: 2 }]}>
                  PRIME pour la période du {formatDate(echeance.debutPeriode)}{" "}
                  au {formatDate(echeance.finPeriode)}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {financial(
                    echeance.rcd +
                      echeance.pj +
                      echeance.fraisGestion +
                      echeance.reprise -
                      echeance.taxe
                  ) || ""}{" "}
                  €
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {financial(echeance.taxe) || ""} €
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {financial(echeance.totalTTC) || ""} €
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionHeader, { marginTop: 15 }]}>
          DETAIL DES PAIEMENTS A EFFECTUER : (à revoir avec Priscilla)
        </Text>

        <View style={styles.table}>
          <View style={styles.tableRowGray}>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>Date</Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              Total HT €
            </Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>Taxe €</Text>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>
              Total TTC €
            </Text>
            <Text style={[styles.tableCellHeader, { flex: 0.8 }]}>RCD</Text>
            <Text style={[styles.tableCellHeader, { flex: 0.8 }]}>PJ</Text>
            <Text style={[styles.tableCellHeader, { flex: 0.8 }]}>Frais</Text>
            <Text style={[styles.tableCellHeader, { flex: 0.8 }]}>Reprise</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 0.8 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 0.8 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 0.8 }]}>-</Text>
            <Text style={[styles.tableCell, { flex: 0.8 }]}>-</Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 10,
            marginBottom: 10,
          }}
        >
          <Text style={styles.paragraph}>Dont TTC € __________</Text>
          <Text style={styles.paragraph}>□</Text>
        </View>

        <Text style={styles.paragraphSmall}>
          * Le montant forfaitaire est révisable selon le chiffre d'affaires HT
          et l'indice national (BT01), les honoraires ENCYCLIE ASSURANCES, les
          taxes accessoires et la PJ.
        </Text>

        <Text style={[styles.sectionHeader, { marginTop: 15 }]}>
          MODALITES DE GESTION
        </Text>

        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>
            1) Les pièces à joindre :
          </Text>
          <Text style={styles.paragraph}>
            Cette offre est valable sous condition de la remise des éléments
            cités ci-dessous :
          </Text>
          <View
            style={{
              border: "1px solid #d1d5db",
              padding: 15,
              backgroundColor: "#f9fafb",
              minHeight: 60,
            }}
          >
            {selectedDocuments && selectedDocuments.length > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 0,
                }}
              >
                {selectedDocuments.map((document, idx) => (
                  <Text style={styles.paragraphSmall}> - {document}</Text>
                ))}
              </View>
            ) : (
              <Text
                style={[
                  styles.paragraphSmall,
                  { color: "#6b7280", fontStyle: "italic", fontSize: 7 },
                ]}
              >
                (Aucune pièce justificative sélectionnée)
              </Text>
            )}
          </View>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>
            2) Les modalités de règlement :
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Périodicité de règlement: {formData.periodicity || "N/A"}
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Nombre d'échéances pour la reprise du passé si incluse :
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.subsectionHeader, { color: "#1e40af" }]}>
          Vos assureurs :
        </Text>

        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              <Text style={{ fontWeight: "bold" }}>FIDELIDADE :</Text>{" "}
              FIDELIDADE, succursale française de la société FIDELIDADE
              Companhia de Seguros, S.A, société anonyme de droit portugais, au
              capital de 150 000 000 euros, dont le siège social est situé Av.
              da Boavista, 1269-076 Lisboa, Portugal, immatriculée au Registre
              du commerce de Lisbonne sous le numéro 500 276 280, établissement
              principal en France situé 12-14, rond-point des Champs-Élysées
              75008 Paris, immatriculée au RCS Paris sous le numéro 422 443 128.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              <Text style={{ fontWeight: "bold" }}>Cfdp Assurances :</Text> Cfdp
              Assurances, société anonyme au capital de 3 000 000 euros, dont le
              siège social est situé 43 avenue du Général de Gaulle 69006 Lyon,
              immatriculée au RCS Lyon sous le numéro 414 233 723, régie par le
              code des assurances.
            </Text>
          </View>
        </View>

        <Text style={[styles.subsectionHeader, { color: "#1e40af" }]}>
          VOS DÉCLARATIONS :
        </Text>

        <Text style={styles.paragraph}>Le souscripteur déclare :</Text>
        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Ne pas intervenir sur des ouvrages exceptionnels ou inhabituels.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Que les travaux de construction seront effectués avec des
              matériaux et procédés courants.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Ne pas contracter pour la conception, direction ou surveillance de
              travaux en qualité de maître d'ouvrage ou de sous-traitant.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Ne pas avoir exercé sans assurance Responsabilité Civile Décennale
              au cours des 10 dernières années.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Ne pas avoir déclaré de sinistre au cours des 36 derniers mois, ni
              aucun sinistre sans suite au cours de cette période.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Ne pas agir en qualité de "constructeur de maison individuelle"
              (réalisation complète d'un ouvrage, conception et réalisation).
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Ne pas vendre exclusivement des produits de construction au sens
              de l'article 1792-4 du Code civil.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Ne pas exercer d'activité de "négoce de matériaux" dépassant 15%
              de son chiffre d'affaires.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Ne pas agir en qualité de "constructeur de maison individuelle"
              (avec ou sans plans, au sens de la loi n°90-1129 du 19 décembre
              1990) ou d'activités similaires (construction de corps de bâtiment
              et de couverture sur un même site).
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Ne pas exercer d'activité de conception, direction ou surveillance
              de travaux.
            </Text>
          </View>
        </View>
      </Page>

      {/* Page 5 - Conditions et déclarations finales */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionHeader}>CONDITIONS ET DÉCLARATIONS</Text>

        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>
            Conditions :
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Les sous-traitants doivent être assurés en Responsabilité Civile
                Décennale avec capitalisation de prime.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Le chiffre d'affaires de l'activité principale doit représenter
                au minimum 30% du chiffre d'affaires hors taxes de l'entreprise.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Le chiffre d'affaires annuel doit être ≤ 500 000€, ou ≤ 70 000€
                pour les auto-entrepreneurs.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Les travaux doivent être réalisés en Martinique, Guadeloupe,
                Guyane, St Barthélemy, Saint Martin, La Réunion, Mayotte (hors
                métropole).
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Pour les travaux soumis à l'assurance obligatoire : montant du
                projet ≤ 500 000€, et coût total de construction (tous corps
                d'état, y compris honoraires) ≤ 15 000 000€.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Pour les travaux non soumis à l'assurance obligatoire : montant
                du projet ≤ 350 000€, et coût total de construction (tous corps
                d'état, y compris honoraires) ≤ 1 000 000€.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>
            Déclarations du souscripteur :
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Le souscripteur certifie ne pas avoir connaissance d'événements,
                de faits ou de sinistres non déclarés susceptibles d'engager sa
                responsabilité.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Le souscripteur certifie que les renseignements fournis dans la
                demande de proposition sont sincères, exacts et complets et
                constituent un élément essentiel du contrat.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>
            Conséquences en cas de fausse déclaration :
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={{ fontWeight: "bold" }}>
                  Dissimulation volontaire / Fausse déclaration :
                </Text>{" "}
                Peut entraîner la nullité du contrat (Art. L.113-8 du Code des
                Assurances).
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={{ fontWeight: "bold" }}>
                  Omission / Déclaration inexacte :
                </Text>{" "}
                Peut entraîner une majoration de prime, la résiliation du
                contrat ou une réduction des indemnités en cas de sinistre (Art.
                L.113-9 du Code des Assurances).
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeader}>
          PROTECTION DES DONNÉES PERSONNELLES (RGPD)
        </Text>

        <Text style={styles.paragraphSmall}>
          Les données à caractère personnel (DCP) collectées par ENCYCLIE sont
          traitées aux fins de conclusion, d'exécution et de gestion du contrat
          d'assurance pour l'assuré et les bénéficiaires, avant et après
          souscription.
        </Text>

        <Text style={styles.paragraphSmall}>
          Les DCP sont destinées aux services autorisés d'ENCYCLIE et peuvent
          être transmises à nos partenaires contractuels pour la gestion du
          contrat et aux réassureurs. Elles ne seront pas utilisées à d'autres
          fins ni communiquées à d'autres organismes sans votre consentement
          exprès, libre et éclairé.
        </Text>

        <Text style={styles.paragraphSmall}>
          Les données sont conservées par ENCYCLIE en tant que responsable de
          traitement, dans le respect des durées de conservation réglementaires
          et sans excéder la durée nécessaire aux finalités pour lesquelles
          elles sont collectées.
        </Text>

        <Text style={styles.paragraphSmall}>
          Les DCP peuvent être transférées hors de l'Espace économique européen,
          dans le respect de la réglementation en vigueur afin d'assurer un
          niveau de sécurité et de protection de la vie privée et des droits
          fondamentaux adéquat.
        </Text>

        <Text style={styles.paragraphSmall}>
          Conformément au RGPD et à la loi française relative à la protection
          des données, l'assuré et les bénéficiaires disposent d'un droit
          d'accès, de rectification, d'effacement, de portabilité des données et
          d'opposition pour des motifs légitimes (incluant le
          traitement/profilage automatisé), de limitation du traitement et de
          décider du sort de leurs données après leur décès. Pour exercer ces
          droits, contactez : ENCYCLIE DONNÉES PERSONNELLES, 42 RUE NOTRE-DAME
          DES VICTOIRES 75002 PARIS, Email:
          souscriptionRCD@encyclie-construction.com
        </Text>

        <Text style={styles.sectionHeader}>
          BASE DE L'OFFRE ET DOCUMENTS RÉFÉRENCÉS
        </Text>

        <Text style={styles.paragraphSmall}>
          L'offre RCD DROM-COM est établie sur la base des éléments du
          questionnaire transmis par le proposant à son intermédiaire. Le
          proposant est responsable de l'exactitude de ces renseignements.
        </Text>

        <Text style={styles.paragraph}>
          Le devis comprend les références aux documents suivants :
        </Text>
        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Conditions Générales : ENCYCLIE BAT-CG_FIDELIDADE_01_05_2025
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Document d'Information sur le Produit d'Assurance (DIPA)
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              Nomenclature des activités souscrites avec Encyclie BAT
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>
              CG PJ COMPLEMENT RCD-8178-122021
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Document généré le {formatDate(new Date().toISOString())}
          </Text>
          <Text style={styles.footerText}>
            Ceci est une prévisualisation et n'a pas de valeur contractuelle
            sans signature.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default OfferLetterPDF;
