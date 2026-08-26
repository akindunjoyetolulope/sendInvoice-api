import { Hono } from "hono"
import { z } from "zod"
import { createInvoice, deleteInvoice, getInvoiceById, listInvoices, updateInvoice } from "../services/invoices"
import { getInvoicePdfPreview, sendInvoiceEmailNow } from "../services/send-invoice"
import { createInvoiceSchema } from "../validation/invoice"

export const invoiceRoutes = new Hono()

invoiceRoutes.get("/", async (c) => c.json(await listInvoices()))

invoiceRoutes.get("/:id/pdf-preview", async (c) => c.json(await getInvoicePdfPreview(c.req.param("id"))))

const sendInvoiceEmailNowSchema = z.object({
  subject: z.string().optional(),
  message: z.string().optional(),
  attachPdf: z.boolean().optional(),
})

invoiceRoutes.post("/:id/send", async (c) => {
  const body = sendInvoiceEmailNowSchema.parse(await c.req.json().catch(() => ({})))
  await sendInvoiceEmailNow({ invoiceId: c.req.param("id"), ...body })
  return c.body(null, 204)
})

invoiceRoutes.get("/:id", async (c) => c.json(await getInvoiceById(c.req.param("id"))))

invoiceRoutes.post("/", async (c) => {
  const body = createInvoiceSchema.parse(await c.req.json())
  return c.json(await createInvoice(body), 201)
})

invoiceRoutes.put("/:id", async (c) => {
  const body = createInvoiceSchema.parse(await c.req.json())
  return c.json(await updateInvoice(c.req.param("id"), body))
})

invoiceRoutes.delete("/:id", async (c) => c.json(await deleteInvoice(c.req.param("id"))))
