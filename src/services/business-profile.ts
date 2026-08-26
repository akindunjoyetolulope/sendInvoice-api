import { eq } from "drizzle-orm"
import { db } from "../db/client"
import { businessProfile } from "../db/schema"
import type { BusinessProfileInput } from "../validation/invoice"

export async function getBusinessProfile() {
  const [existing] = await db.select().from(businessProfile).where(eq(businessProfile.id, 1))
  if (existing) return existing

  await db.insert(businessProfile).values({ id: 1 })
  const [created] = await db.select().from(businessProfile).where(eq(businessProfile.id, 1))
  return created!
}

export async function saveBusinessProfile(data: BusinessProfileInput) {
  await db
    .insert(businessProfile)
    .values({ id: 1, ...data })
    .onDuplicateKeyUpdate({ set: data })
  const [updated] = await db.select().from(businessProfile).where(eq(businessProfile.id, 1))
  return updated!
}
