import type { Context, Next } from "hono"
import { getCookie } from "hono/cookie"
import { verify } from "hono/jwt"
import { SESSION_COOKIE } from "../lib/session"

export interface SessionUser {
  email: string
  name?: string
  picture?: string
}

declare module "hono" {
  interface ContextVariableMap {
    user: SessionUser
  }
}

export async function requireAuth(c: Context, next: Next) {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return c.json({ error: "Unauthorized" }, 401)

  try {
    const payload = await verify(token, process.env.SESSION_SECRET!, "HS256")
    c.set("user", {
      email: payload.email as string,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
    })
  } catch {
    return c.json({ error: "Unauthorized" }, 401)
  }

  await next()
}
