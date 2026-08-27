import { Hono } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { sign, verify } from "hono/jwt"
import { z } from "zod"
import { findOrCreateUser, verifyGoogleIdToken } from "../services/auth"
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "../lib/session"

export const authRoutes = new Hono()

const googleLoginSchema = z.object({ credential: z.string().min(1) })

// In production the frontend (Vercel) and this API (Railway) are on different
// domains, so the session cookie is cross-site from the browser's point of
// view. Cross-site cookies require SameSite=None, and browsers only honor
// SameSite=None when Secure is also set. Locally, frontend and backend are
// both "localhost" (same-site — cookies ignore port), so Lax works and
// Secure isn't needed since there's no HTTPS in dev.
const isProduction = process.env.NODE_ENV === "production"
const sessionCookieOptions = {
  httpOnly: true,
  sameSite: isProduction ? ("None" as const) : ("Lax" as const),
  secure: isProduction,
  path: "/",
}

authRoutes.post("/google", async (c) => {
  const { credential } = googleLoginSchema.parse(await c.req.json())
  const profile = await verifyGoogleIdToken(credential)
  const user = await findOrCreateUser(profile)

  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const token = await sign(
    { id: user.id, email: user.email, name: user.name, picture: user.picture, exp },
    process.env.SESSION_SECRET!,
  )

  setCookie(c, SESSION_COOKIE, token, { ...sessionCookieOptions, maxAge: SESSION_TTL_SECONDS })

  return c.json(user)
})

authRoutes.post("/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE, sessionCookieOptions)
  return c.body(null, 204)
})

authRoutes.get("/me", async (c) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return c.json({ error: "Unauthorized" }, 401)

  try {
    const payload = await verify(token, process.env.SESSION_SECRET!, "HS256")
    return c.json({ id: payload.id, email: payload.email, name: payload.name, picture: payload.picture })
  } catch {
    return c.json({ error: "Unauthorized" }, 401)
  }
})
