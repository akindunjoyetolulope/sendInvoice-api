import cron from "node-cron"
import { processDueRecurringInvoices } from "./recurring-jobs"
import { sweepOverdueInvoices } from "./invoice-status"

export function startScheduler() {
  cron.schedule("*/5 * * * *", () => {
    processDueRecurringInvoices().catch((error) => {
      console.error("[scheduler] processDueRecurringInvoices failed:", error)
    })

    sweepOverdueInvoices().catch((error) => {
      console.error("[scheduler] sweepOverdueInvoices failed:", error)
    })
  })
  console.log("[scheduler] recurring invoice scheduler started")
}
