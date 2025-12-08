import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
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

    lineHeight: 1.5,
  },
  pricingTable: {
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1px solid #000000",
    paddingBottom: 2,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 1.2,
  },
  tableRow: {
    flexDirection: "row",
    marginBottom: 1,
    fontSize: 7,
    lineHeight: 1.2,
  },
  tableCell: {
    paddingVertical: 1,
  },
  tableCellDescription: {
    flex: 2,
    paddingRight: 3,
  },
  tableCellAmount: {
    flex: 1,
    textAlign: "right",
    paddingLeft: 3,
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
    marginBottom: 2,
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
  baseUrl?: string;
}

const LetterOfIntentPDF: React.FC<LetterOfIntentPDFProps> = ({
  quote,
  calculationResult,
  user,
  baseUrl,
}) => {
  const logoSrc = `${baseUrl ? baseUrl : ""}/couleur_1.png`;
  const PageFooter = () => (
    <View
      style={{
        fontSize: 6,
        color: "#374151",
        textAlign: "center",
        lineHeight: 1.3,
        paddingTop: 8,
        borderTop: "1px solid #d1d5db",
        marginBottom: 20,
        marginTop: 20,
      }}
    >
      <Text style={{ fontSize: 6, color: "#374151", marginBottom: 2 }}>
        Distribué et géré par :
      </Text>
      <Text style={{ fontSize: 6, color: "#374151", marginBottom: 2 }}>
        ENCYCLIE CONSTRUCTION – 42 Rue Notre-Dame des Victoire, 75002 PARIS -
        SAS au capital de 1 000 € - SIREN 897 796 785 – RCS ST NAZAIRE – N°
        ORIAS : 21 004 564 –
      </Text>
      <Text style={{ fontSize: 6, color: "#374151", marginBottom: 2 }}>
        www.orias.fr – Sous le contrôle de l'ACPR, Autorité de Contrôle
        Prudentiel et de Résolution – 4 Place de Budapest, CS 92459, 75436 PARIS
        CEDEX 09 – acpr.banque-france.fr –
      </Text>
      <Text style={{ fontSize: 6, color: "#374151", marginBottom: 2 }}>
        Assurance de Responsabilité Civile Professionnelle et Garantie
        Financière conformes au Code des assurances.
      </Text>
    </View>
  );
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

  // Fonction qui transforme une date format français (JJ/MM/AAAA) en date anglaise (YYYY-MM-DD)
  function frenchToEnglishDate(frenchDate: string): string {
    // gestion des formats JJ/MM/AAAA ou J/M/AAAA
    const parts = frenchDate.split("/");
    if (parts.length !== 3) return frenchDate;
    // Pad month and day if needed
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
    return `${year}-${month}-${day}`;
  }

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

  // Fonction pour extraire l'année de la date de début (format JJ/MM/AAAA)
  const getYearFromDate = (dateString: string): number | null => {
    if (!dateString) return null;
    const parts = dateString.split("/");
    if (parts.length === 3) {
      const year = parseInt(parts[2], 10);
      return isNaN(year) ? null : year;
    }
    // Si le format n'est pas JJ/MM/AAAA, essayer de parser comme date
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date.getFullYear();
    } catch {
      return null;
    }
  };

  // Séparer les échéances par année (selon la date de début)
  const echeances2025 =
    calculationResult?.echeancier?.echeances?.filter(
      (echeance: any) => getYearFromDate(echeance.date) === 2025
    ) || [];
  const echeances2026 =
    calculationResult?.echeancier?.echeances?.filter(
      (echeance: any) => getYearFromDate(echeance.date) === 2026
    ) || [];

  // Fonction helper pour calculer les totaux d'un tableau d'échéances
  const calculateTotals = (echeances: any[]) => {
    return {
      rcd: echeances.reduce((sum, e) => sum + (e.rcd || 0), 0),
      pj: echeances.reduce((sum, e) => sum + (e.pj || 0), 0),
      frais: echeances.reduce((sum, e) => sum + (e.frais || 0), 0),
      fraisGestion: echeances.reduce(
        (sum, e) => sum + (e.fraisGestion || 0),
        0
      ),
      reprise: echeances.reduce((sum, e) => sum + (e.reprise || 0), 0),
      totalHT: echeances.reduce((sum, e) => sum + (e.totalHT || 0), 0),
      taxe: echeances.reduce((sum, e) => sum + (e.taxe || 0), 0),
      totalTTC: echeances.reduce((sum, e) => sum + (e.totalTTC || 0), 0),
    };
  };

  // Composant pour le tableau d'échéancier
  const renderScheduleTable = (echeances: any[], year: number) => {
    if (echeances.length === 0) return null;
    const totals = calculateTotals(echeances);

    return (
      <View style={styles.scheduleSection}>
        <Text style={styles.scheduleTitle}>
          Échéancier de paiement détaillé {year}
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
          {echeances.map((echeance: any, index: number) => (
            <View key={index} style={styles.scheduleTableRow}>
              <Text
                style={[styles.scheduleTableCell, styles.scheduleTableCellDate]}
              >
                {echeance.date}
              </Text>
              <Text
                style={[styles.scheduleTableCell, styles.scheduleTableCellDate]}
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
              style={[styles.scheduleTableCell, styles.scheduleTableCellAmount]}
            >
              {financial(totals.rcd)} €
            </Text>
            <Text
              style={[styles.scheduleTableCell, styles.scheduleTableCellAmount]}
            >
              {financial(totals.pj)} €
            </Text>
            <Text
              style={[styles.scheduleTableCell, styles.scheduleTableCellAmount]}
            >
              {financial(totals.frais)} €
            </Text>
            <Text
              style={[styles.scheduleTableCell, styles.scheduleTableCellAmount]}
            >
              {financial(totals.fraisGestion)} €
            </Text>
            <Text
              style={[styles.scheduleTableCell, styles.scheduleTableCellAmount]}
            >
              {financial(totals.reprise)} €
            </Text>
            <Text
              style={[styles.scheduleTableCell, styles.scheduleTableCellAmount]}
            >
              {financial(totals.totalHT)} €
            </Text>
            <Text
              style={[styles.scheduleTableCell, styles.scheduleTableCellAmount]}
            >
              {financial(totals.taxe)} €
            </Text>
            <Text
              style={[styles.scheduleTableCell, styles.scheduleTableCellAmount]}
            >
              {financial(totals.totalTTC)} €
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Composant pour le tableau de tarification
  const renderPricingTable = (echeances: any[], year: number) => {
    if (echeances.length === 0) return null;
    const totals = calculateTotals(echeances);
    // Calculs selon la logique originale : rcd n'inclut pas la taxe
    const rcdHT = totals.rcd - totals.taxe;
    const rcdTTC = totals.rcd + totals.taxe;
    const pjTaxe = totals.pj * getTaxeByRegion(quote?.formData?.territory);
    const pjTTC = totals.pj * (1 + getTaxeByRegion(quote?.formData?.territory));
    const rcdPjHT = totals.rcd + totals.pj;
    const rcdPjTTC = rcdPjHT + totals.taxe;
    const rcdPjFraisGestionHT =
      totals.rcd + totals.pj + totals.fraisGestion - totals.taxe;
    const rcdPjFraisGestionTTC = totals.rcd + totals.pj + totals.fraisGestion;
    const primeTotaleHT =
      totals.rcd +
      totals.pj +
      totals.fraisGestion +
      totals.reprise -
      totals.taxe +
      (Number(quote?.formData?.honoraireCourtier) || 0);
    const primeTotaleTTC = totals.totalTTC;

    return (
      <View style={styles.pricingTable}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}></Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
            Montants H.T
          </Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
            Montants Taxes
          </Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Montant TTC</Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellDescription]}>
            PRIMES pour la période du{" "}
            {formatDate(frenchToEnglishDate(echeances[0]?.date || ""))} au{" "}
            {formatDate(
              frenchToEnglishDate(
                echeances[echeances.length - 1]?.finPeriode || ""
              )
            )}
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
            {financial(rcdHT) || ""} €
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(totals.taxe) || ""} €
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(rcdTTC) || ""} €
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellDescription]}>
            Prime Protection Juridique
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(totals.pj) || ""} €
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(pjTaxe) || ""} €
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(pjTTC) || ""} €
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellDescription]}>
            Montant total RCD + PJ
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(rcdPjHT) || ""} €
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(totals.taxe) || ""} €
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(rcdPjTTC) || ""} €
          </Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellDescription]}>
            Honoraire de gestion
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(totals.fraisGestion) || ""} €
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}></Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}></Text>
        </View>

        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellDescription]}>
            Montant RCD +PJ+ Frais gestion
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(rcdPjFraisGestionHT) || ""} €
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(totals.taxe) || ""} €
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(rcdPjFraisGestionTTC) || ""} €
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
            {financial(primeTotaleHT) || ""} €
          </Text>
          <Text style={[styles.tableCell, styles.tableCellAmount]}>
            {financial(totals.taxe) || ""} €
          </Text>
          <Text
            style={[
              styles.tableCell,
              styles.tableCellAmount,
              { fontWeight: "bold" },
            ]}
          >
            {financial(primeTotaleTTC) || ""} €
          </Text>
        </View>
      </View>
    );
  };

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
            <Image src={logoSrc} style={{ width: 80, height: 40 }} />
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
              {quote?.formData?.chiffreAffaires || "________________"} €
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

        {/* Échéancier détaillé - 2025 */}
        <PageFooter />

        {/* Tableau de tarification - 2025 */}
        <div style={{ marginTop: 80 }}>
          {renderPricingTable(echeances2025, 2025)}

          {/* Tableau de tarification - 2026 */}
          {renderPricingTable(echeances2026, 2026)}
          {renderScheduleTable(echeances2025, 2025)}

          {/* Échéancier détaillé - 2026 */}
          {renderScheduleTable(echeances2026, 2026)}
        </div>

        {/* Pied de page */}

        <PageFooter />
      </Page>
    </Document>
  );
};

export default LetterOfIntentPDF;
