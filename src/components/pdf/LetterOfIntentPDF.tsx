import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

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
    textAlign: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 5,
  },
  date: {
    fontSize: 10,
    color: '#9ca3af',
  },
  recipient: {
    marginBottom: 30,
  },
  recipientLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 5,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  recipientAddress: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 2,
  },
  content: {
    marginBottom: 20,
  },
  paragraph: {
    marginBottom: 15,
    textAlign: 'justify',
  },
  subject: {
    fontWeight: 'bold',
    marginBottom: 15,
  },
  summaryBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 20,
    marginVertical: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1f2937',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  refusalBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: 20,
    marginVertical: 20,
  },
  refusalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#dc2626',
  },
  refusalText: {
    color: '#b91c1c',
  },
  waitingBox: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fed7aa',
    borderRadius: 8,
    padding: 20,
    marginVertical: 20,
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#d97706',
  },
  waitingText: {
    color: '#b45309',
  },
  paymentBox: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: 20,
    marginVertical: 20,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1d4ed8',
  },
  paymentText: {
    color: '#1e40af',
    marginBottom: 10,
  },
  paymentList: {
    marginLeft: 20,
  },
  paymentItem: {
    marginBottom: 5,
    color: '#1e40af',
  },
  list: {
    marginLeft: 20,
    marginBottom: 15,
  },
  listItem: {
    marginBottom: 8,
  },
  signature: {
    marginTop: 40,
  },
  signatureText: {
    marginBottom: 10,
  },
  signatureName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  signatureCompany: {
    fontSize: 12,
    color: '#6b7280',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1px solid #e5e7eb',
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'justify',
  },
});

interface LetterOfIntentPDFProps {
  quote: any;
  calculationResult: any;
}

const LetterOfIntentPDF: React.FC<LetterOfIntentPDFProps> = ({ quote, calculationResult }) => {
  const currentDate = new Date().toLocaleDateString('fr-FR');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>LETTRE D'INTENTION</Text>
          <Text style={styles.subtitle}>Assurance Responsabilité Civile Décennale</Text>
          <Text style={styles.date}>
            Devis n° {quote?.reference || "N/A"} - {currentDate}
          </Text>
        </View>

        {/* Destinataire */}
        <View style={styles.recipient}>
          <Text style={styles.recipientLabel}>À l'attention de :</Text>
          <Text style={styles.recipientName}>
            {quote?.companyData?.companyName || "Nom de l'entreprise"}
          </Text>
          <Text style={styles.recipientAddress}>
            {quote?.companyData?.address || "Adresse de l'entreprise"}
          </Text>
          <Text style={styles.recipientAddress}>
            SIRET : {quote?.companyData?.siret || "N/A"}
          </Text>
        </View>

        {/* Corps de la lettre */}
        <View style={styles.content}>
          <Text style={styles.subject}>
            Objet : Proposition d'assurance Responsabilité Civile Décennale
          </Text>

          <Text style={styles.paragraph}>Madame, Monsieur,</Text>

          <Text style={styles.paragraph}>
            Suite à votre demande d'assurance Responsabilité Civile Décennale, nous avons le plaisir de vous présenter notre proposition d'assurance adaptée à votre activité.
          </Text>

          {/* Informations du calcul */}
          {calculationResult && !calculationResult.refus ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Résumé de notre proposition :</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Chiffre d'affaires déclaré</Text>
                  <Text style={styles.summaryValue}>
                    {calculationResult.caCalculee?.toLocaleString("fr-FR") || "0"} €
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Prime HT</Text>
                  <Text style={styles.summaryValue}>
                    {calculationResult.primeTotal?.toLocaleString("fr-FR") || "0"} €
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Protection Juridique</Text>
                  <Text style={styles.summaryValue}>
                    {calculationResult.protectionJuridique?.toLocaleString("fr-FR") || "0"} €
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total TTC</Text>
                  <Text style={[styles.summaryValue, styles.totalValue]}>
                    {calculationResult.totalTTC?.toLocaleString("fr-FR") || "0"} €
                  </Text>
                </View>
              </View>
            </View>
          ) : calculationResult?.refus ? (
            <View style={styles.refusalBox}>
              <Text style={styles.refusalTitle}>Demande non acceptée</Text>
              <Text style={styles.refusalText}>
                Malheureusement, nous ne pouvons pas accepter votre demande d'assurance pour la raison suivante : {calculationResult.refusReason || "Critères non respectés"}.
              </Text>
            </View>
          ) : (
            <View style={styles.waitingBox}>
              <Text style={styles.waitingTitle}>Calcul en cours</Text>
              <Text style={styles.waitingText}>
                Le calcul de votre prime est en cours de finalisation. Nous vous contacterons prochainement avec notre proposition.
              </Text>
            </View>
          )}

          <Text style={styles.paragraph}>
            Notre proposition d'assurance comprend :
          </Text>

          <View style={styles.list}>
            <Text style={styles.listItem}>• Couverture Responsabilité Civile Décennale selon les conditions générales en vigueur</Text>
            <Text style={styles.listItem}>• Protection Juridique incluse</Text>
            <Text style={styles.listItem}>• Garantie des travaux de construction, rénovation et réparation</Text>
            <Text style={styles.listItem}>• Couverture des dommages corporels, matériels et immatériels</Text>
            <Text style={styles.listItem}>• Assistance juridique et technique</Text>
          </View>

          {/* Échéancier si disponible */}
          {calculationResult?.echeancier?.echeances && calculationResult.echeancier.echeances.length > 0 && (
            <View style={styles.paymentBox}>
              <Text style={styles.paymentTitle}>Modalités de paiement :</Text>
              <Text style={styles.paymentText}>
                Votre prime sera payable selon l'échéancier suivant :
              </Text>
              <View style={styles.paymentList}>
                {calculationResult.echeancier.echeances.slice(0, 3).map((echeance: any, index: number) => (
                  <Text key={index} style={styles.paymentItem}>
                    • {echeance.date} : {echeance.totalTTC?.toLocaleString("fr-FR") || "0"} €
                  </Text>
                ))}
                {calculationResult.echeancier.echeances.length > 3 && (
                  <Text style={styles.paymentItem}>
                    • ... et {calculationResult.echeancier.echeances.length - 3} autres échéances
                  </Text>
                )}
              </View>
            </View>
          )}

          <Text style={styles.paragraph}>
            Cette proposition est valable 30 jours à compter de la date d'émission. Pour accepter cette offre, veuillez nous retourner le présent document signé accompagné des pièces justificatives demandées.
          </Text>

          <Text style={styles.paragraph}>
            Nous restons à votre disposition pour tout complément d'information.
          </Text>

          <View style={styles.signature}>
            <Text style={styles.signatureText}>Cordialement,</Text>
            <Text style={styles.signatureName}>L'équipe commerciale</Text>
            <Text style={styles.signatureCompany}>Encyclie Logiciel</Text>
          </View>
        </View>

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text>
            Cette lettre d'intention est établie sous réserve de l'acceptation définitive de votre dossier par notre compagnie d'assurance partenaire.
            Les conditions définitives seront précisées dans le contrat d'assurance.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default LetterOfIntentPDF;
