import {
  COACHING_SUBSCRIPTION_STATUSES,
  OFFERED_CANCELLATION_RULES,
  START_NOW_REFUSALS,
} from "@eli-coach-platform/domain/coaching-subscription";
import { z } from "zod";

import { coachingBundleIdSchema } from "./bundle-cards";

const offeredCancellationSchema = z.enum(OFFERED_CANCELLATION_RULES);

const cancellationDatesSchema = z.object({
  withdrawalDeadline: z.iso.datetime(),
  paidThrough: z.iso.datetime(),
});

export const NOTHING_TO_CANCEL_MESSAGE =
  "This coaching has already ended, so there is nothing to cancel.";

export const PAYMENT_METHOD_UNAVAILABLE_PARAM = {
  name: "paymentMethod",
  value: "unavailable",
} as const;

const paymentCardSchema = z.object({
  brand: z.string().min(1),
  lastFour: z.string().regex(/^\d{4}$/),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().positive(),
});

export const clientSettingsSchema = z.object({
  subscription: z.object({
    bundleId: coachingBundleIdSchema,
    months: z.number().int().positive(),
    amountCents: z.number().int().positive(),
    currency: z.string().length(3),
    paidAt: z.iso.datetime(),
    status: z.enum(COACHING_SUBSCRIPTION_STATUSES),
    cancelledAt: z.iso.datetime().nullable(),
    accessEndsAt: z.iso.datetime().nullable(),
    paymentProblem: z.boolean(),
  }),
  cancellation: z
    .discriminatedUnion("rule", [
      cancellationDatesSchema.extend({
        rule: z.literal("full-refund"),
        refundCents: z.number().int().positive(),
      }),
      cancellationDatesSchema.extend({ rule: z.literal("no-refund") }),
    ])
    .nullable(),
  startNowUntil: z.iso.datetime().nullable(),
  card: paymentCardSchema.nullable(),
});

export type ClientSettings = z.infer<typeof clientSettingsSchema>;

export const clientEndedSchema = z.object({
  refundDue: z.boolean(),
});

export type ClientEnded = z.infer<typeof clientEndedSchema>;

export const subscriptionCancelledSchema = z.object({
  status: z.literal("cancelled"),
  rule: offeredCancellationSchema,
  accessEndsAt: z.iso.datetime(),
  refundDue: z.boolean(),
});

export const programStartedSchema = z.object({
  status: z.literal("started"),
});

const SUBSCRIPTION_REFUSALS = [
  "not-found",
  "nothing-to-cancel",
  "provider-unavailable",
  ...START_NOW_REFUSALS,
] as const;

export const subscriptionRefusalSchema = z.object({
  error: z.enum(SUBSCRIPTION_REFUSALS),
  message: z.string().min(1).optional(),
});

export type SubscriptionRefusalAnswer = z.infer<
  typeof subscriptionRefusalSchema
>;
