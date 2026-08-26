CREATE TABLE `business_profile` (
	`id` int NOT NULL DEFAULT 1,
	`business_name` varchar(255) NOT NULL DEFAULT '',
	`email` varchar(255) NOT NULL DEFAULT '',
	`phone` varchar(50) NOT NULL DEFAULT '',
	`address_line1` varchar(255) NOT NULL DEFAULT '',
	`address_line2` varchar(255),
	`city` varchar(120) NOT NULL DEFAULT '',
	`state` varchar(120) NOT NULL DEFAULT '',
	`country` varchar(120) NOT NULL DEFAULT '',
	`payee_name` varchar(255) NOT NULL DEFAULT '',
	`bank_name` varchar(255) NOT NULL DEFAULT '',
	`account_number` varchar(64) NOT NULL DEFAULT '',
	`currency` varchar(8) NOT NULL DEFAULT 'NGN',
	`next_invoice_number` int NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `business_profile_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`company` varchar(255),
	`email` varchar(255) NOT NULL,
	`phone` varchar(50),
	`billing_address` text,
	`shipping_address` text,
	`tax_id` varchar(100),
	`notes` text,
	`archived_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_id` varchar(36) NOT NULL,
	`description` text NOT NULL,
	`quantity` double NOT NULL,
	`rate_kobo` bigint NOT NULL,
	`line_total_kobo` bigint NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `invoice_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_run_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recurring_invoice_id` varchar(36) NOT NULL,
	`invoice_id` varchar(36),
	`run_at` datetime NOT NULL,
	`status` enum('success','failed') NOT NULL,
	`stage` enum('invoice','pdf','email') NOT NULL,
	`error_message` text,
	`attempt` int NOT NULL DEFAULT 1,
	CONSTRAINT `invoice_run_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(36) NOT NULL,
	`invoice_number` varchar(64) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`status` enum('draft','sent','paid','overdue','failed') NOT NULL DEFAULT 'draft',
	`currency` varchar(8) NOT NULL,
	`issue_date` datetime NOT NULL,
	`due_date` datetime NOT NULL,
	`comments` text,
	`subtotal_kobo` bigint NOT NULL,
	`discount_kobo` bigint NOT NULL DEFAULT 0,
	`tax_rate_percent` double NOT NULL DEFAULT 0,
	`tax_kobo` bigint NOT NULL DEFAULT 0,
	`total_due_kobo` bigint NOT NULL,
	`billed_to_name` varchar(255) NOT NULL,
	`billed_to_email` varchar(255) NOT NULL,
	`business_name_snapshot` varchar(255) NOT NULL,
	`business_address_snapshot` text NOT NULL,
	`business_phone_snapshot` varchar(50) NOT NULL,
	`payee_name_snapshot` varchar(255) NOT NULL,
	`bank_name_snapshot` varchar(255) NOT NULL,
	`account_number_snapshot` varchar(64) NOT NULL,
	`recurring_invoice_id` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoice_number_unique` UNIQUE(`invoice_number`)
);
--> statement-breakpoint
CREATE TABLE `recurring_invoice_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recurring_invoice_id` varchar(36) NOT NULL,
	`description` text NOT NULL,
	`quantity` double NOT NULL,
	`rate_kobo` bigint NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `recurring_invoice_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recurring_invoices` (
	`id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`discount_kobo` bigint NOT NULL DEFAULT 0,
	`tax_rate_percent` double NOT NULL DEFAULT 0,
	`comments` text,
	`frequency` enum('daily','weekly','biweekly','monthly','quarterly','yearly','custom') NOT NULL,
	`custom_interval_days` int,
	`due_in_days` int NOT NULL DEFAULT 0,
	`start_date` datetime NOT NULL,
	`end_date` datetime,
	`timezone` varchar(64) NOT NULL DEFAULT 'UTC',
	`auto_send_email` boolean NOT NULL DEFAULT true,
	`auto_generate_pdf` boolean NOT NULL DEFAULT true,
	`status` enum('active','paused','ended') NOT NULL DEFAULT 'active',
	`next_run_at` datetime NOT NULL,
	`last_run_at` datetime,
	`attempt_count` int NOT NULL DEFAULT 0,
	`occurrence_count` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `recurring_invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `invoice_line_items` ADD CONSTRAINT `invoice_line_items_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_run_logs` ADD CONSTRAINT `invoice_run_logs_recurring_invoice_id_recurring_invoices_id_fk` FOREIGN KEY (`recurring_invoice_id`) REFERENCES `recurring_invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_run_logs` ADD CONSTRAINT `invoice_run_logs_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_recurring_invoice_id_recurring_invoices_id_fk` FOREIGN KEY (`recurring_invoice_id`) REFERENCES `recurring_invoices`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recurring_invoice_line_items` ADD CONSTRAINT `recurring_invoice_line_items_recurring_invoice_id_recurring_invoices_id_fk` FOREIGN KEY (`recurring_invoice_id`) REFERENCES `recurring_invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recurring_invoices` ADD CONSTRAINT `recurring_invoices_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE restrict ON UPDATE no action;