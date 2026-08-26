import { Resend } from "resend"
import { formatInvoiceTitle } from "../lib/pdf/format"

export async function sendInvoiceEmail({
  to,
  billedToName,
  issueDate,
  pdfBuffer,
  subject,
  message,
}: {
  to: string
  billedToName: string
  issueDate: Date
  pdfBuffer?: Buffer
  subject?: string
  message?: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY is not set")

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
  const title = formatInvoiceTitle(billedToName, issueDate)

  const text = message
    ? `${message}\n\nPlease find attached invoice ${title}.`
    : `Please find attached invoice ${title}.`

  const { error } = await resend.emails.send({
    from,
    to,
    subject: subject?.trim() || title,
    text,
    attachments: pdfBuffer ? [{ filename: `${title}.pdf`, content: pdfBuffer }] : undefined,
  })

  if (error) throw new Error(error.message)
}
