import { and, asc, count, eq, isNull, isNotNull, like, or } from "drizzle-orm"
import { db } from "../db/client"
import { customers, invoices } from "../db/schema"
import type { CustomerInput } from "../validation/invoice"
import { NotFoundError } from "../lib/errors"

export function listCustomers() {
  return db.select().from(customers).where(isNull(customers.archivedAt)).orderBy(asc(customers.name)).all()
}

export function searchCustomers(data: { query?: string; includeArchived?: boolean }) {
  const conditions = []
  if (data.query) {
    const term = `%${data.query}%`
    conditions.push(
      or(like(customers.name, term), like(customers.company, term), like(customers.email, term)),
    )
  }
  conditions.push(data.includeArchived ? isNotNull(customers.id) : isNull(customers.archivedAt))

  return db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(asc(customers.name))
    .all()
}

export function getCustomerById(id: string) {
  const customer = db.select().from(customers).where(eq(customers.id, id)).get()
  if (!customer) throw new NotFoundError()
  return customer
}

export function createCustomer(data: CustomerInput) {
  return db.insert(customers).values(data).returning().get()
}

export function updateCustomer(id: string, data: CustomerInput) {
  return db.update(customers).set(data).where(eq(customers.id, id)).returning().get()
}

export function archiveCustomer(id: string) {
  return db.update(customers).set({ archivedAt: new Date() }).where(eq(customers.id, id)).returning().get()
}

export function unarchiveCustomer(id: string) {
  return db.update(customers).set({ archivedAt: null }).where(eq(customers.id, id)).returning().get()
}

export function deleteCustomer(id: string) {
  const [{ invoiceCount }] = db
    .select({ invoiceCount: count() })
    .from(invoices)
    .where(eq(invoices.customerId, id))
    .all()

  if (invoiceCount > 0) {
    return { ok: false as const, invoiceCount }
  }

  db.delete(customers).where(eq(customers.id, id)).run()
  return { ok: true as const }
}
