import { fromKobo } from "../format/money"

export function formatMoney(kobo: number, currency: string): string {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(fromKobo(kobo))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date)
}

/** e.g. "Rentfree invoice JUL 2026" — used for both the email subject and the PDF filename. */
export function formatInvoiceTitle(billedToName: string, issueDate: Date): string {
  const monthYear = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  })
    .format(issueDate)
    .toUpperCase()
  return `${billedToName} invoice ${monthYear}`
}
