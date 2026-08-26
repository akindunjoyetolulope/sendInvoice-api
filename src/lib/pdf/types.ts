export interface InvoicePdfLineItem {
  description: string
  quantity: number
  rateKobo: number
  lineTotalKobo: number
}

export interface InvoicePdfData {
  id: string
  customerId: string
  invoiceNumber: string
  status: string
  currency: string
  issueDate: Date
  dueDate: Date
  comments: string | null
  subtotalKobo: number
  discountKobo: number
  taxRatePercent: number
  taxKobo: number
  totalDueKobo: number
  billedToName: string
  billedToEmail: string
  businessName: string
  businessAddress: string
  businessPhone: string
  payeeName: string
  bankName: string
  accountNumber: string
  lineItems: InvoicePdfLineItem[]
}
