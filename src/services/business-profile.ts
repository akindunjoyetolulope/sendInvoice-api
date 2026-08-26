import { eq } from "drizzle-orm"
import { db } from "../db/client"
import { businessProfile } from "../db/schema"
import type { BusinessProfileInput } from "../validation/invoice"

export function getBusinessProfile() {
  const existing = db.select().from(businessProfile).where(eq(businessProfile.id, 1)).get()
  if (existing) return existing

  db.insert(businessProfile).values({ id: 1 }).run()
  return db.select().from(businessProfile).where(eq(businessProfile.id, 1)).get()!
}

export function saveBusinessProfile(data: BusinessProfileInput) {
  db.insert(businessProfile)
    .values({ id: 1, ...data })
    .onConflictDoUpdate({ target: businessProfile.id, set: data })
    .run()
  return db.select().from(businessProfile).where(eq(businessProfile.id, 1)).get()!
}
