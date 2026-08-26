import { Hono } from "hono"
import { getBusinessProfile, saveBusinessProfile } from "../services/business-profile"
import { businessProfileSchema } from "../validation/invoice"

export const businessProfileRoutes = new Hono()

businessProfileRoutes.get("/", (c) => c.json(getBusinessProfile()))

businessProfileRoutes.put("/", async (c) => {
  const body = businessProfileSchema.parse(await c.req.json())
  return c.json(saveBusinessProfile(body))
})
