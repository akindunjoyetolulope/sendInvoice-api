import { OAuth2Client } from "google-auth-library"
import { eq } from "drizzle-orm"
import { db } from "../db/client"
import { users } from "../db/schema"

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export interface GoogleProfile {
  email: string
  name?: string
  picture?: string
}

export interface SessionUser {
  id: string
  email: string
  name?: string
  picture?: string
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload()
  if (!payload?.email || !payload.email_verified) {
    throw new Error("Google account could not be verified")
  }
  return { email: payload.email, name: payload.name, picture: payload.picture }
}

/** Finds this Google account's user row, creating one on first sign-in. Each user's data is fully isolated. */
export async function findOrCreateUser(profile: GoogleProfile): Promise<SessionUser> {
  const [existing] = await db.select().from(users).where(eq(users.email, profile.email))
  if (existing) {
    if (existing.name !== profile.name || existing.picture !== profile.picture) {
      await db
        .update(users)
        .set({ name: profile.name, picture: profile.picture })
        .where(eq(users.id, existing.id))
    }
    return { id: existing.id, email: existing.email, name: profile.name, picture: profile.picture }
  }

  const id = crypto.randomUUID()
  await db.insert(users).values({ id, email: profile.email, name: profile.name, picture: profile.picture })
  return { id, email: profile.email, name: profile.name, picture: profile.picture }
}
