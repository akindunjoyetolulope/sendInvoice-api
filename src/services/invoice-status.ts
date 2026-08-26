import { and, inArray, lt } from "drizzle-orm"
import { db } from "../db/client"
import { invoices } from "../db/schema"

/** Promotes unpaid invoices past their due date to "overdue". Run periodically by the scheduler. */
export async function sweepOverdueInvoices() {
  await db
    .update(invoices)
    .set({ status: "overdue" })
    .where(and(inArray(invoices.status, ["draft", "sent"]), lt(invoices.dueDate, new Date())))
}
