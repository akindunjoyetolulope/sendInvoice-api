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

customerRoutes.get("/", (c) => c.json(listCustomers()))

customerRoutes.get("/search", (c) => {
  const query = c.req.query("query") || undefined
  const includeArchived = c.req.query("includeArchived") === "true"
  return c.json(searchCustomers({ query, includeArchived }))
})

customerRoutes.get("/:id", (c) => c.json(getCustomerById(c.req.param("id"))))

customerRoutes.post("/", async (c) => {
  const body = customerSchema.parse(await c.req.json())
  return c.json(createCustomer(body), 201)
})

customerRoutes.put("/:id", async (c) => {
  const body = customerSchema.parse(await c.req.json())
  return c.json(updateCustomer(c.req.param("id"), body))
})

customerRoutes.post("/:id/archive", (c) => c.json(archiveCustomer(c.req.param("id"))))
customerRoutes.post("/:id/unarchive", (c) => c.json(unarchiveCustomer(c.req.param("id"))))
customerRoutes.delete("/:id", (c) => c.json(deleteCustomer(c.req.param("id"))))
