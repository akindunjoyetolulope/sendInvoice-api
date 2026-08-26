import { Hono } from "hono"
import { getDashboardData } from "../services/dashboard"

export const dashboardRoutes = new Hono()

dashboardRoutes.get("/", (c) => c.json(getDashboardData()))
