import { eq } from "drizzle-orm"
import type { db as dbType } from "../db/client"
import { businessProfile, customers, invoiceLineItems, invoices } from "../db/schema"
import { toKobo } from "../lib/format/money"

type Tx = Parameters<Parameters<typeof dbType.transaction>[0]>[0]

export interface InvoiceLineItemInput {
  description: string
  quantity: number
  rate: number
}

export interface CreateInvoiceRecordInput {
  customerId: string
  lineItems: InvoiceLineItemInput[]
  discountNaira: number
  taxRatePercent: number
  dueDate: Date
  comments?: string
  recurringInvoiceId?: string
}

function computeLineItemsAndTotals(
  lineItemInputs: InvoiceLineItemInput[],
  discountNaira: number,
  taxRatePercent: number,
) {
  const lineItems = lineItemInputs.map((item) => {
    const rateKobo = toKobo(item.rate)
    return {
      description: item.description,
      quantity: item.quantity,
      rateKobo,
      lineTotalKobo: Math.round(rateKobo * item.quantity),
    }
  })

  const subtotalKobo = lineItems.reduce((sum, item) => sum + item.lineTotalKobo, 0)
  const discountKobo = toKobo(discountNaira)
  const taxableKobo = Math.max(subtotalKobo - discountKobo, 0)
  const taxKobo = Math.round((taxableKobo * taxRatePercent) / 100)
  const totalDueKobo = taxableKobo + taxKobo

  return { lineItems, subtotalKobo, discountKobo, taxKobo, totalDueKobo }
}

function businessAddressLine(profile: typeof businessProfile.$inferSelect) {
  return [profile.addressLine1, profile.addressLine2, profile.city, profile.state, profile.country]
    .filter(Boolean)
    .join(", ")
}

export function createInvoiceRecord(tx: Tx, input: CreateInvoiceRecordInput) {
  const profile = tx.select().from(businessProfile).where(eq(businessProfile.id, 1)).get()
  if (!profile) throw new Error("Business profile has not been set up yet")

  const customer = tx.select().from(customers).where(eq(customers.id, input.customerId)).get()
  if (!customer) throw new Error("Customer not found")

  const { lineItems, subtotalKobo, discountKobo, taxKobo, totalDueKobo } = computeLineItemsAndTotals(
    input.lineItems,
    input.discountNaira,
    input.taxRatePercent,
  )

  const invoiceNumber = `INV-${String(profile.nextInvoiceNumber).padStart(4, "0")}`
  tx.update(businessProfile)
    .set({ nextInvoiceNumber: profile.nextInvoiceNumber + 1 })
    .where(eq(businessProfile.id, 1))
    .run()

  const issueDate = new Date()
  const invoice = tx
    .insert(invoices)
    .values({
      invoiceNumber,
      customerId: customer.id,
      currency: profile.currency,
      issueDate,
      dueDate: input.dueDate,
      comments: input.comments,
      subtotalKobo,
      discountKobo,
      taxRatePercent: input.taxRatePercent,
      taxKobo,
      totalDueKobo,
      billedToName: customer.name,
      billedToEmail: customer.email,
      businessNameSnapshot: profile.businessName,
      businessAddressSnapshot: businessAddressLine(profile),
      businessPhoneSnapshot: profile.phone,
      payeeNameSnapshot: profile.payeeName,
      bankNameSnapshot: profile.bankName,
      accountNumberSnapshot: profile.accountNumber,
      recurringInvoiceId: input.recurringInvoiceId,
    })
    .returning()
    .get()

  tx.insert(invoiceLineItems)
    .values(
      lineItems.map((item, index) => ({
        ...item,
        invoiceId: invoice.id,
        sortOrder: index,
      })),
    )
    .run()

  return invoice
}

export interface UpdateInvoiceRecordInput {
  customerId: string
  lineItems: InvoiceLineItemInput[]
  discountNaira: number
  taxRatePercent: number
  dueDate: Date
  comments?: string
}

/** Only for draft/failed invoices — re-snapshots business & customer details since nothing's been delivered yet. */
export function updateInvoiceRecord(tx: Tx, invoiceId: string, input: UpdateInvoiceRecordInput) {
  const profile = tx.select().from(businessProfile).where(eq(businessProfile.id, 1)).get()
  if (!profile) throw new Error("Business profile has not been set up yet")

  const customer = tx.select().from(customers).where(eq(customers.id, input.customerId)).get()
  if (!customer) throw new Error("Customer not found")

  const { lineItems, subtotalKobo, discountKobo, taxKobo, totalDueKobo } = computeLineItemsAndTotals(
    input.lineItems,
    input.discountNaira,
    input.taxRatePercent,
  )

  const invoice = tx
    .update(invoices)
    .set({
      customerId: customer.id,
      dueDate: input.dueDate,
      comments: input.comments,
      subtotalKobo,
      discountKobo,
      taxRatePercent: input.taxRatePercent,
      taxKobo,
      totalDueKobo,
      billedToName: customer.name,
      billedToEmail: customer.email,
      businessNameSnapshot: profile.businessName,
      businessAddressSnapshot: businessAddressLine(profile),
      businessPhoneSnapshot: profile.phone,
      payeeNameSnapshot: profile.payeeName,
      bankNameSnapshot: profile.bankName,
      accountNumberSnapshot: profile.accountNumber,
    })
    .where(eq(invoices.id, invoiceId))
    .returning()
    .get()

  tx.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId)).run()
  tx.insert(invoiceLineItems)
    .values(
      lineItems.map((item, index) => ({
        ...item,
        invoiceId,
        sortOrder: index,
      })),
    )
    .run()

  return invoice
}
