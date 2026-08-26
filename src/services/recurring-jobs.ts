import { addDays } from "date-fns"
import { and, eq, lte } from "drizzle-orm"
import { db } from "../db/client"
import { invoiceRunLogs, recurringInvoiceLineItems, recurringInvoices } from "../db/schema"
import { createInvoiceRecord } from "./invoice-core"
import { renderInvoicePdfBuffer } from "./send-invoice"
import { sendInvoiceEmail } from "./email"
import { computeAnchoredRunDate, hasEnded } from "./recurring-schedule"
import { fromKobo } from "../lib/format/money"

const MAX_ATTEMPTS = 3
const RETRY_BACKOFF_MS = 15 * 60 * 1000

async function logRun(entry: {
  recurringInvoiceId: string
  invoiceId?: string
  status: "success" | "failed"
  stage: "invoice" | "pdf" | "email"
  errorMessage?: string
  attempt: number
}) {
  await db.insert(invoiceRunLogs).values({
    recurringInvoiceId: entry.recurringInvoiceId,
    invoiceId: entry.invoiceId,
    status: entry.status,
    stage: entry.stage,
    errorMessage: entry.errorMessage,
    attempt: entry.attempt,
  })
}

export async function runRecurringInvoiceOccurrence(recurringInvoiceId: string) {
  const [recurringInvoice] = await db
    .select()
    .from(recurringInvoices)
    .where(eq(recurringInvoices.id, recurringInvoiceId))
  if (!recurringInvoice) throw new Error("Recurring invoice not found")

  const lineItems = await db
    .select()
    .from(recurringInvoiceLineItems)
    .where(eq(recurringInvoiceLineItems.recurringInvoiceId, recurringInvoiceId))
    .orderBy(recurringInvoiceLineItems.sortOrder)

  const attempt = recurringInvoice.attemptCount + 1
  const now = new Date()

  let invoiceId: string | undefined
  try {
    const invoice = await db.transaction(async (tx) =>
      createInvoiceRecord(tx, {
        customerId: recurringInvoice.customerId,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: fromKobo(item.rateKobo),
        })),
        discountNaira: fromKobo(recurringInvoice.discountKobo),
        taxRatePercent: recurringInvoice.taxRatePercent,
        dueDate: addDays(now, recurringInvoice.dueInDays),
        comments: recurringInvoice.comments ?? undefined,
        recurringInvoiceId: recurringInvoice.id,
      }),
    )
    invoiceId = invoice.id
    await logRun({ recurringInvoiceId, invoiceId, status: "success", stage: "invoice", attempt })

    if (recurringInvoice.autoGeneratePdf || recurringInvoice.autoSendEmail) {
      const { data: pdfData, pdfBuffer } = await renderInvoicePdfBuffer(invoice.id)
      await logRun({ recurringInvoiceId, invoiceId, status: "success", stage: "pdf", attempt })

      if (recurringInvoice.autoSendEmail) {
        await sendInvoiceEmail({
          to: pdfData.billedToEmail,
          billedToName: pdfData.billedToName,
          issueDate: pdfData.issueDate,
          pdfBuffer,
        })
        await logRun({ recurringInvoiceId, invoiceId, status: "success", stage: "email", attempt })
      }
    }

    const nextOccurrenceCount = recurringInvoice.occurrenceCount + 1
    const nextRunAt = computeAnchoredRunDate(
      recurringInvoice.startDate,
      recurringInvoice.frequency,
      recurringInvoice.customIntervalDays,
      nextOccurrenceCount,
    )
    await db
      .update(recurringInvoices)
      .set({
        nextRunAt,
        occurrenceCount: nextOccurrenceCount,
        lastRunAt: now,
        attemptCount: 0,
        status: hasEnded(recurringInvoice.endDate, nextRunAt) ? "ended" : recurringInvoice.status,
      })
      .where(eq(recurringInvoices.id, recurringInvoiceId))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const stage = invoiceId ? (recurringInvoice.autoSendEmail ? "email" : "pdf") : "invoice"
    await logRun({ recurringInvoiceId, invoiceId, status: "failed", stage, errorMessage, attempt })

    if (attempt < MAX_ATTEMPTS) {
      await db
        .update(recurringInvoices)
        .set({ attemptCount: attempt, nextRunAt: new Date(now.getTime() + RETRY_BACKOFF_MS) })
        .where(eq(recurringInvoices.id, recurringInvoiceId))
    } else {
      const nextOccurrenceCount = recurringInvoice.occurrenceCount + 1
      const nextRunAt = computeAnchoredRunDate(
        recurringInvoice.startDate,
        recurringInvoice.frequency,
        recurringInvoice.customIntervalDays,
        nextOccurrenceCount,
      )
      await db
        .update(recurringInvoices)
        .set({
          attemptCount: 0,
          occurrenceCount: nextOccurrenceCount,
          nextRunAt,
          status: hasEnded(recurringInvoice.endDate, nextRunAt) ? "ended" : recurringInvoice.status,
        })
        .where(eq(recurringInvoices.id, recurringInvoiceId))
    }
  }
}

export async function processDueRecurringInvoices() {
  const due = await db
    .select({ id: recurringInvoices.id })
    .from(recurringInvoices)
    .where(and(eq(recurringInvoices.status, "active"), lte(recurringInvoices.nextRunAt, new Date())))

  for (const { id } of due) {
    await runRecurringInvoiceOccurrence(id)
  }

  return { processed: due.length }
}
