import { relations, sql } from "drizzle-orm"
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core"

export const businessProfile = sqliteTable("business_profile", {
  id: integer("id").primaryKey().default(1),
  businessName: text("business_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  addressLine1: text("address_line1").notNull().default(""),
  addressLine2: text("address_line2"),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  country: text("country").notNull().default(""),
  payeeName: text("payee_name").notNull().default(""),
  bankName: text("bank_name").notNull().default(""),
  accountNumber: text("account_number").notNull().default(""),
  currency: text("currency").notNull().default("NGN"),
  nextInvoiceNumber: integer("next_invoice_number").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
})

export const customers = sqliteTable("customers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email").notNull(),
  phone: text("phone"),
  billingAddress: text("billing_address"),
  shippingAddress: text("shipping_address"),
  taxId: text("tax_id"),
  notes: text("notes"),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const invoiceStatusValues = ["draft", "sent", "paid", "overdue", "failed"] as const
export type InvoiceStatus = (typeof invoiceStatusValues)[number]

export const invoices = sqliteTable("invoices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  status: text("status", { enum: invoiceStatusValues }).notNull().default("draft"),
  currency: text("currency").notNull(),
  issueDate: integer("issue_date", { mode: "timestamp" }).notNull(),
  dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
  comments: text("comments"),
  subtotalKobo: integer("subtotal_kobo").notNull(),
  discountKobo: integer("discount_kobo").notNull().default(0),
  taxRatePercent: real("tax_rate_percent").notNull().default(0),
  taxKobo: integer("tax_kobo").notNull().default(0),
  totalDueKobo: integer("total_due_kobo").notNull(),
  // Snapshots so past invoices don't change if the business profile or customer is edited later.
  billedToName: text("billed_to_name").notNull(),
  billedToEmail: text("billed_to_email").notNull(),
  businessNameSnapshot: text("business_name_snapshot").notNull(),
  businessAddressSnapshot: text("business_address_snapshot").notNull(),
  businessPhoneSnapshot: text("business_phone_snapshot").notNull(),
  payeeNameSnapshot: text("payee_name_snapshot").notNull(),
  bankNameSnapshot: text("bank_name_snapshot").notNull(),
  accountNumberSnapshot: text("account_number_snapshot").notNull(),
  recurringInvoiceId: text("recurring_invoice_id").references(() => recurringInvoices.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
})

export const invoiceLineItems = sqliteTable("invoice_line_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: real("quantity").notNull(),
  rateKobo: integer("rate_kobo").notNull(),
  lineTotalKobo: integer("line_total_kobo").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
})

export const recurringFrequencyValues = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
] as const
export type RecurringFrequency = (typeof recurringFrequencyValues)[number]

export const recurringStatusValues = ["active", "paused", "ended"] as const
export type RecurringStatus = (typeof recurringStatusValues)[number]

export const recurringInvoices = sqliteTable("recurring_invoices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  discountKobo: integer("discount_kobo").notNull().default(0),
  taxRatePercent: real("tax_rate_percent").notNull().default(0),
  comments: text("comments"),
  frequency: text("frequency", { enum: recurringFrequencyValues }).notNull(),
  customIntervalDays: integer("custom_interval_days"),
  dueInDays: integer("due_in_days").notNull().default(0),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }),
  timezone: text("timezone").notNull().default("UTC"),
  autoSendEmail: integer("auto_send_email", { mode: "boolean" }).notNull().default(true),
  autoGeneratePdf: integer("auto_generate_pdf", { mode: "boolean" }).notNull().default(true),
  status: text("status", { enum: recurringStatusValues }).notNull().default("active"),
  nextRunAt: integer("next_run_at", { mode: "timestamp" }).notNull(),
  lastRunAt: integer("last_run_at", { mode: "timestamp" }),
  attemptCount: integer("attempt_count").notNull().default(0),
  occurrenceCount: integer("occurrence_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
})

export const recurringInvoiceLineItems = sqliteTable("recurring_invoice_line_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recurringInvoiceId: text("recurring_invoice_id")
    .notNull()
    .references(() => recurringInvoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: real("quantity").notNull(),
  rateKobo: integer("rate_kobo").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
})

export const runLogStatusValues = ["success", "failed"] as const
export const runLogStageValues = ["invoice", "pdf", "email"] as const

export const invoiceRunLogs = sqliteTable("invoice_run_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recurringInvoiceId: text("recurring_invoice_id")
    .notNull()
    .references(() => recurringInvoices.id, { onDelete: "cascade" }),
  invoiceId: text("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  runAt: integer("run_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  status: text("status", { enum: runLogStatusValues }).notNull(),
  stage: text("stage", { enum: runLogStageValues }).notNull(),
  errorMessage: text("error_message"),
  attempt: integer("attempt").notNull().default(1),
})

export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
  recurringInvoices: many(recurringInvoices),
}))

export const recurringInvoicesRelations = relations(recurringInvoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [recurringInvoices.customerId],
    references: [customers.id],
  }),
  lineItems: many(recurringInvoiceLineItems),
  runLogs: many(invoiceRunLogs),
}))

export const recurringInvoiceLineItemsRelations = relations(recurringInvoiceLineItems, ({ one }) => ({
  recurringInvoice: one(recurringInvoices, {
    fields: [recurringInvoiceLineItems.recurringInvoiceId],
    references: [recurringInvoices.id],
  }),
}))

export const invoiceRunLogsRelations = relations(invoiceRunLogs, ({ one }) => ({
  recurringInvoice: one(recurringInvoices, {
    fields: [invoiceRunLogs.recurringInvoiceId],
    references: [recurringInvoices.id],
  }),
  invoice: one(invoices, {
    fields: [invoiceRunLogs.invoiceId],
    references: [invoices.id],
  }),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  lineItems: many(invoiceLineItems),
}))

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [invoices.id],
  }),
}))
