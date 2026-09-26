import type { CallSalesState } from "@eli-coach-platform/domain/payment-link";
import { START_CHOICES } from "@eli-coach-platform/domain/coaching-subscription";
import { z } from "zod";

import {
  coachingBundleCardSchema,
  coachingBundleIdSchema,
  priceTierSchema,
} from "./bundle-cards";

export const CALL_SALES_STATES = [
  "held",
  "payment-link-sent",
  "paid",
] as const satisfies readonly CallSalesState[];

export const callSalesStateSchema = z.enum(CALL_SALES_STATES);

export const salesStatesSchema = z.record(z.string(), callSalesStateSchema);

export type SalesStates = z.infer<typeof salesStatesSchema>;

export const startChoiceSchema = z.enum(START_CHOICES);

export const sendPaymentLinkRequestSchema = z.object({
  assessmentCallId: z.uuid(),
});

export const sendPaymentLinkSuccessSchema = z.object({
  status: z.literal("sent"),
  email: z.string().min(1),
});

export const sendPaymentLinkErrorSchema = z.object({
  error: z.string().min(1),
});

export const PAYMENT_LINK_MESSAGES = {
  sent: (email: string) => `Payment link sent to ${email}.`,
  deliveryFailed:
    "The payment link was created, but the email could not be sent. Send it again in a moment.",
} as const;

const callFirstStateSchema = z.object({ state: z.literal("call-first") });

const PAYMENT_LINK_TOKEN_MAX_LENGTH = 256;

export const paymentLinkTokenSchema = z
  .string()
  .max(PAYMENT_LINK_TOKEN_MAX_LENGTH)
  .catch("");

const CHECKOUT_SESSION_ID_MAX_LENGTH = 255;

export const checkoutSessionIdSchema = z
  .string()
  .max(CHECKOUT_SESSION_ID_MAX_LENGTH)
  .catch("");

export const checkoutChoiceSchema = z.object({
  bundleId: coachingBundleIdSchema,
  startChoice: startChoiceSchema,
});

export type CheckoutChoice = z.infer<typeof checkoutChoiceSchema>;

export const bundlePageSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("valid"),
    tier: priceTierSchema,
    cards: z.array(coachingBundleCardSchema),
    waitingStartsOn: z.iso.date(),
  }),
  callFirstStateSchema.extend({ cards: z.array(coachingBundleCardSchema) }),
]);

export type BundlePage = z.infer<typeof bundlePageSchema>;

export const checkoutConfirmationSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("paid"),
    amount: z.string().min(1),
    bundleTitle: z.string().min(1),
    email: z.string().min(1),
    renewalLabel: z.string().min(1),
    startChoice: startChoiceSchema,
    waitingStartsOn: z.iso.date(),
  }),
  callFirstStateSchema,
]);

export type CheckoutConfirmation = z.infer<typeof checkoutConfirmationSchema>;

export const SUBSCRIPTION_NOTE =
  "Each bundle is a subscription: it renews at its own length — every 1, 3 or 6 months — and each renewal is charged up front.";
