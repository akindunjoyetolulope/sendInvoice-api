import { desc, eq } from "drizzle-orm"
import { db } from "../db/client"
import { invoiceRunLogs, recurringInvoiceLineItems, recurringInvoices } from "../db/schema"
import type { CreateRecurringInvoiceInput } from "../validation/invoice"
import { toKobo } from "../lib/format/money"
import { runRecurringInvoiceOccurrence } from "./recurring-jobs"
import { NotFoundError } from "../lib/errors"

export function createRecurringInvoice(data: CreateRecurringInvoiceInput) {
  return db.transaction((tx) => {
    const recurringInvoice = tx
      .insert(recurringInvoices)
      .values({
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
      .returning()
      .get()

    tx.insert(recurringInvoiceLineItems)
      .values(
        data.lineItems.map((item, index) => ({
          recurringInvoiceId: recurringInvoice.id,
          description: item.description,
          quantity: item.quantity,
          rateKobo: toKobo(item.rate),
          sortOrder: index,
        })),
      )
      .run()

    return { id: recurringInvoice.id }
  })
}

export function listRecurringInvoices() {
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
    .all()
}

export function getRecurringInvoiceById(id: string) {
  const recurringInvoice = db.select().from(recurringInvoices).where(eq(recurringInvoices.id, id)).get()
  if (!recurringInvoice) throw new NotFoundError()

  const lineItems = db
    .select()
    .from(recurringInvoiceLineItems)
    .where(eq(recurringInvoiceLineItems.recurringInvoiceId, id))
    .orderBy(recurringInvoiceLineItems.sortOrder)
    .all()

  const runLogs = db
    .select()
    .from(invoiceRunLogs)
    .where(eq(invoiceRunLogs.recurringInvoiceId, id))
    .orderBy(desc(invoiceRunLogs.runAt))
    .all()

  return { ...recurringInvoice, lineItems, runLogs }
}

export function pauseRecurringInvoice(id: string) {
  return db
    .update(recurringInvoices)
    .set({ status: "paused" })
    .where(eq(recurringInvoices.id, id))
    .returning()
    .get()
}

export function resumeRecurringInvoice(id: string) {
  return db
    .update(recurringInvoices)
    .set({ status: "active" })
    .where(eq(recurringInvoices.id, id))
    .returning()
    .get()
}

export function endRecurringInvoice(id: string) {
  return db
    .update(recurringInvoices)
    .set({ status: "ended" })
    .where(eq(recurringInvoices.id, id))
    .returning()
    .get()
}

export async function runRecurringInvoiceNow(id: string) {
  await runRecurringInvoiceOccurrence(id)
}

export function updateRecurringInvoice(id: string, data: CreateRecurringInvoiceInput) {
  return db.transaction((tx) => {
    tx.update(recurringInvoices)
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
      .run()

    tx.delete(recurringInvoiceLineItems).where(eq(recurringInvoiceLineItems.recurringInvoiceId, id)).run()
    tx.insert(recurringInvoiceLineItems)
      .values(
        data.lineItems.map((item, index) => ({
          recurringInvoiceId: id,
          description: item.description,
          quantity: item.quantity,
          rateKobo: toKobo(item.rate),
          sortOrder: index,
        })),
      )
      .run()

    return { id }
  })
}
