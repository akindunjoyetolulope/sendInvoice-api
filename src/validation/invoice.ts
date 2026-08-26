import { z } from "zod"
import { recurringFrequencyValues } from "../db/schema"

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
})

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z.email("Enter a valid email"),
  phone: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
})

export type CustomerInput = z.infer<typeof customerSchema>

export const createInvoiceSchema = z.object({
  customerId: z.string().optional(),
  newCustomer: customerSchema.optional(),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
  discountNaira: z.coerce.number().min(0).default(0),
  taxRatePercent: z.coerce.number().min(0).max(100).default(0),
  dueDate: z.coerce.date(),
  comments: z.string().optional(),
})

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>

export const businessProfileSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  email: z.email("Enter a valid email"),
  phone: z.string().min(1, "Phone is required"),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  payeeName: z.string().min(1, "Payee name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  currency: z.string().min(1),
})

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>

export const createRecurringInvoiceSchema = z
  .object({
    customerId: z.string().min(1, "Select a customer"),
    lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
    discountNaira: z.coerce.number().min(0).default(0),
    taxRatePercent: z.coerce.number().min(0).max(100).default(0),
    comments: z.string().optional(),
    frequency: z.enum(recurringFrequencyValues),
    customIntervalDays: z.coerce.number().int().positive().optional(),
    dueInDays: z.coerce.number().int().min(0).default(0),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    timezone: z.string().min(1),
    autoSendEmail: z.boolean().default(true),
    autoGeneratePdf: z.boolean().default(true),
  })
  .refine((data) => data.frequency !== "custom" || data.customIntervalDays !== undefined, {
    message: "Enter the number of days for a custom interval",
    path: ["customIntervalDays"],
  })

export type CreateRecurringInvoiceInput = z.infer<typeof createRecurringInvoiceSchema>
