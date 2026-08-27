import { relations } from "drizzle-orm"
import {
  bigint,
  boolean,
  datetime,
  double,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  unique,
  varchar,
} from "drizzle-orm/mysql-core"

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  picture: varchar("picture", { length: 512 }),
  createdAt: datetime("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const businessProfile = mysqlTable("business_profile", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  businessName: varchar("business_name", { length: 255 }).notNull().default(""),
  email: varchar("email", { length: 255 }).notNull().default(""),
  phone: varchar("phone", { length: 50 }).notNull().default(""),
  addressLine1: varchar("address_line1", { length: 255 }).notNull().default(""),
  addressLine2: varchar("address_line2", { length: 255 }),
  city: varchar("city", { length: 120 }).notNull().default(""),
  state: varchar("state", { length: 120 }).notNull().default(""),
  country: varchar("country", { length: 120 }).notNull().default(""),
  payeeName: varchar("payee_name", { length: 255 }).notNull().default(""),
  bankName: varchar("bank_name", { length: 255 }).notNull().default(""),
  accountNumber: varchar("account_number", { length: 64 }).notNull().default(""),
  currency: varchar("currency", { length: 8 }).notNull().default("NGN"),
  nextInvoiceNumber: int("next_invoice_number").notNull().default(1),
  createdAt: datetime("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
})

export const customers = mysqlTable("customers", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  billingAddress: text("billing_address"),
  shippingAddress: text("shipping_address"),
  taxId: varchar("tax_id", { length: 100 }),
  notes: text("notes"),
  archivedAt: datetime("archived_at", { mode: "date" }),
  createdAt: datetime("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const invoiceStatusValues = ["draft", "sent", "paid", "overdue", "failed"] as const
export type InvoiceStatus = (typeof invoiceStatusValues)[number]

export const invoices = mysqlTable(
  "invoices",
  {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 64 }).notNull(),
  customerId: varchar("customer_id", { length: 36 })
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  status: mysqlEnum("status", invoiceStatusValues).notNull().default("draft"),
  currency: varchar("currency", { length: 8 }).notNull(),
  issueDate: datetime("issue_date", { mode: "date" }).notNull(),
  dueDate: datetime("due_date", { mode: "date" }).notNull(),
  comments: text("comments"),
  subtotalKobo: bigint("subtotal_kobo", { mode: "number" }).notNull(),
  discountKobo: bigint("discount_kobo", { mode: "number" }).notNull().default(0),
  taxRatePercent: double("tax_rate_percent").notNull().default(0),
  taxKobo: bigint("tax_kobo", { mode: "number" }).notNull().default(0),
  totalDueKobo: bigint("total_due_kobo", { mode: "number" }).notNull(),
  // Snapshots so past invoices don't change if the business profile or customer is edited later.
  billedToName: varchar("billed_to_name", { length: 255 }).notNull(),
  billedToEmail: varchar("billed_to_email", { length: 255 }).notNull(),
  businessNameSnapshot: varchar("business_name_snapshot", { length: 255 }).notNull(),
  businessAddressSnapshot: text("business_address_snapshot").notNull(),
  businessPhoneSnapshot: varchar("business_phone_snapshot", { length: 50 }).notNull(),
  payeeNameSnapshot: varchar("payee_name_snapshot", { length: 255 }).notNull(),
  bankNameSnapshot: varchar("bank_name_snapshot", { length: 255 }).notNull(),
  accountNumberSnapshot: varchar("account_number_snapshot", { length: 64 }).notNull(),
  recurringInvoiceId: varchar("recurring_invoice_id", { length: 36 }).references(() => recurringInvoices.id, {
    onDelete: "set null",
  }),
  createdAt: datetime("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
  },
  (table) => [unique("invoices_user_invoice_number_unique").on(table.userId, table.invoiceNumber)],
)

export const invoiceLineItems = mysqlTable("invoice_line_items", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: varchar("invoice_id", { length: 36 })
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: double("quantity").notNull(),
  rateKobo: bigint("rate_kobo", { mode: "number" }).notNull(),
  lineTotalKobo: bigint("line_total_kobo", { mode: "number" }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
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

export const recurringInvoices = mysqlTable("recurring_invoices", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id", { length: 36 })
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  discountKobo: bigint("discount_kobo", { mode: "number" }).notNull().default(0),
  taxRatePercent: double("tax_rate_percent").notNull().default(0),
  comments: text("comments"),
  frequency: mysqlEnum("frequency", recurringFrequencyValues).notNull(),
  customIntervalDays: int("custom_interval_days"),
  dueInDays: int("due_in_days").notNull().default(0),
  startDate: datetime("start_date", { mode: "date" }).notNull(),
  endDate: datetime("end_date", { mode: "date" }),
  timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
  autoSendEmail: boolean("auto_send_email").notNull().default(true),
  autoGeneratePdf: boolean("auto_generate_pdf").notNull().default(true),
  status: mysqlEnum("status", recurringStatusValues).notNull().default("active"),
  nextRunAt: datetime("next_run_at", { mode: "date" }).notNull(),
  lastRunAt: datetime("last_run_at", { mode: "date" }),
  attemptCount: int("attempt_count").notNull().default(0),
  occurrenceCount: int("occurrence_count").notNull().default(0),
  createdAt: datetime("created_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
})

export const recurringInvoiceLineItems = mysqlTable("recurring_invoice_line_items", {
  id: int("id").autoincrement().primaryKey(),
  recurringInvoiceId: varchar("recurring_invoice_id", { length: 36 })
    .notNull()
    .references(() => recurringInvoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: double("quantity").notNull(),
  rateKobo: bigint("rate_kobo", { mode: "number" }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
})

export const runLogStatusValues = ["success", "failed"] as const
export const runLogStageValues = ["invoice", "pdf", "email"] as const

export const invoiceRunLogs = mysqlTable("invoice_run_logs", {
  id: int("id").autoincrement().primaryKey(),
  recurringInvoiceId: varchar("recurring_invoice_id", { length: 36 })
    .notNull()
    .references(() => recurringInvoices.id, { onDelete: "cascade" }),
  invoiceId: varchar("invoice_id", { length: 36 }).references(() => invoices.id, { onDelete: "set null" }),
  runAt: datetime("run_at", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  status: mysqlEnum("status", runLogStatusValues).notNull(),
  stage: mysqlEnum("stage", runLogStageValues).notNull(),
  errorMessage: text("error_message"),
  attempt: int("attempt").notNull().default(1),
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
