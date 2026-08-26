CREATE TABLE `invoice_run_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recurring_invoice_id` text NOT NULL,
	`invoice_id` text,
	`run_at` integer DEFAULT (unixepoch()) NOT NULL,
	`status` text NOT NULL,
	`stage` text NOT NULL,
	`error_message` text,
	`attempt` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`recurring_invoice_id`) REFERENCES `recurring_invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `recurring_invoice_line_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recurring_invoice_id` text NOT NULL,
	`description` text NOT NULL,
	`quantity` real NOT NULL,
	`rate_kobo` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`recurring_invoice_id`) REFERENCES `recurring_invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recurring_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`discount_kobo` integer DEFAULT 0 NOT NULL,
	`tax_rate_percent` real DEFAULT 0 NOT NULL,
	`comments` text,
	`frequency` text NOT NULL,
	`custom_interval_days` integer,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`auto_send_email` integer DEFAULT true NOT NULL,
	`auto_generate_pdf` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`next_run_at` integer NOT NULL,
	`last_run_at` integer,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
ALTER TABLE `invoices` ADD `recurring_invoice_id` text REFERENCES recurring_invoices(id);