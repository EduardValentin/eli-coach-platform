ALTER TABLE "app"."coaching_subscriptions" DROP CONSTRAINT "coaching_subscriptions_status_check";--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD COLUMN "access_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD COLUMN "payment_problem_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD COLUMN "refund_reason" varchar(32);--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD COLUMN "refund_due_cents" integer;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD COLUMN "refund_due_by" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD COLUMN "refunded_cents" integer;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD CONSTRAINT "coaching_subscriptions_refund_reason_check" CHECK ("app"."coaching_subscriptions"."refund_reason" in ('full-refund', 'proportional-refund', 'coach-issued'));--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD CONSTRAINT "coaching_subscriptions_refund_complete" CHECK (("app"."coaching_subscriptions"."refund_reason" is null) = ("app"."coaching_subscriptions"."refund_due_cents" is null) and ("app"."coaching_subscriptions"."refund_reason" is null) = ("app"."coaching_subscriptions"."refunded_cents" is null));--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD CONSTRAINT "coaching_subscriptions_refund_amounts_not_negative" CHECK ("app"."coaching_subscriptions"."refund_due_cents" >= 0 and "app"."coaching_subscriptions"."refunded_cents" >= 0);--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD CONSTRAINT "coaching_subscriptions_ending_has_access_end" CHECK ("app"."coaching_subscriptions"."status" not in ('cancelled', 'ended') or "app"."coaching_subscriptions"."access_ends_at" is not null);--> statement-breakpoint
ALTER TABLE "app"."coaching_subscriptions" ADD CONSTRAINT "coaching_subscriptions_status_check" CHECK ("app"."coaching_subscriptions"."status" in ('not-started', 'active', 'cancelled', 'ended'));