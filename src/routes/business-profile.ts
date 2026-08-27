import { Hono } from "hono"
import { getBusinessProfile, saveBusinessProfile } from "../services/business-profile"
import { businessProfileSchema } from "../validation/invoice"

export const businessProfileRoutes = new Hono()

businessProfileRoutes.get("/", async (c) => c.json(await getBusinessProfile(c.get("user").id)))

businessProfileRoutes.put("/", async (c) => {
  const body = businessProfileSchema.parse(await c.req.json())
  return c.json(await saveBusinessProfile(c.get("user").id, body))
})
