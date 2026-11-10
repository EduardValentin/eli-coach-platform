import { z } from "zod";

import { TURNSTILE_RESPONSE_FIELD } from "~/shared/submission-checks/bot-detection";

import {
  productSlugSchema,
  storeEmailSchema,
  storeProductSlugsFieldSchema,
} from "./store";

const CHECKED = "true";

const checkedBoxSchema = z.literal(CHECKED).transform(() => true as const);

export const storeCheckoutSessionIdSchema = z
  .string()
  .regex(/^cs_[A-Za-z0-9_-]{1,250}$/);

const storeOrderCurrencySchema = z.enum(["EUR", "USD"]);

export const storeCheckoutRequestSchema = z.strictObject({
  [TURNSTILE_RESPONSE_FIELD]: z.string().max(4096).optional(),
  idempotencyKey: z.uuid(),
  email: storeEmailSchema,
  productSlugs: storeProductSlugsFieldSchema,
  currency: storeOrderCurrencySchema,
  termsAccepted: checkedBoxSchema,
  deliveryConsent: checkedBoxSchema,
  marketingConsent: z
    .enum([CHECKED, "false"])
    .transform((value) => value === CHECKED),
});

const storeCheckoutErrorCodeSchema = z.enum([
  "invalid_request",
  "bot_verification_failed",
  "subaddress_refused",
  "unavailable_products",
  "no_paid_items",
  "idempotency_conflict",
  "checkout_unavailable",
]);

export const storeCheckoutResponseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true), checkoutUrl: z.url() }),
  z.object({
    success: z.literal(false),
    error: z.object({
      code: storeCheckoutErrorCodeSchema,
      message: z.string().min(1),
      availableProductSlugs: z.array(productSlugSchema).optional(),
    }),
  }),
]);

export const storeOrderConfirmationSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("confirmed"),
    sessionId: storeCheckoutSessionIdSchema,
    email: z.string().min(1),
    currency: storeOrderCurrencySchema,
    lines: z.array(
      z.object({
        title: z.string().min(1),
        amountMinorUnits: z.number().int().positive().nullable(),
      }),
    ),
    totalMinorUnits: z.number().int().nonnegative(),
    termsVersion: z.string().min(1),
  }),
  z.object({ status: z.literal("not_completed") }),
]);

export const storeOrderEmailResendRequestSchema = z.strictObject({
  sessionId: storeCheckoutSessionIdSchema,
});

export const storeOrderEmailResendResponseSchema = z.discriminatedUnion(
  "success",
  [
    z.object({
      success: z.literal(true),
      outcome: z.enum(["sent", "processing", "rate_limited", "not_found"]),
    }),
    z.object({
      success: z.literal(false),
      error: z.object({
        code: z.enum(["invalid_request", "resend_unavailable"]),
        message: z.string().min(1),
      }),
    }),
  ],
);

export type StoreCheckoutErrorCode = z.infer<
  typeof storeCheckoutErrorCodeSchema
>;
export type StoreCheckoutResponse = z.infer<typeof storeCheckoutResponseSchema>;
export type StoreOrderEmailResendOutcome = Extract<
  z.infer<typeof storeOrderEmailResendResponseSchema>,
  { success: true }
>["outcome"];
export type StoreOrderConfirmation = z.infer<
  typeof storeOrderConfirmationSchema
>;
