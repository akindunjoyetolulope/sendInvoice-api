import { addDays, addMonths, addQuarters, addWeeks, addYears } from "date-fns"
import type { RecurringFrequency } from "../db/schema"

/**
 * Computes the Nth occurrence date, always anchored to the original
 * `startDate` rather than chained off the previous occurrence. Frequencies
 * like monthly/yearly clamp to the last valid day of a short month (e.g.
 * Jan 31 -> Feb 28), and chaining from that clamped date would permanently
 * drift the schedule off its original day (Feb 28 -> Mar 28 instead of
 * Mar 31). Recomputing from `startDate` each time means a short month only
 * affects that one occurrence.
 */
export function computeAnchoredRunDate(
  startDate: Date,
  frequency: RecurringFrequency,
  customIntervalDays: number | null | undefined,
  occurrenceCount: number,
): Date {
  switch (frequency) {
    case "daily":
      return addDays(startDate, occurrenceCount)
    case "weekly":
      return addWeeks(startDate, occurrenceCount)
    case "biweekly":
      return addWeeks(startDate, occurrenceCount * 2)
    case "monthly":
      return addMonths(startDate, occurrenceCount)
    case "quarterly":
      return addQuarters(startDate, occurrenceCount)
    case "yearly":
      return addYears(startDate, occurrenceCount)
    case "custom":
      return addDays(startDate, occurrenceCount * Math.max(1, customIntervalDays ?? 1))
  }
}

export function hasEnded(endDate: Date | null, asOf: Date): boolean {
  return endDate !== null && asOf >= endDate
}
