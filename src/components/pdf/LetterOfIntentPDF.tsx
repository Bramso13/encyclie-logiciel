import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import Image from "next/image";
import { getTaxeByRegion, tableauTax } from "@/lib/tarificateurs/rcd";

// Définir les styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontSize: 11,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  validity: {
    fontSize: 10,
    color: "#000000",
    fontWeight: "bold",
  },
  logoSection: {
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 40,
    backgroundColor: "#4A90E2",
    marginBottom: 5,
  },
  companyName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 2,
  },
  dateLocation: {
    fontSize: 10,
    color: "#000000",
  },
  recipient: {
    marginBottom: 15,
  },
  recipientLabel: {
    fontSize: 11,
    color: "#000000",
    marginBottom: 5,
  },
  subject: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 10,
  },
  rcDecennale: {
    color: "#FF0000",
  },
  salutation: {
    fontSize: 11,
    marginBottom: 10,
  },
  acknowledgment: {
    fontSize: 11,
    marginBottom: 20,
  },
  companyInfo: {
    marginBottom: 15,
  },
  infoField: {
    flexDirection: "row",
    marginBottom: 3,
    fontSize: 11,
  },
  fieldLabel: {
    fontWeight: "bold",
    marginRight: 5,
  },
  fieldValue: {
    flex: 1,
  },
  workforce: {
    fontSize: 11,
    marginBottom: 3,
  },
  experienceSection: {
    marginBottom: 20,
  },
  experienceTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },
  experienceOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  experienceOption: {
    flexDirection: "row",
    alignItems: "center",
    width: "50%",
    marginBottom: 5,
    fontSize: 11,
  },
  checkbox: {
    width: 12,
    height: 12,
    border: "1px solid #000000",
    marginRight: 8,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#000000",
  },
  introParagraph: {
    fontSize: 11,
    textAlign: "justify",
    marginBottom: 20,
    lineHeight: 1.5,
  },
  pricingTable: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1px solid #000000",
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    marginBottom: 3,
    fontSize: 10,
  },
  tableCell: {
    paddingVertical: 2,
  },
  tableCellDescription: {
    flex: 2,
    paddingRight: 5,
  },
  tableCellAmount: {
    flex: 1,
    textAlign: "right",
    paddingLeft: 5,
  },
  footer: {
    marginTop: 30,
    fontSize: 9,
    color: "#000000",
    textAlign: "justify",
    lineHeight: 1.3,
  },
  activitiesSection: {
    marginBottom: 20,
  },
  activitiesTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },
  activitiesTable: {
    marginBottom: 15,
  },
  activitiesTableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottom: "1px solid #D1D5DB",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  activitiesTableHeaderCell: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "left",
  },
  activitiesTableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #E5E7EB",
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  activitiesTableCell: {
    fontSize: 9,
    paddingVertical: 2,
  },
  activitiesTableCellActivity: {
    flex: 2,
    paddingRight: 5,
  },
  activitiesTableCellCode: {
    flex: 1,
    paddingRight: 5,
  },
  activitiesTableCellPercent: {
    flex: 1,
    textAlign: "right",
  },
  scheduleSection: {
    marginBottom: 20,
  },
  scheduleTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },
  scheduleTable: {
    marginBottom: 15,
  },
  scheduleTableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottom: "1px solid #D1D5DB",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  scheduleTableHeaderCell: {
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "left",
  },
  scheduleTableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #E5E7EB",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  scheduleTableCell: {
    fontSize: 8,
    paddingVertical: 1,
  },
  scheduleTableCellDate: {
    flex: 1.2,
    paddingRight: 2,
  },
  scheduleTableCellAmount: {
    flex: 1,
    textAlign: "right",
    paddingLeft: 2,
  },
  scheduleTableFooter: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderTop: "1px solid #D1D5DB",
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontWeight: "bold",
  },
});

interface LetterOfIntentPDFProps {
  quote: any;
  calculationResult: any;
  user: any;
}

