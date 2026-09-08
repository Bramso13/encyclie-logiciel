import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CABINET } from "@/lib/cabinet";
import type { DebitNoteHeader, DebitNoteLineComputed } from "@/lib/quotes/debit-note";
import { debitNoteTotals } from "@/lib/quotes/debit-note";

const ORANGE = "#F39200";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  banner: {
    backgroundColor: ORANGE,
    padding: 10,
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
  },
  headerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  headerCell: {
    width: "50%",
    marginBottom: 4,
  },
  label: {
    fontSize: 7,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  value: {
    fontSize: 9,
  },
  annualBox: {
    backgroundColor: ORANGE,
    padding: 8,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: ORANGE,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  colDate: { width: "16%" },
  colMoney: { width: "16.8%", textAlign: "right" },
  footer: {
    marginTop: 16,
    fontSize: 7,
    color: "#6b7280",
    textAlign: "center",
  },
});

function money(value: number): string {
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`;
}

function dateFr(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR");
}

export default function DebitNotePDF({
  header,
  periodStart,
  periodEnd,
  lines,
}: {
  header: DebitNoteHeader;
  periodStart: Date | string;
  periodEnd: Date | string;
  lines: DebitNoteLineComputed[];
}) {
  const totals = debitNoteTotals(lines);
  const fields: Array<[string, string]> = [
    ["N° de contrat", header.contractNumber],
    ["Nom du dirigeant", header.directorName],
    ["Nom du client", header.clientName],
    ["Adresse", header.clientAddress],
    ["CP Ville", header.clientCity],
    ["Intermédiaire", header.intermediary],
    ["Code courtier", header.brokerCode],
    ["Compagnie", header.companyName],
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>NOTE DE DEBIT</Text>
        </View>
        <View style={styles.headerGrid}>
          {fields.map(([label, value]) => (
            <View key={label} style={styles.headerCell}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value || "—"}</Text>
            </View>
          ))}
        </View>
        <View style={styles.annualBox}>
          <Text>
            Période {dateFr(periodStart)} — {dateFr(periodEnd)}
          </Text>
          <Text>
            Montant annuel (somme TTC) {money(totals.annualAmount)}
          </Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={styles.colDate}>Période Date</Text>
          <Text style={styles.colMoney}>Montant TTC</Text>
          <Text style={styles.colMoney}>Date règlement</Text>
          <Text style={styles.colMoney}>Prime RCD HT</Text>
          <Text style={styles.colMoney}>Com. courtier</Text>
          <Text style={styles.colMoney}>NET hors com</Text>
        </View>
        {lines.map((line) => (
          <View key={line.installmentId} style={styles.tableRow}>
            <Text style={styles.colDate}>{dateFr(line.periodDate)}</Text>
            <Text style={styles.colMoney}>{money(line.amountTTC)}</Text>
            <Text style={styles.colMoney}>{dateFr(line.paymentDate)}</Text>
            <Text style={styles.colMoney}>{money(line.primeRcdHT)}</Text>
            <Text style={styles.colMoney}>{money(line.commission)}</Text>
            <Text style={styles.colMoney}>{money(line.netHorsCom)}</Text>
          </View>
        ))}
        <View style={[styles.tableRow, { fontWeight: "bold" }]}>
          <Text style={styles.colDate}>Total</Text>
          <Text style={styles.colMoney}>{money(totals.annualAmount)}</Text>
          <Text style={styles.colMoney} />
          <Text style={styles.colMoney} />
          <Text style={styles.colMoney}>{money(totals.totalCommission)}</Text>
          <Text style={styles.colMoney} />
        </View>
        <Text style={styles.footer}>
          {CABINET.name} — {CABINET.fullAddress} — {CABINET.email} —{" "}
          {CABINET.phone}
        </Text>
      </Page>
    </Document>
  );
}
