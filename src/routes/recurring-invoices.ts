import { Hono } from "hono"
import {
  createRecurringInvoice,
  endRecurringInvoice,
  getRecurringInvoiceById,
  listRecurringInvoices,
  pauseRecurringInvoice,
  resumeRecurringInvoice,
  runRecurringInvoiceNow,
  updateRecurringInvoice,
} from "../services/recurring-invoices"
import { createRecurringInvoiceSchema } from "../validation/invoice"

export const recurringInvoiceRoutes = new Hono()

recurringInvoiceRoutes.get("/", (c) => c.json(listRecurringInvoices()))

recurringInvoiceRoutes.post("/", async (c) => {
  const body = createRecurringInvoiceSchema.parse(await c.req.json())
  return c.json(createRecurringInvoice(body), 201)
})

recurringInvoiceRoutes.get("/:id", (c) => c.json(getRecurringInvoiceById(c.req.param("id"))))

recurringInvoiceRoutes.put("/:id", async (c) => {
  const body = createRecurringInvoiceSchema.parse(await c.req.json())
  return c.json(updateRecurringInvoice(c.req.param("id"), body))
})

recurringInvoiceRoutes.post("/:id/pause", (c) => c.json(pauseRecurringInvoice(c.req.param("id"))))
recurringInvoiceRoutes.post("/:id/resume", (c) => c.json(resumeRecurringInvoice(c.req.param("id"))))
recurringInvoiceRoutes.post("/:id/end", (c) => c.json(endRecurringInvoice(c.req.param("id"))))

recurringInvoiceRoutes.post("/:id/run-now", async (c) => {
  await runRecurringInvoiceNow(c.req.param("id"))
  return c.body(null, 204)
})
