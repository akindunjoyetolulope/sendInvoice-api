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

recurringInvoiceRoutes.get("/", async (c) => c.json(await listRecurringInvoices(c.get("user").id)))

recurringInvoiceRoutes.post("/", async (c) => {
  const body = createRecurringInvoiceSchema.parse(await c.req.json())
  return c.json(await createRecurringInvoice(c.get("user").id, body), 201)
})

recurringInvoiceRoutes.get("/:id", async (c) =>
  c.json(await getRecurringInvoiceById(c.get("user").id, c.req.param("id"))),
)

recurringInvoiceRoutes.put("/:id", async (c) => {
  const body = createRecurringInvoiceSchema.parse(await c.req.json())
  return c.json(await updateRecurringInvoice(c.get("user").id, c.req.param("id"), body))
})

recurringInvoiceRoutes.post("/:id/pause", async (c) =>
  c.json(await pauseRecurringInvoice(c.get("user").id, c.req.param("id"))),
)
recurringInvoiceRoutes.post("/:id/resume", async (c) =>
  c.json(await resumeRecurringInvoice(c.get("user").id, c.req.param("id"))),
)
recurringInvoiceRoutes.post("/:id/end", async (c) =>
  c.json(await endRecurringInvoice(c.get("user").id, c.req.param("id"))),
)

recurringInvoiceRoutes.post("/:id/run-now", async (c) => {
  await runRecurringInvoiceNow(c.get("user").id, c.req.param("id"))
  return c.body(null, 204)
})
