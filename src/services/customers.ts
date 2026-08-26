import { and, asc, count, eq, isNull, isNotNull, like, or } from "drizzle-orm"
import { db } from "../db/client"
import { customers, invoices } from "../db/schema"
import type { CustomerInput } from "../validation/invoice"
import { NotFoundError } from "../lib/errors"

export async function listCustomers() {
  return db.select().from(customers).where(isNull(customers.archivedAt)).orderBy(asc(customers.name))
}

export async function searchCustomers(data: { query?: string; includeArchived?: boolean }) {
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
}

export async function getCustomerById(id: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, id))
  if (!customer) throw new NotFoundError()
  return customer
}

export async function createCustomer(data: CustomerInput) {
  const id = crypto.randomUUID()
  await db.insert(customers).values({ id, ...data })
  return getCustomerById(id)
}

export async function updateCustomer(id: string, data: CustomerInput) {
  await db.update(customers).set(data).where(eq(customers.id, id))
  return getCustomerById(id)
}

export async function archiveCustomer(id: string) {
  await db.update(customers).set({ archivedAt: new Date() }).where(eq(customers.id, id))
  return getCustomerById(id)
}

export async function unarchiveCustomer(id: string) {
  await db.update(customers).set({ archivedAt: null }).where(eq(customers.id, id))
  return getCustomerById(id)
}

export async function deleteCustomer(id: string) {
  const [{ invoiceCount }] = await db
    .select({ invoiceCount: count() })
    .from(invoices)
    .where(eq(invoices.customerId, id))

  if (invoiceCount > 0) {
    return { ok: false as const, invoiceCount }
  }

  await db.delete(customers).where(eq(customers.id, id))
  return { ok: true as const }
}
