import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"
import type { InvoicePdfData } from "../lib/pdf/types"
import { formatDate, formatMoney } from "../lib/pdf/format"

const CREAM = "#FDF6E3"
const OLIVE = "#8A8A1F"
const OLIVE_DARK = "#6E6E18"
const BORDER = "#D9D2A8"

const styles = StyleSheet.create({
  page: {
    backgroundColor: CREAM,
    padding: 40,
    fontSize: 9,
    color: "#3A3A2A",
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: OLIVE_DARK,
    textTransform: "uppercase",
  },
  divider: {
    height: 3,
    backgroundColor: OLIVE,
    marginTop: 8,
    marginBottom: 20,
  },
  label: {
    fontSize: 8,
    fontWeight: 700,
    color: OLIVE_DARK,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 9,
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  col: {
    flexDirection: "column",
  },
  colRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: OLIVE,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: BORDER,
  },
  cellDescription: { width: "52%", padding: 6 },
  cellQty: { width: "12%", padding: 6 },
  cellRate: { width: "18%", padding: 6 },
  cellTotal: { width: "18%", padding: 6 },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 700,
    color: CREAM,
    textTransform: "uppercase",
  },
  totalsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  totalsBox: {
    width: "45%",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: BORDER,
    borderTopWidth: 0,
    padding: 6,
  },
  totalsRowFirst: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: BORDER,
    padding: 6,
  },
  totalsRowDue: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: BORDER,
    borderTopWidth: 0,
    padding: 6,
    backgroundColor: "#F3EDCB",
  },
  totalsLabel: {
    fontWeight: 700,
    color: OLIVE_DARK,
    fontSize: 9,
  },
  totalsValue: {
    fontSize: 9,
  },
})

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Invoice</Text>
        <View style={styles.divider} />

        <View style={styles.headerRow}>
          <View style={styles.col}>
            <Text style={styles.value}>{data.businessAddress}</Text>
            <Text style={styles.value}>Phone: {data.businessPhone}</Text>
          </View>
          <View style={styles.colRight}>
            <Text style={styles.label}>Invoice # {data.invoiceNumber}</Text>
            <Text style={styles.label}>Date: {formatDate(data.issueDate)}</Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <View style={styles.col}>
            <Text style={styles.label}>Billed To:</Text>
            <Text style={styles.value}>{data.billedToName}</Text>
            <Text style={styles.value}>{data.billedToEmail}</Text>
          </View>
          <View style={styles.colRight}>
            <Text style={styles.label}>Details:</Text>
            <Text style={styles.value}>Invoice date: {formatDate(data.issueDate)}</Text>
            <Text style={styles.value}>Due date: {formatDate(data.dueDate)}</Text>
          </View>
        </View>

        {data.comments ? (
          <View style={styles.section}>
            <Text style={styles.label}>Comments or special instructions:</Text>
            <Text style={styles.value}>{data.comments}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.label}>Payment Details:</Text>
          <Text style={styles.value}>{data.payeeName}</Text>
          <Text style={styles.value}>{data.accountNumber}</Text>
          <Text style={styles.value}>{data.bankName}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.cellDescription, styles.tableHeaderText]}>Item(s) and Description</Text>
            <Text style={[styles.cellQty, styles.tableHeaderText]}>QTY</Text>
            <Text style={[styles.cellRate, styles.tableHeaderText]}>Rate</Text>
            <Text style={[styles.cellTotal, styles.tableHeaderText]}>Total</Text>
          </View>
          {data.lineItems.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <Text style={styles.cellDescription}>{item.description}</Text>
              <Text style={styles.cellQty}>{item.quantity}</Text>
              <Text style={styles.cellRate}>{formatMoney(item.rateKobo, data.currency)}</Text>
              <Text style={styles.cellTotal}>{formatMoney(item.lineTotalKobo, data.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRowFirst}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatMoney(data.subtotalKobo, data.currency)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={styles.totalsValue}>{formatMoney(data.discountKobo, data.currency)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>VAT ({data.taxRatePercent}%)</Text>
              <Text style={styles.totalsValue}>{formatMoney(data.taxKobo, data.currency)}</Text>
            </View>
            <View style={styles.totalsRowDue}>
              <Text style={styles.totalsLabel}>Total Due</Text>
              <Text style={[styles.totalsValue, { fontWeight: 700 }]}>
                {formatMoney(data.totalDueKobo, data.currency)}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
