import { Hono } from "hono"
import { getDashboardData } from "../services/dashboard"

export const dashboardRoutes = new Hono()

dashboardRoutes.get("/", async (c) => c.json(await getDashboardData(c.get("user").id)))
