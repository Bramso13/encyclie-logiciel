import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Définir les styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontSize: 12,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
  },
  introduction: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 20,
  },
  periodBox: {
    backgroundColor: '#f0fdf4',
    border: '2px solid #22c55e',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#15803d',
    marginBottom: 10,
  },
  periodDates: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodDate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#15803d',
  },
  periodSeparator: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16a34a',
    marginHorizontal: 15,
  },
  summaryBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#1f2937',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#dcfce7',
    borderBottom: '1px solid #22c55e',
  },
  tableHeaderCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
    borderRight: '1px solid #22c55e',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    color: '#374151',
    textAlign: 'center',
    borderRight: '1px solid #e5e7eb',
  },
  tableCellLeft: {
    textAlign: 'left',
  },
  tableCellRight: {
    textAlign: 'right',
  },
  tableCellBold: {
    fontWeight: 'bold',
  },
  detailGrid: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    backgroundColor: '#fed7aa',
    borderBottom: '1px solid #f97316',
  },
  detailHeaderCell: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
    borderRight: '1px solid #f97316',
  },
  detailRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
  },
  detailCell: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    color: '#374151',
    textAlign: 'center',
    borderRight: '1px solid #e5e7eb',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: '1px solid #e5e7eb',
  },
  footerText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 10,
  },
  contactInfo: {
    fontSize: 10,
    color: '#6b7280',
  },
});

interface PremiumCallPDFProps {
  quote: any;
  calculationResult: any;
}

const PremiumCallPDF: React.FC<PremiumCallPDFProps> = ({ quote, calculationResult }) => {
  const currentDate = new Date().toLocaleDateString('fr-FR');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Monsieur,</Text>
          <Text style={styles.introduction}>
            vous trouverez ci-joint votre appel de prime ainsi que votre échéancier de règlement au titre de votre contrat <Text style={{ fontWeight: 'bold' }}>RESPONSABILITÉ CIVILE ET DÉCENNALE</Text>.
          </Text>
        </View>

        {/* Période */}
        {calculationResult?.echeancier?.echeances && calculationResult.echeancier.echeances.length > 0 && (
          <View style={styles.periodBox}>
            <Text style={styles.periodTitle}>PÉRIODE DU</Text>
            <View style={styles.periodDates}>
              <Text style={styles.periodDate}>
                {calculationResult.echeancier.echeances[0]?.debutPeriode || "N/A"}
              </Text>
              <Text style={styles.periodSeparator}>AU</Text>
              <Text style={styles.periodDate}>
                {calculationResult.echeancier.echeances[calculationResult.echeancier.echeances.length - 1]?.finPeriode || "N/A"}
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
                  {calculationResult.primeTotal?.toLocaleString("fr-FR") || "0"} €
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Taxe €</Text>
                <Text style={styles.summaryValue}>
                  {calculationResult.autres?.taxeAssurance?.toLocaleString("fr-FR") || "0"} €
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>MONTANT TTC</Text>
                <Text style={[styles.summaryValue, styles.totalValue]}>
                  {calculationResult.totalTTC?.toLocaleString("fr-FR") || "0"} €
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Échéancier */}
        {calculationResult?.echeancier?.echeances && calculationResult.echeancier.echeances.length > 0 && (
          <View style={styles.table}>
            <Text style={styles.tableTitle}>Échéancier</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Période Date</Text>
              <Text style={styles.tableHeaderCell}>Montant HT Total HT €</Text>
              <Text style={styles.tableHeaderCell}>Taxe €</Text>
              <Text style={styles.tableHeaderCell}>MONTANT TTC Total TTC</Text>
              <Text style={styles.tableHeaderCell}>Date de règlement</Text>
            </View>
            {calculationResult.echeancier.echeances.map((echeance: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableCellLeft, { flex: 1.2 }]}>
                  {echeance.date}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellRight]}>
                  {echeance.totalHT?.toLocaleString("fr-FR") || "0"} €
                </Text>
                <Text style={[styles.tableCell, styles.tableCellRight]}>
                  {echeance.taxe?.toLocaleString("fr-FR") || "0"} €
                </Text>
                <Text style={[styles.tableCell, styles.tableCellRight, styles.tableCellBold]}>
                  {echeance.totalTTC?.toLocaleString("fr-FR") || "0"} €
                </Text>
                <Text style={styles.tableCell}>
                  {echeance.date}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Détail de la prime et Validité des attestations */}
        {calculationResult?.echeancier?.echeances && calculationResult.echeancier.echeances.length > 0 && (
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
                {calculationResult.echeancier.echeances.map((echeance: any, index: number) => (
                  <View key={index} style={styles.detailRow}>
                    <Text style={styles.detailCell}>
                      {echeance.rcd?.toLocaleString("fr-FR") || "0"} €
                    </Text>
                    <Text style={styles.detailCell}>
                      {echeance.pj?.toLocaleString("fr-FR") || "0"} €
                    </Text>
                    <Text style={styles.detailCell}>
                      {echeance.frais?.toLocaleString("fr-FR") || "0"} €
                    </Text>
                    <Text style={styles.detailCell}>
                      {echeance.reprise?.toLocaleString("fr-FR") || "0"} €
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Validité de vos attestations */}
            <View style={styles.detailColumn}>
              <Text style={styles.tableTitle}>Validité de vos attestations</Text>
              <View style={styles.detailTable}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailHeaderCell}>début période</Text>
                  <Text style={styles.detailHeaderCell}>fin période</Text>
                </View>
                {calculationResult.echeancier.echeances.map((echeance: any, index: number) => (
                  <View key={index} style={styles.detailRow}>
                    <Text style={styles.detailCell}>
                      {echeance.debutPeriode}
                    </Text>
                    <Text style={styles.detailCell}>
                      {echeance.finPeriode}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Soucieux de votre satisfaction, nous restons à votre disposition et vous prions d'agréer, Madame, Monsieur, nos sincères salutations.
          </Text>
          <Text style={styles.contactInfo}>
            <Text style={{ fontWeight: 'bold' }}>Service Cotisations:</Text> cotisation.encycliebat@encyclie-construction.fr
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default PremiumCallPDF;
