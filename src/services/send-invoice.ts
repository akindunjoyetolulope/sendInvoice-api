import { renderToBuffer } from "@react-pdf/renderer"
import { and, eq } from "drizzle-orm"
import { db } from "../db/client"
import { invoices } from "../db/schema"
import { getInvoiceById } from "./invoices"
import { sendInvoiceEmail } from "./email"
import { formatInvoiceTitle } from "../lib/pdf/format"
import { InvoicePdfDocument } from "../pdf/invoice-pdf-document"

export async function renderInvoicePdfBuffer(userId: string, invoiceId: string) {
  const data = await getInvoiceById(userId, invoiceId)
  const pdfBuffer = await renderToBuffer(InvoicePdfDocument({ data }))
  return { data, pdfBuffer }
}

export async function getInvoicePdfPreview(userId: string, invoiceId: string) {
  const { data, pdfBuffer } = await renderInvoicePdfBuffer(userId, invoiceId)
  return {
    filename: `${formatInvoiceTitle(data.billedToName, data.issueDate)}.pdf`,
    size: pdfBuffer.byteLength,
    base64: pdfBuffer.toString("base64"),
  }
}

export async function sendInvoiceEmailNow(
  userId: string,
  {
    invoiceId,
    subject,
    message,
    attachPdf,
  }: {
    invoiceId: string
    subject?: string
    message?: string
    attachPdf?: boolean
  },
) {
  const { data, pdfBuffer } = await renderInvoicePdfBuffer(userId, invoiceId)

  try {
    await sendInvoiceEmail({
      to: data.billedToEmail,
      billedToName: data.billedToName,
      issueDate: data.issueDate,
      pdfBuffer: attachPdf === false ? undefined : pdfBuffer,
      subject,
      message,
    })
  } catch (error) {
    if (data.status !== "paid") {
      await db
        .update(invoices)
        .set({ status: "failed" })
        .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    }
    throw error
  }

  if (data.status !== "paid") {
    const nextStatus = data.dueDate < new Date() ? "overdue" : "sent"
    await db
      .update(invoices)
      .set({ status: nextStatus })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
  }
}
