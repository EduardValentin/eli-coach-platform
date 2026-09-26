import type { CallSalesState as DomainCallSalesState } from "@eli-coach-platform/domain/payment-link";
import { START_CHOICES } from "@eli-coach-platform/domain/coaching-subscription";
import { z } from "zod";

import { coachingBundleCardSchema, priceTierSchema } from "./bundle-cards";

export const CALL_SALES_STATES = [
  "held",
  "payment-link-sent",
  "paid",
] as const satisfies readonly DomainCallSalesState[];

const callSalesStateSchema = z.enum(CALL_SALES_STATES);

export type CallSalesState = z.infer<typeof callSalesStateSchema>;

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

export const bundlePageSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("valid"),
    tier: priceTierSchema,
    cards: z.array(coachingBundleCardSchema),
    waitingStartsOn: z.iso.date(),
  }),
  callFirstStateSchema,
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
