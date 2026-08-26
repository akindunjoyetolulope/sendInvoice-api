import { desc, eq } from "drizzle-orm"
import { db } from "../db/client"
import { customers, invoiceLineItems, invoices } from "../db/schema"
import type { CreateInvoiceInput } from "../validation/invoice"
import { createInvoiceRecord, updateInvoiceRecord } from "./invoice-core"
import { NotFoundError } from "../lib/errors"
import type { InvoicePdfData } from "../lib/pdf/types"

export async function createInvoice(data: CreateInvoiceInput) {
  if (!data.customerId && !data.newCustomer) {
    throw new Error("A customer must be selected or provided")
  }

  return db.transaction(async (tx) => {
    let customerId: string
    if (data.customerId) {
      customerId = data.customerId
    } else {
      customerId = crypto.randomUUID()
      await tx.insert(customers).values({ id: customerId, ...data.newCustomer! })
    }

    const invoice = await createInvoiceRecord(tx, {
      customerId,
      lineItems: data.lineItems,
      discountNaira: data.discountNaira,
      taxRatePercent: data.taxRatePercent,
      dueDate: data.dueDate,
      comments: data.comments,
    })

    return { id: invoice.id }
  })
}

const EDITABLE_STATUSES = ["draft", "failed"] as const

export async function updateInvoice(id: string, data: CreateInvoiceInput) {
  if (!data.customerId && !data.newCustomer) {
    throw new Error("A customer must be selected or provided")
  }

  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(invoices).where(eq(invoices.id, id))
    if (!existing) throw new NotFoundError()
    if (!EDITABLE_STATUSES.includes(existing.status as (typeof EDITABLE_STATUSES)[number])) {
      throw new Error(`An invoice that's already ${existing.status} can't be edited`)
    }

    let customerId: string
    if (data.customerId) {
      customerId = data.customerId
    } else {
      customerId = crypto.randomUUID()
      await tx.insert(customers).values({ id: customerId, ...data.newCustomer! })
    }

    await updateInvoiceRecord(tx, id, {
      customerId,
      lineItems: data.lineItems,
      discountNaira: data.discountNaira,
      taxRatePercent: data.taxRatePercent,
      dueDate: data.dueDate,
      comments: data.comments,
    })

    return { id }
  })
}

export async function deleteInvoice(id: string) {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id))
  if (!invoice) throw new NotFoundError()
  if (invoice.status === "paid") {
    return { ok: false as const, reason: "paid" as const }
  }
  await db.delete(invoices).where(eq(invoices.id, id))
  return { ok: true as const }
}

export async function getInvoiceById(id: string): Promise<InvoicePdfData> {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id))
  if (!invoice) throw new NotFoundError()

  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id))
    .orderBy(invoiceLineItems.sortOrder)

  return {
    id: invoice.id,
    customerId: invoice.customerId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    comments: invoice.comments,
    subtotalKobo: invoice.subtotalKobo,
    discountKobo: invoice.discountKobo,
    taxRatePercent: invoice.taxRatePercent,
    taxKobo: invoice.taxKobo,
    totalDueKobo: invoice.totalDueKobo,
    billedToName: invoice.billedToName,
    billedToEmail: invoice.billedToEmail,
    businessName: invoice.businessNameSnapshot,
    businessAddress: invoice.businessAddressSnapshot,
    businessPhone: invoice.businessPhoneSnapshot,
    payeeName: invoice.payeeNameSnapshot,
    bankName: invoice.bankNameSnapshot,
    accountNumber: invoice.accountNumberSnapshot,
    lineItems: lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      rateKobo: item.rateKobo,
      lineTotalKobo: item.lineTotalKobo,
    })),
  }
}

export async function listInvoices() {
  return db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      totalDueKobo: invoices.totalDueKobo,
      currency: invoices.currency,
      billedToName: invoices.billedToName,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .orderBy(desc(invoices.createdAt))
}
