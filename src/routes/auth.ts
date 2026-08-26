import { Hono } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { sign, verify } from "hono/jwt"
import { z } from "zod"
import { verifyGoogleIdToken } from "../services/auth"
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "../lib/session"

export const authRoutes = new Hono()

const googleLoginSchema = z.object({ credential: z.string().min(1) })

authRoutes.post("/google", async (c) => {
  const { credential } = googleLoginSchema.parse(await c.req.json())
  const profile = await verifyGoogleIdToken(credential)

  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const token = await sign(
    { email: profile.email, name: profile.name, picture: profile.picture, exp },
    process.env.SESSION_SECRET!,
  )

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  })

  return c.json(profile)
})

authRoutes.post("/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" })
  return c.body(null, 204)
})

authRoutes.get("/me", async (c) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return c.json({ error: "Unauthorized" }, 401)

  try {
    const payload = await verify(token, process.env.SESSION_SECRET!, "HS256")
    return c.json({ email: payload.email, name: payload.name, picture: payload.picture })
  } catch {
    return c.json({ error: "Unauthorized" }, 401)
  }
})
