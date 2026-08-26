import "dotenv/config"
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { ZodError } from "zod"
import { runMigrations } from "./db/client"
import { startScheduler } from "./services/scheduler"
import { NotFoundError } from "./lib/errors"
import { requireAuth } from "./middleware/auth"
import { authRoutes } from "./routes/auth"
import { businessProfileRoutes } from "./routes/business-profile"
import { customerRoutes } from "./routes/customers"
import { invoiceRoutes } from "./routes/invoices"
import { recurringInvoiceRoutes } from "./routes/recurring-invoices"
import { dashboardRoutes } from "./routes/dashboard"

if (!process.env.GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is not set")
if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is not set")

runMigrations()
startScheduler()

const app = new Hono()

app.use(
  "/api/*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
)

app.get("/health", (c) => c.json({ ok: true }))

app.route("/api/auth", authRoutes)

const protectedApi = new Hono()
protectedApi.use("*", requireAuth)
protectedApi.route("/business-profile", businessProfileRoutes)
protectedApi.route("/customers", customerRoutes)
protectedApi.route("/invoices", invoiceRoutes)
protectedApi.route("/recurring-invoices", recurringInvoiceRoutes)
protectedApi.route("/dashboard", dashboardRoutes)

app.route("/api", protectedApi)

app.onError((error, c) => {
  if (error instanceof NotFoundError) {
    return c.json({ error: error.message }, 404)
  }
  if (error instanceof ZodError) {
    return c.json({ error: "Validation failed", issues: error.issues }, 400)
  }
  if (error instanceof Error) {
    console.error(error)
    return c.json({ error: error.message }, 400)
  }
  console.error(error)
  return c.json({ error: "Internal server error" }, 500)
})

const port = Number(process.env.PORT ?? 4000)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`sendInvoice-api listening on http://localhost:${info.port}`)
})
