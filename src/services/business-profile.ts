import { eq } from "drizzle-orm"
import { db } from "../db/client"
import { businessProfile } from "../db/schema"
import type { BusinessProfileInput } from "../validation/invoice"

export async function getBusinessProfile(userId: string) {
  const [existing] = await db.select().from(businessProfile).where(eq(businessProfile.userId, userId))
  if (existing) return existing

  await db.insert(businessProfile).values({ userId })
  const [created] = await db.select().from(businessProfile).where(eq(businessProfile.userId, userId))
  return created!
}

export async function saveBusinessProfile(userId: string, data: BusinessProfileInput) {
  await db
    .insert(businessProfile)
    .values({ userId, ...data })
    .onDuplicateKeyUpdate({ set: data })
  const [updated] = await db.select().from(businessProfile).where(eq(businessProfile.userId, userId))
  return updated!
}
