ALTER TABLE "orgs" ADD COLUMN "clerk_org_id" text;--> statement-breakpoint
ALTER TABLE "orgs" ADD COLUMN "mfa_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orgs" ADD COLUMN "session_timeout_minutes" integer DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "orgs" ADD CONSTRAINT "orgs_clerk_org_id_unique" UNIQUE("clerk_org_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id");
