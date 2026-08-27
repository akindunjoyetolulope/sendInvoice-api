import { Hono } from "hono"
import {
  archiveCustomer,
  createCustomer,
  deleteCustomer,
  getCustomerById,
  listCustomers,
  searchCustomers,
  unarchiveCustomer,
  updateCustomer,
} from "../services/customers"
import { customerSchema } from "../validation/invoice"

export const customerRoutes = new Hono()

customerRoutes.get("/", async (c) => c.json(await listCustomers(c.get("user").id)))

customerRoutes.get("/search", async (c) => {
  const query = c.req.query("query") || undefined
  const includeArchived = c.req.query("includeArchived") === "true"
  return c.json(await searchCustomers(c.get("user").id, { query, includeArchived }))
})

customerRoutes.get("/:id", async (c) => c.json(await getCustomerById(c.get("user").id, c.req.param("id"))))

customerRoutes.post("/", async (c) => {
  const body = customerSchema.parse(await c.req.json())
  return c.json(await createCustomer(c.get("user").id, body), 201)
})

customerRoutes.put("/:id", async (c) => {
  const body = customerSchema.parse(await c.req.json())
  return c.json(await updateCustomer(c.get("user").id, c.req.param("id"), body))
})

customerRoutes.post("/:id/archive", async (c) =>
  c.json(await archiveCustomer(c.get("user").id, c.req.param("id"))),
)
customerRoutes.post("/:id/unarchive", async (c) =>
  c.json(await unarchiveCustomer(c.get("user").id, c.req.param("id"))),
)
customerRoutes.delete("/:id", async (c) => c.json(await deleteCustomer(c.get("user").id, c.req.param("id"))))
