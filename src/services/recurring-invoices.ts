import { desc, eq } from "drizzle-orm"
import { db } from "../db/client"
import { invoiceRunLogs, recurringInvoiceLineItems, recurringInvoices } from "../db/schema"
import type { CreateRecurringInvoiceInput } from "../validation/invoice"
import { toKobo } from "../lib/format/money"
import { runRecurringInvoiceOccurrence } from "./recurring-jobs"
import { NotFoundError } from "../lib/errors"

export async function createRecurringInvoice(data: CreateRecurringInvoiceInput) {
  return db.transaction(async (tx) => {
    const id = crypto.randomUUID()
    await tx.insert(recurringInvoices).values({
      id,
      customerId: data.customerId,
      discountKobo: toKobo(data.discountNaira),
      taxRatePercent: data.taxRatePercent,
      comments: data.comments,
      frequency: data.frequency,
      customIntervalDays: data.customIntervalDays,
      dueInDays: data.dueInDays,
      startDate: data.startDate,
      endDate: data.endDate,
      timezone: data.timezone,
      autoSendEmail: data.autoSendEmail,
      autoGeneratePdf: data.autoGeneratePdf || data.autoSendEmail,
      nextRunAt: data.startDate,
    })

    await tx.insert(recurringInvoiceLineItems).values(
      data.lineItems.map((item, index) => ({
        recurringInvoiceId: id,
        description: item.description,
        quantity: item.quantity,
        rateKobo: toKobo(item.rate),
        sortOrder: index,
      })),
    )

    return { id }
  })
}

export async function listRecurringInvoices() {
  return db
    .select({
      id: recurringInvoices.id,
      customerId: recurringInvoices.customerId,
      frequency: recurringInvoices.frequency,
      status: recurringInvoices.status,
      nextRunAt: recurringInvoices.nextRunAt,
      timezone: recurringInvoices.timezone,
    })
    .from(recurringInvoices)
    .orderBy(desc(recurringInvoices.createdAt))
}

export async function getRecurringInvoiceById(id: string) {
  const [recurringInvoice] = await db.select().from(recurringInvoices).where(eq(recurringInvoices.id, id))
  if (!recurringInvoice) throw new NotFoundError()

  const lineItems = await db
    .select()
    .from(recurringInvoiceLineItems)
    .where(eq(recurringInvoiceLineItems.recurringInvoiceId, id))
    .orderBy(recurringInvoiceLineItems.sortOrder)

  const runLogs = await db
    .select()
    .from(invoiceRunLogs)
    .where(eq(invoiceRunLogs.recurringInvoiceId, id))
    .orderBy(desc(invoiceRunLogs.runAt))

  return { ...recurringInvoice, lineItems, runLogs }
}

async function setRecurringInvoiceStatus(id: string, status: "active" | "paused" | "ended") {
  await db.update(recurringInvoices).set({ status }).where(eq(recurringInvoices.id, id))
  const [row] = await db.select().from(recurringInvoices).where(eq(recurringInvoices.id, id))
  if (!row) throw new NotFoundError()
  return row
}

export async function pauseRecurringInvoice(id: string) {
  return setRecurringInvoiceStatus(id, "paused")
}

export async function resumeRecurringInvoice(id: string) {
  return setRecurringInvoiceStatus(id, "active")
}

export async function endRecurringInvoice(id: string) {
  return setRecurringInvoiceStatus(id, "ended")
}

export async function runRecurringInvoiceNow(id: string) {
  await runRecurringInvoiceOccurrence(id)
}

export async function updateRecurringInvoice(id: string, data: CreateRecurringInvoiceInput) {
  return db.transaction(async (tx) => {
    await tx
      .update(recurringInvoices)
      .set({
        customerId: data.customerId,
        discountKobo: toKobo(data.discountNaira),
        taxRatePercent: data.taxRatePercent,
        comments: data.comments,
        frequency: data.frequency,
        customIntervalDays: data.customIntervalDays,
        dueInDays: data.dueInDays,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        timezone: data.timezone,
        autoSendEmail: data.autoSendEmail,
        autoGeneratePdf: data.autoGeneratePdf || data.autoSendEmail,
      })
      .where(eq(recurringInvoices.id, id))

    await tx.delete(recurringInvoiceLineItems).where(eq(recurringInvoiceLineItems.recurringInvoiceId, id))
    await tx.insert(recurringInvoiceLineItems).values(
      data.lineItems.map((item, index) => ({
        recurringInvoiceId: id,
        description: item.description,
        quantity: item.quantity,
        rateKobo: toKobo(item.rate),
        sortOrder: index,
      })),
    )

    return { id }
  })
}
