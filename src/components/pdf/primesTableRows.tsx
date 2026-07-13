import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { computePrimesTableAmounts } from "@/lib/quotes/primes-table-calculations";

type PrimesTableStyles = {
  row: Style;
  tdCell: Style;
  tdCellWide: Style;
  tdLabel: Style;
  tdLabelBold?: Style;
  rowHighlight?: Style;
};

function financial(x: number | undefined | null) {
  if (x === undefined || x === null) return "0.00";
  return x.toFixed(2);
}

function formatAmount(value: number, showDashWhenZero = false) {
  if (showDashWhenZero && value === 0) return "-";
  return `${financial(value)} €`;
}

export function PrimesTableRows({
  echeances,
  territory,
  styles,
}: {
  echeances: any[];
  territory?: string;
  styles: PrimesTableStyles;
}) {
  const amounts = computePrimesTableAmounts(echeances, territory);

  const {
    primeRCDHT,
    primeRCDTaxes,
    primeRCDTTC,
    primePJHT,
    primePJTaxes,
    primePJTTC,
    totalRCDPJHT,
    totalRCDPJTaxes,
    totalRCDPJTTC,
    honorairesHT,
    totalAvecFraisHT,
    totalAvecFraisTaxes,
    totalAvecFraisTTC,
    repriseHT,
    repriseTaxes,
    repriseTTC,
    primeTotaleHT,
    primeTotaleTaxes,
    primeTotaleTTC,
  } = amounts;

  const labelStyle = styles.tdLabelBold ?? styles.tdLabel;
  const highlightRow = styles.rowHighlight ?? styles.row;

  return (
    <>
      <View style={styles.row}>
        <View style={styles.tdCellWide}>
          <Text style={styles.tdLabel}>
            Prime RCD provisionnelle hors reprise du passé
          </Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>{formatAmount(primeRCDHT)}</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>{formatAmount(primeRCDTaxes)}</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>{formatAmount(primeRCDTTC)}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.tdCellWide}>
          <Text style={styles.tdLabel}>
            Prime Protection Juridique Complément RCD CFDP
          </Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>
            {formatAmount(primePJHT, true)}
          </Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>
            {formatAmount(primePJTaxes, true)}
          </Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>
            {formatAmount(primePJTTC, true)}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.tdCellWide}>
          <Text style={styles.tdLabel}>Montant total RCD + PJ</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>{formatAmount(totalRCDPJHT)}</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>{formatAmount(totalRCDPJTaxes)}</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>{formatAmount(totalRCDPJTTC)}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.tdCellWide}>
          <Text style={styles.tdLabel}>Honoraire de gestion</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>{formatAmount(honorairesHT)}</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}></Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}></Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.tdCellWide}>
          <Text style={styles.tdLabel}>Montant RCD + PJ + Frais gestion</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>{formatAmount(totalAvecFraisHT)}</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>{formatAmount(totalAvecFraisTaxes)}</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>{formatAmount(totalAvecFraisTTC)}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.tdCellWide}>
          <Text style={styles.tdLabel}>
            Prime RCD pour la garantie reprise du passé (Prime unique à la
            souscription)
          </Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>
            {formatAmount(repriseHT, true)}
          </Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>
            {formatAmount(repriseTaxes, true)}
          </Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={styles.tdLabel}>
            {formatAmount(repriseTTC, true)}
          </Text>
        </View>
      </View>

      <View style={highlightRow}>
        <View style={styles.tdCellWide}>
          <Text style={labelStyle}>Prime totale à régler</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={labelStyle}>{formatAmount(primeTotaleHT)}</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={labelStyle}>{formatAmount(primeTotaleTaxes)}</Text>
        </View>
        <View style={styles.tdCell}>
          <Text style={labelStyle}>{formatAmount(primeTotaleTTC)}</Text>
        </View>
      </View>
    </>
  );
}
