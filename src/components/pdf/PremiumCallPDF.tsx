import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// Définir les styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 40,
    fontSize: 12,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 10,
  },
  introduction: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 20,
  },
  periodBox: {
    backgroundColor: "#F39200",
    border: "2px solid #C36C0B",
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
    marginBottom: 10,
  },
  periodDates: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  periodDate: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
  },
  periodSeparator: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
    marginHorizontal: 15,
  },
  summaryBox: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#1f2937",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: {
    flex: 1,
    textAlign: "center",
  },
  summaryLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4f46e5",
  },
  tableTitle: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#1f2937",
  },
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F39200",
    borderBottom: "1px solid #C36C0B",
  },
  tableHeaderCell: {
    flex: 1,
    padding: 2,
    fontSize: 6,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "center",
    borderRight: "1px solid #C36C0B",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e7eb",
  },
  tableCell: {
    flex: 1,
    padding: 2,
    fontSize: 6,
    color: "#374151",
    textAlign: "center",
    borderRight: "1px solid #e5e7eb",
  },
  tableCellLeft: {
    textAlign: "left",
  },
  tableCellRight: {
    textAlign: "right",
  },
  tableCellBold: {
    fontWeight: "bold",
  },
  detailGrid: {
    flexDirection: "row",
    marginBottom: 20,
  },
  detailColumn: {
    flex: 1,
    marginRight: 10,
  },
  detailTable: {
    marginBottom: 10,
  },
  detailHeader: {
    flexDirection: "row",
    backgroundColor: "#F39200",
    borderBottom: "1px solid #C36C0B",
  },
  detailHeaderCell: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "center",
    borderRight: "1px solid #C36C0B",
  },
  detailRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e7eb",
  },
  detailCell: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    color: "#374151",
    textAlign: "center",
    borderRight: "1px solid #e5e7eb",
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: "1px solid #e5e7eb",
  },
  footerText: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 10,
  },
  contactInfo: {
    fontSize: 10,
    color: "#6b7280",
  },
  insuredInfo: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: 12,
    marginBottom: 15,
  },
  insuredInfoTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    borderBottom: "1px solid #d1d5db",
    paddingBottom: 4,
  },
  insuredInfoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  insuredInfoLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#6b7280",
    width: 100,
  },
  insuredInfoValue: {
    fontSize: 9,
    color: "#374151",
    flex: 1,
  },
});

interface PremiumCallPDFProps {
  quote: any;
  calculationResult: any;
  baseUrl?: string;
}

// Formatage nombre FR avec 0 à 2 décimales
// Remplace les espaces insécables (U+202F/U+00A0) par des espaces classiques
// car certaines polices de react-pdf les rendent comme des '/'
const formatNumber = (value: any): string => {
  const num = Number(value ?? 0);
  if (!isFinite(num)) return "0";
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(num);
  return formatted.replace(/[\u202F\u00A0]/g, " ");
};

