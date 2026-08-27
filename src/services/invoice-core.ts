import { and, eq } from "drizzle-orm"
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
  userId: string
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

export async function createInvoiceRecord(tx: Tx, input: CreateInvoiceRecordInput) {
  const [profile] = await tx.select().from(businessProfile).where(eq(businessProfile.userId, input.userId))
  if (!profile) throw new Error("Business profile has not been set up yet")

  const [customer] = await tx
    .select()
    .from(customers)
    .where(and(eq(customers.id, input.customerId), eq(customers.userId, input.userId)))
  if (!customer) throw new Error("Customer not found")

  const { lineItems, subtotalKobo, discountKobo, taxKobo, totalDueKobo } = computeLineItemsAndTotals(
    input.lineItems,
    input.discountNaira,
    input.taxRatePercent,
  )

  const invoiceNumber = `INV-${String(profile.nextInvoiceNumber).padStart(4, "0")}`
  await tx
    .update(businessProfile)
    .set({ nextInvoiceNumber: profile.nextInvoiceNumber + 1 })
    .where(eq(businessProfile.userId, input.userId))

  const issueDate = new Date()
  const id = crypto.randomUUID()
  await tx.insert(invoices).values({
    id,
    userId: input.userId,
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
  const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, id))

  await tx.insert(invoiceLineItems).values(
    lineItems.map((item, index) => ({
      ...item,
      invoiceId: invoice.id,
      sortOrder: index,
    })),
  )

  return invoice
}

export interface UpdateInvoiceRecordInput {
  userId: string
  customerId: string
  lineItems: InvoiceLineItemInput[]
  discountNaira: number
  taxRatePercent: number
  dueDate: Date
  comments?: string
}

/** Only for draft/failed invoices — re-snapshots business & customer details since nothing's been delivered yet. */
export async function updateInvoiceRecord(tx: Tx, invoiceId: string, input: UpdateInvoiceRecordInput) {
  const [profile] = await tx.select().from(businessProfile).where(eq(businessProfile.userId, input.userId))
  if (!profile) throw new Error("Business profile has not been set up yet")

  const [customer] = await tx
    .select()
    .from(customers)
    .where(and(eq(customers.id, input.customerId), eq(customers.userId, input.userId)))
  if (!customer) throw new Error("Customer not found")

  const { lineItems, subtotalKobo, discountKobo, taxKobo, totalDueKobo } = computeLineItemsAndTotals(
    input.lineItems,
    input.discountNaira,
    input.taxRatePercent,
  )

  await tx
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
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, input.userId)))
  const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId))

  await tx.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId))
  await tx.insert(invoiceLineItems).values(
    lineItems.map((item, index) => ({
      ...item,
      invoiceId,
      sortOrder: index,
    })),
  )

  return invoice
}
