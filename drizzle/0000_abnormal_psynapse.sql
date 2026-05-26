CREATE TABLE `orgs` (
	`id` varchar(36) NOT NULL,
	`clerk_org_id` varchar(255),
	`name` varchar(255) NOT NULL,
	`plan_tier` varchar(50) NOT NULL DEFAULT 'free',
	`mfa_required` boolean NOT NULL DEFAULT false,
	`session_timeout_minutes` int NOT NULL DEFAULT 15,
	`settings` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orgs_id` PRIMARY KEY(`id`),
	CONSTRAINT `orgs_clerk_org_id_unique` UNIQUE(`clerk_org_id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` varchar(36) NOT NULL,
	`org_id` varchar(36) NOT NULL,
	`mrn_hash` varchar(255),
	`display_name` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_audit_log` (
	`id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`action` varchar(255) NOT NULL,
	`diff` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL,
	`org_id` varchar(36) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` enum('open','in_progress','done','snoozed') NOT NULL DEFAULT 'open',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`assignee_id` varchar(36),
	`patient_id` varchar(36),
	`due_at` timestamp,
	`source` enum('manual','ai_extracted','ehr_sync') NOT NULL DEFAULT 'manual',
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`clerk_user_id` varchar(255),
	`org_id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` enum('owner','admin','provider','staff','readonly') NOT NULL DEFAULT 'provider',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_clerk_user_id_unique` UNIQUE(`clerk_user_id`)
);
--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_org_id_orgs_id_fk` FOREIGN KEY (`org_id`) REFERENCES `orgs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_audit_log` ADD CONSTRAINT `task_audit_log_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_audit_log` ADD CONSTRAINT `task_audit_log_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_org_id_orgs_id_fk` FOREIGN KEY (`org_id`) REFERENCES `orgs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignee_id_users_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_patient_id_patients_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_org_id_orgs_id_fk` FOREIGN KEY (`org_id`) REFERENCES `orgs`(`id`) ON DELETE no action ON UPDATE no action;