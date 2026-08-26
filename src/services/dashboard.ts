import { count, desc } from "drizzle-orm"
import { db } from "../db/client"
import { customers, invoices } from "../db/schema"
import { getBusinessProfile } from "./business-profile"

type EffectiveStatus = "paid" | "pending" | "overdue"

function effectiveStatus(status: string, dueDate: Date, now: Date): EffectiveStatus {
  if (status === "paid") return "paid"
  return dueDate < now ? "overdue" : "pending"
}

export function getDashboardData() {
  const now = new Date()
  const businessProfile = getBusinessProfile()
  const allInvoices = db.select().from(invoices).orderBy(desc(invoices.createdAt)).all()
  const [{ customerCount }] = db.select({ customerCount: count() }).from(customers).all()

  let totalRevenueKobo = 0
  let paidCount = 0
  let pendingCount = 0
  let overdueCount = 0

  const months: { key: string; label: string; revenueKobo: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      revenueKobo: 0,
    })
  }
  const monthByKey = new Map(months.map((m) => [m.key, m]))

  for (const invoice of allInvoices) {
    const status = effectiveStatus(invoice.status, invoice.dueDate, now)
    if (status === "paid") {
      paidCount++
      totalRevenueKobo += invoice.totalDueKobo
      const issue = invoice.issueDate
      const key = `${issue.getFullYear()}-${issue.getMonth()}`
      const bucket = monthByKey.get(key)
      if (bucket) bucket.revenueKobo += invoice.totalDueKobo
    } else if (status === "overdue") {
      overdueCount++
    } else {
      pendingCount++
    }
  }

  const recentInvoices = allInvoices.slice(0, 5).map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    billedToName: invoice.billedToName,
    effectiveStatus: effectiveStatus(invoice.status, invoice.dueDate, now),
    totalDueKobo: invoice.totalDueKobo,
    issueDate: invoice.issueDate,
  }))

  return {
    currency: businessProfile.currency,
    totalRevenueKobo,
    paidCount,
    pendingCount,
    overdueCount,
    customerCount,
    revenueByMonth: months.map(({ label, revenueKobo }) => ({ label, revenueKobo })),
    recentInvoices,
  }
}