const PremiumCallPDF: React.FC<PremiumCallPDFProps> = ({
  quote,
  calculationResult,
  baseUrl,
}) => {
  const currentDate = new Date().toLocaleDateString("fr-FR");
  const logoSrc = `${baseUrl ? baseUrl : ""}/couleur_1.png`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête avec logo */}
        <View style={styles.header}>
          <View style={{ marginBottom: 10 }}>
            <Image src={logoSrc} style={{ width: 90, height: 45 }} />
          </View>

          {/* Références de l'assuré */}
          <View style={styles.insuredInfo}>
            <Text style={styles.insuredInfoTitle}>Références de l'assuré</Text>
            <View style={styles.insuredInfoRow}>
              <Text style={styles.insuredInfoLabel}>Référence dossier :</Text>
              <Text style={styles.insuredInfoValue}>
                {quote?.reference || "N/A"}
              </Text>
            </View>
            {quote?.formData?.companyName && (
              <View style={styles.insuredInfoRow}>
                <Text style={styles.insuredInfoLabel}>Raison sociale :</Text>
                <Text style={styles.insuredInfoValue}>
                  {quote.formData.companyName}
                </Text>
              </View>
            )}
            {quote?.formData?.directorName && (
              <View style={styles.insuredInfoRow}>
                <Text style={styles.insuredInfoLabel}>Dirigeant :</Text>
                <Text style={styles.insuredInfoValue}>
                  {quote.formData.directorName}
                </Text>
              </View>
            )}
            {(quote?.formData?.address ||
              quote?.formData?.postalCode ||
              quote?.formData?.city) && (
              <View style={styles.insuredInfoRow}>
                <Text style={styles.insuredInfoLabel}>Adresse :</Text>
                <Text style={styles.insuredInfoValue}>
                  {[
                    quote?.formData?.address,
                    quote?.formData?.postalCode,
                    quote?.formData?.city,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </Text>
              </View>
            )}
            {quote?.formData?.siret && (
              <View style={styles.insuredInfoRow}>
                <Text style={styles.insuredInfoLabel}>SIRET :</Text>
                <Text style={styles.insuredInfoValue}>
                  {quote.formData.siret}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.greeting}>Monsieur,</Text>
          <Text style={styles.introduction}>
            vous trouverez ci-joint votre appel de prime ainsi que votre
            échéancier de règlement au titre de votre contrat{" "}
            <Text style={{ fontWeight: "bold" }}>
              RESPONSABILITÉ CIVILE ET DÉCENNALE
            </Text>
            .
          </Text>
        </View>

        {/* Période */}
        {calculationResult?.echeancier?.echeances &&
          calculationResult.echeancier.echeances.length > 0 && (
            <View style={styles.periodBox}>
              <Text style={styles.periodTitle}>PÉRIODE DU</Text>
              <View style={styles.periodDates}>
                <Text style={styles.periodDate}>
                  {calculationResult.echeancier.echeances[0]?.debutPeriode ||
                    "N/A"}
                </Text>
                <Text style={styles.periodSeparator}>AU</Text>
                <Text style={styles.periodDate}>
                  {calculationResult.echeancier.echeances[
                    calculationResult.echeancier.echeances.length - 1
                  ]?.finPeriode || "N/A"}
                </Text>
              </View>
            </View>
          )}

        {/* Résumé de la période */}
        {calculationResult && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Période</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Montant HT</Text>
                <Text style={styles.summaryValue}>
                  {formatNumber(calculationResult.primeTotal)} €
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Taxe €</Text>
                <Text style={styles.summaryValue}>
                  {formatNumber(calculationResult.autres?.taxeAssurance)} €
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>MONTANT TTC</Text>
                <Text style={[styles.summaryValue, styles.totalValue]}>
                  {formatNumber(calculationResult.totalTTC)} €
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Échéancier */}
        {calculationResult?.echeancier?.echeances &&
          calculationResult.echeancier.echeances.length > 0 && (
            <View style={styles.table}>
              <Text style={styles.tableTitle}>Échéancier</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>
                  Période Date
                </Text>
                <Text style={styles.tableHeaderCell}>
                  Montant HT Total HT €
                </Text>
                <Text style={styles.tableHeaderCell}>Taxe €</Text>
                <Text style={styles.tableHeaderCell}>
                  MONTANT TTC Total TTC
                </Text>
                <Text style={styles.tableHeaderCell}>Date de règlement</Text>
              </View>
              {calculationResult.echeancier.echeances.map(
                (echeance: any, index: number) => (
                  <View key={index} style={styles.tableRow}>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableCellLeft,
                        { flex: 1.2 },
                      ]}
                    >
                      {echeance.date}
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellRight]}>
                      {formatNumber(echeance.totalHT)} €
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellRight]}>
                      {formatNumber(echeance.taxe)} €
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        styles.tableCellRight,
                        styles.tableCellBold,
                      ]}
                    >
                      {formatNumber(echeance.totalTTC)} €
                    </Text>
                    <Text style={styles.tableCell}>{echeance.date}</Text>
                  </View>
                )
              )}
            </View>
          )}

        {/* Détail de la prime et Validité des attestations */}
        {calculationResult?.echeancier?.echeances &&
          calculationResult.echeancier.echeances.length > 0 && (
            <View style={styles.detailGrid}>
              {/* Détail de la prime */}
              <View style={styles.detailColumn}>
                <Text style={styles.tableTitle}>Détail de la prime</Text>
                <View style={styles.detailTable}>
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailHeaderCell}>RCD</Text>
                    <Text style={styles.detailHeaderCell}>PJ</Text>
                    <Text style={styles.detailHeaderCell}>Frais</Text>
                    <Text style={styles.detailHeaderCell}>Reprise</Text>
                  </View>
                  {calculationResult.echeancier.echeances.map(
                    (echeance: any, index: number) => (
                      <View key={index} style={styles.detailRow}>
                        <Text style={styles.detailCell}>
                          {formatNumber(echeance.rcd)} €
                        </Text>
                        <Text style={styles.detailCell}>
                          {formatNumber(echeance.pj)} €
                        </Text>
                        <Text style={styles.detailCell}>
                          {formatNumber(echeance.frais)} €
                        </Text>
                        <Text style={styles.detailCell}>
                          {formatNumber(echeance.reprise)} €
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>

              {/* Validité de vos attestations */}
              <View style={styles.detailColumn}>
                <Text style={styles.tableTitle}>
                  Validité de vos attestations
                </Text>
                <View style={styles.detailTable}>
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailHeaderCell}>début période</Text>
                    <Text style={styles.detailHeaderCell}>fin période</Text>
                  </View>
                  {calculationResult.echeancier.echeances.map(
                    (echeance: any, index: number) => (
                      <View key={index} style={styles.detailRow}>
                        <Text style={styles.detailCell}>
                          {echeance.debutPeriode}
                        </Text>
                        <Text style={styles.detailCell}>
                          {echeance.finPeriode}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            </View>
          )}

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

export default PremiumCallPDF;
