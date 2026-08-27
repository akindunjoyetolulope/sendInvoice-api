import { and, asc, count, eq, isNull, like, or } from "drizzle-orm"
import { db } from "../db/client"
import { customers, invoices } from "../db/schema"
import type { CustomerInput } from "../validation/invoice"
import { NotFoundError } from "../lib/errors"

export async function listCustomers(userId: string) {
  return db
    .select()
    .from(customers)
    .where(and(eq(customers.userId, userId), isNull(customers.archivedAt)))
    .orderBy(asc(customers.name))
}

export async function searchCustomers(userId: string, data: { query?: string; includeArchived?: boolean }) {
  const conditions = [eq(customers.userId, userId)]
  if (data.query) {
    const term = `%${data.query}%`
    conditions.push(
      or(like(customers.name, term), like(customers.company, term), like(customers.email, term))!,
    )
  }
  if (!data.includeArchived) {
    conditions.push(isNull(customers.archivedAt))
  }

  return db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(asc(customers.name))
}

export async function getCustomerById(userId: string, id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.userId, userId)))
  if (!customer) throw new NotFoundError()
  return customer
}

export async function createCustomer(userId: string, data: CustomerInput) {
  const id = crypto.randomUUID()
  await db.insert(customers).values({ id, userId, ...data })
  return getCustomerById(userId, id)
}

export async function updateCustomer(userId: string, id: string, data: CustomerInput) {
  await db
    .update(customers)
    .set(data)
    .where(and(eq(customers.id, id), eq(customers.userId, userId)))
  return getCustomerById(userId, id)
}

export async function archiveCustomer(userId: string, id: string) {
  await db
    .update(customers)
    .set({ archivedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.userId, userId)))
  return getCustomerById(userId, id)
}

export async function unarchiveCustomer(userId: string, id: string) {
  await db
    .update(customers)
    .set({ archivedAt: null })
    .where(and(eq(customers.id, id), eq(customers.userId, userId)))
  return getCustomerById(userId, id)
}

export async function deleteCustomer(userId: string, id: string) {
  const [{ invoiceCount }] = await db
    .select({ invoiceCount: count() })
    .from(invoices)
    .where(and(eq(invoices.customerId, id), eq(invoices.userId, userId)))

  if (invoiceCount > 0) {
    return { ok: false as const, invoiceCount }
  }

  await db.delete(customers).where(and(eq(customers.id, id), eq(customers.userId, userId)))
  return { ok: true as const }
}