const LetterOfIntentPDF: React.FC<LetterOfIntentPDFProps> = ({
  quote,
  calculationResult,
  user,
}) => {
  // Fonction pour déterminer quelle case d'expérience cocher
  const getExperienceCheckbox = (experienceValue: string) => {
    const experience = parseFloat(quote?.formData?.experienceMetier || "0");
    switch (experienceValue) {
      case "moins_1_an":
        return experience < 1;
      case "1_3_ans":
        return experience >= 1 && experience < 3;
      case "3_5_ans":
        return experience >= 3 && experience < 5;
      case "plus_5_ans":
        return experience >= 5;
      default:
        return false;
    }
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("fr-FR");
    } catch {
      return dateString;
    }
  };

  function financial(x: number) {
    if (x === undefined || x === null) return "";
    return x.toFixed(2);
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête avec validité et logo */}
        <View style={styles.header}>
          <View style={{ flexDirection: "column" }}>
            <Text style={styles.validity}>
              {new Date().toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </Text>
            <Text style={styles.validity}>Nom du courtier : {user?.name}</Text>
            <Text style={styles.validity}>
              Code du courtier : {user?.brokerCode}
            </Text>
          </View>
          <View style={styles.logoSection}>
            <img
              src="/couleur_1.png"
              alt="ENCYCLIE CONSTRUCTION"
              width={80}
              height={40}
            />
            <Text style={styles.companyName}>ENCYCLIE CONSTRUCTION</Text>
          </View>
        </View>

        {/* Destinataire */}
        <View style={styles.recipient}>
          <Text style={styles.recipientLabel}>
            A l'attention de {quote?.formData?.directorName || "XXX"}
          </Text>
        </View>

        {/* Objet */}
        <Text style={styles.subject}>
          Objet: Indication tarifaire RC Décennale
        </Text>

        {/* Salutation */}
        <Text style={styles.salutation}>Cher Monsieur, Madame,</Text>

        {/* Accusé de réception */}
        <Text style={styles.acknowledgment}>
          Nous accusons réception de votre demande et nous vous remercions:
        </Text>

        {/* Informations entreprise */}
        <View style={styles.companyInfo}>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>
              Nom de la société / Raison sociale :
            </Text>
            <Text style={styles.fieldValue}>
              {quote?.formData?.companyName ||
                quote?.companyData?.companyName ||
                "________________"}
            </Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Forme juridique :</Text>
            <Text style={styles.fieldValue}>
              {quote?.formData?.legalForm ||
                quote?.companyData?.legalForm ||
                "________________"}
            </Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>
              Nom & Prénom du ou des dirigeants :
            </Text>
            <Text style={styles.fieldValue}>
              {quote?.formData?.directorName || "________________"}
            </Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Rue du siège social :</Text>
            <Text style={styles.fieldValue}>
              {quote?.formData?.address ||
                quote?.companyData?.address ||
                "________________"}
            </Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>CP Ville du siège social :</Text>
            <Text style={styles.fieldValue}>
              {quote?.formData?.postalCode + quote?.formData?.city ||
                "________________"}
            </Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>N° SIRET</Text>
            <Text style={styles.fieldValue}>
              {quote?.formData?.siret ||
                quote?.companyData?.siret ||
                "________________"}
            </Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Chiffre d'affaires :</Text>
            <Text style={styles.fieldValue}>
              {financial(calculationResult?.caCalculee) ||
                quote?.formData?.chiffreAffaires ||
                "________________"}{" "}
              €
            </Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Date d'effet :</Text>
            <Text style={styles.fieldValue}>
              {formatDate(quote?.formData?.dateDeffet) || "________________"}
            </Text>
          </View>
          <Text style={styles.workforce}>
            Effectif y compris le chef d'entreprise :{" "}
            {quote?.formData?.nombreSalaries || "xxx"} personnes
          </Text>
          <Text style={styles.workforce}>
            Date de création de l'entreprise :{" "}
            {formatDate(
              quote?.formData?.companyCreationDate ||
                quote?.companyData?.creationDate
            ) || "xxx"}
          </Text>
        </View>

        {/* Activités professionnelles */}
        <View style={styles.activitiesSection}>
          <Text style={styles.activitiesTitle}>
            Activités professionnelles :
          </Text>
          <View style={styles.activitiesTable}>
            <View style={styles.activitiesTableHeader}>
              <Text style={[styles.activitiesTableHeaderCell, { flex: 2 }]}>
                Activité
              </Text>
              <Text style={[styles.activitiesTableHeaderCell, { flex: 1 }]}>
                Code
              </Text>
              <Text style={[styles.activitiesTableHeaderCell, { flex: 1 }]}>
                Part CA (%)
              </Text>
            </View>
            {quote?.formData?.activities &&
            quote.formData.activities.length > 0 ? (
              quote.formData.activities.map((activity: any, idx: number) => (
                <View key={idx} style={styles.activitiesTableRow}>
                  <Text
                    style={[
                      styles.activitiesTableCell,
                      styles.activitiesTableCellActivity,
                    ]}
                  >
                    {tableauTax.find(
                      (tax) => tax.code.toString() === activity.code
                    )?.title || "—"}
                  </Text>
                  <Text
                    style={[
                      styles.activitiesTableCell,
                      styles.activitiesTableCellCode,
                    ]}
                  >
                    {activity.code || "—"}
                  </Text>
                  <Text
                    style={[
                      styles.activitiesTableCell,
                      styles.activitiesTableCellPercent,
                    ]}
                  >
                    {activity.caSharePercent || "—"} %
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.activitiesTableRow}>
                <Text style={[styles.activitiesTableCell, { flex: 4 }]}>
                  ________________
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Paragraphe d'introduction */}
        <Text style={styles.introParagraph}>
          Nous sommes en mesure de vous confirmer notre intérêt pour vos projets
          suite à une étude préliminaire, et votre demande d'une approche
          tarifaire sera examinée, sous réserves du dossier complet et sous
          réserves de la validation par la Compagnie à laquelle le projet sera
          soumis, notre proposition tarifaire indicative est de :
        </Text>

        {/* Échéancier détaillé */}
        {calculationResult?.echeancier?.echeances &&
          calculationResult.echeancier.echeances.length > 0 && (
            <View style={styles.scheduleSection}>
              <Text style={styles.scheduleTitle}>
                Échéancier de paiement détaillé
              </Text>
              <View style={styles.scheduleTable}>
                <View style={styles.scheduleTableHeader}>
                  <Text style={[styles.scheduleTableHeaderCell, { flex: 1.2 }]}>
                    Début période
                  </Text>
                  <Text style={[styles.scheduleTableHeaderCell, { flex: 1.2 }]}>
                    Fin période
                  </Text>
                  <Text style={[styles.scheduleTableHeaderCell, { flex: 1 }]}>
                    RCD HT
                  </Text>
                  <Text style={[styles.scheduleTableHeaderCell, { flex: 1 }]}>
                    PJ HT
                  </Text>
                  <Text style={[styles.scheduleTableHeaderCell, { flex: 1 }]}>
                    Frais HT
                  </Text>
                  <Text style={[styles.scheduleTableHeaderCell, { flex: 1 }]}>
                    Frais Gestion HT
                  </Text>
                  <Text style={[styles.scheduleTableHeaderCell, { flex: 1 }]}>
                    Reprise HT
                  </Text>
                  <Text style={[styles.scheduleTableHeaderCell, { flex: 1 }]}>
                    Total HT
                  </Text>
                  <Text style={[styles.scheduleTableHeaderCell, { flex: 1 }]}>
                    Taxe
                  </Text>
                  <Text style={[styles.scheduleTableHeaderCell, { flex: 1 }]}>
                    Total TTC
                  </Text>
                </View>
                {calculationResult.echeancier.echeances
                  .filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .map((echeance: any, index: number) => (
                    <View key={index} style={styles.scheduleTableRow}>
                      <Text
                        style={[
                          styles.scheduleTableCell,
                          styles.scheduleTableCellDate,
                        ]}
                      >
                        {echeance.date}
                      </Text>
                      <Text
                        style={[
                          styles.scheduleTableCell,
                          styles.scheduleTableCellDate,
                        ]}
                      >
                        {echeance.finPeriode}
                      </Text>
                      <Text
                        style={[
                          styles.scheduleTableCell,
                          styles.scheduleTableCellAmount,
                        ]}
                      >
                        {financial(echeance.rcd) || "0"} €
                      </Text>
                      <Text
                        style={[
                          styles.scheduleTableCell,
                          styles.scheduleTableCellAmount,
                        ]}
                      >
                        {financial(echeance.pj) || "0"} €
                      </Text>
                      <Text
                        style={[
                          styles.scheduleTableCell,
                          styles.scheduleTableCellAmount,
                        ]}
                      >
                        {financial(echeance.frais) || "0"} €
                      </Text>
                      <Text
                        style={[
                          styles.scheduleTableCell,
                          styles.scheduleTableCellAmount,
                        ]}
                      >
                        {financial(echeance.fraisGestion) || "0"} €
                      </Text>
                      <Text
                        style={[
                          styles.scheduleTableCell,
                          styles.scheduleTableCellAmount,
                        ]}
                      >
                        {financial(echeance.reprise) || "0"} €
                      </Text>
                      <Text
                        style={[
                          styles.scheduleTableCell,
                          styles.scheduleTableCellAmount,
                        ]}
                      >
                        {financial(echeance.totalHT) || "0"} €
                      </Text>
                      <Text
                        style={[
                          styles.scheduleTableCell,
                          styles.scheduleTableCellAmount,
                        ]}
                      >
                        {financial(echeance.taxe) || "0"} €
                      </Text>
                      <Text
                        style={[
                          styles.scheduleTableCell,
                          styles.scheduleTableCellAmount,
                        ]}
                      >
                        {financial(echeance.totalTTC) || "0"} €
                      </Text>
                    </View>
                  ))}
                {/* Ligne de totaux */}
                <View style={styles.scheduleTableFooter}>
                  <Text style={[styles.scheduleTableCell, { flex: 2.4 }]}>
                    TOTAUX
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTableCell,
                      styles.scheduleTableCellAmount,
                    ]}
                  >
                    {financial(
                      calculationResult.echeancier.echeances
                        .filter(
                          (echeance: any) =>
                            new Date(echeance.date).getFullYear() ===
                            new Date().getFullYear()
                        )
                        .reduce(
                          (sum: number, echeance: any) =>
                            sum + (echeance.rcd || 0),
                          0
                        )
                    )}{" "}
                    €
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTableCell,
                      styles.scheduleTableCellAmount,
                    ]}
                  >
                    {financial(
                      calculationResult.echeancier.echeances
                        .filter(
                          (echeance: any) =>
                            new Date(echeance.date).getFullYear() ===
                            new Date().getFullYear()
                        )
                        .reduce(
                          (sum: number, echeance: any) =>
                            sum + (echeance.pj || 0),
                          0
                        )
                    )}{" "}
                    €
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTableCell,
                      styles.scheduleTableCellAmount,
                    ]}
                  >
                    {financial(
                      calculationResult.echeancier.echeances
                        .filter(
                          (echeance: any) =>
                            new Date(echeance.date).getFullYear() ===
                            new Date().getFullYear()
                        )
                        .reduce(
                          (sum: number, echeance: any) =>
                            sum + (echeance.frais || 0),
                          0
                        )
                    )}{" "}
                    €
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTableCell,
                      styles.scheduleTableCellAmount,
                    ]}
                  >
                    {financial(
                      calculationResult.echeancier.echeances
                        .filter(
                          (echeance: any) =>
                            new Date(echeance.date).getFullYear() ===
                            new Date().getFullYear()
                        )
                        .reduce(
                          (sum: number, echeance: any) =>
                            sum + (echeance.fraisGestion || 0),
                          0
                        )
                    )}{" "}
                    €
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTableCell,
                      styles.scheduleTableCellAmount,
                    ]}
                  >
                    {financial(
                      calculationResult.echeancier.echeances
                        .filter(
                          (echeance: any) =>
                            new Date(echeance.date).getFullYear() ===
                            new Date().getFullYear()
                        )
                        .reduce(
                          (sum: number, echeance: any) =>
                            sum + (echeance.reprise || 0),
                          0
                        )
                    )}{" "}
                    €
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTableCell,
                      styles.scheduleTableCellAmount,
                    ]}
                  >
                    {financial(
                      calculationResult.echeancier.echeances
                        .filter(
                          (echeance: any) =>
                            new Date(echeance.date).getFullYear() ===
                            new Date().getFullYear()
                        )
                        .reduce(
                          (sum: number, echeance: any) =>
                            sum + (echeance.totalHT || 0),
                          0
                        )
                    )}{" "}
                    €
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTableCell,
                      styles.scheduleTableCellAmount,
                    ]}
                  >
                    {financial(
                      calculationResult.echeancier.echeances
                        .filter(
                          (echeance: any) =>
                            new Date(echeance.date).getFullYear() ===
                            new Date().getFullYear()
                        )
                        .reduce(
                          (sum: number, echeance: any) =>
                            sum + (echeance.taxe || 0),
                          0
                        )
                    )}{" "}
                    €
                  </Text>
                  <Text
                    style={[
                      styles.scheduleTableCell,
                      styles.scheduleTableCellAmount,
                    ]}
                  >
                    {financial(
                      calculationResult.echeancier.echeances
                        .filter(
                          (echeance: any) =>
                            new Date(echeance.date).getFullYear() ===
                            new Date().getFullYear()
                        )
                        .reduce(
                          (sum: number, echeance: any) =>
                            sum + (echeance.totalTTC || 0),
                          0
                        )
                    )}{" "}
                    €
                  </Text>
                </View>
              </View>
            </View>
          )}

        {/* Tableau de tarification */}
        <View style={styles.pricingTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}></Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
              Montants H.T
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
              Montants Taxes
            </Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
              Montant TTC
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCellDescription]}>
              PRIMES année en cours pour la période du au
            </Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}></Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}></Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}></Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCellDescription]}>
              Prime RCD provisionnelle hors reprise du passé
            </Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
              {financial(
                calculationResult?.echeancier?.echeances
                  ?.filter(
                    (echeance: any) =>
                      new Date(echeance.date).getFullYear() ===
                      new Date().getFullYear()
                  )
                  .reduce(
                    (sum: number, echeance: any) =>
                      sum + (echeance.rcd || 0) + (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCellDescription]}>
              Prime Protection Juridique
            </Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
            <Text style={[styles.tableCell, styles.tableCellDescription]}>
              Montant total RCD + PJ
            </Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
                      (echeance.taxe || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCellDescription]}>
              Honoraire de gestion
            </Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
            <Text style={[styles.tableCell, styles.tableCellAmount]}></Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}></Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCellDescription]}>
              Montant RCD +PJ+ Frais gestion
            </Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
            <Text style={[styles.tableCell, styles.tableCellDescription]}>
              Honoraires de courtage :
            </Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}></Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}></Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
              {quote?.formData?.honoraireCourtier || "________________"} €
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableCellDescription]}>
              Prime totale à régler
            </Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
                      (echeance.taxe || 0) +
                      (Number(quote?.formData?.honoraireCourtier) || 0),
                    0
                  )
              ) || ""}{" "}
              €
            </Text>
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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
            <Text style={[styles.tableCell, styles.tableCellAmount]}>
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

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text>
            ENCYCLIE CONSTRUCTION - 42 Rue Notre-Dame des Victoire, 75002 PARIS
            - SAS au capital de 1 000 € - SIREN 897 796 785 - RCS ST NAZAIRE -
            N° ORIAS : 21 004 564 - www.orias.fr - Sous le contrôle de l'ACPR,
            Autorité de Contrôle Prudentiel et de Résolution - 4 Place de
            Budapest, CS 92459, 75436 PARIS CEDEX 09 - acpr.banque-france.fr -
            Assurance de Responsabilité Civile Professionnelle et Garantie
            Financière conformes au Code des assurances.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default LetterOfIntentPDF;
