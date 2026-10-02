import { COACHING_SUBSCRIPTION_STATUSES } from "@eli-coach-platform/domain/coaching-subscription";
import { z } from "zod";

import { coachingBundleIdSchema } from "./bundle-cards";

const OFFERED_CANCELLATIONS = [
  "full-refund",
  "proportional-refund",
  "no-refund",
] as const;

const offeredCancellationSchema = z.enum(OFFERED_CANCELLATIONS);

export const NOTHING_TO_CANCEL_MESSAGE =
  "This coaching has already ended, so there is nothing to cancel.";

export const PAYMENT_METHOD_UNAVAILABLE_PARAM = {
  name: "paymentMethod",
  value: "unavailable",
} as const;

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
    programStartedOn: z.iso.datetime().nullable(),
    paymentProblem: z.boolean(),
  }),
  cancellation: z
    .object({
      rule: offeredCancellationSchema,
      withdrawalDeadline: z.iso.datetime(),
      paidThrough: z.iso.datetime(),
      refundCents: z.number().int().nonnegative(),
    })
    .nullable(),
  startNowUntil: z.iso.datetime().nullable(),
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
  "outside-window",
  "ended",
] as const;

export const subscriptionRefusalSchema = z.object({
  error: z.enum(SUBSCRIPTION_REFUSALS),
  message: z.string().min(1).optional(),
});

export type SubscriptionRefusalAnswer = z.infer<
  typeof subscriptionRefusalSchema
>;
