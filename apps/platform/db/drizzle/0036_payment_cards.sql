CREATE TABLE "app"."payment_cards" (
	"stripe_customer_id" varchar(255) PRIMARY KEY NOT NULL,
	"payment_method_id" varchar(255) NOT NULL,
	"brand" varchar(32) NOT NULL,
	"last_four" char(4) NOT NULL,
	"expiry_month" integer NOT NULL,
	"expiry_year" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "payment_cards_last_four_digits" CHECK ("app"."payment_cards"."last_four" ~ '^[0-9]{4}$'),
	CONSTRAINT "payment_cards_expiry_month_check" CHECK ("app"."payment_cards"."expiry_month" between 1 and 12)
);
