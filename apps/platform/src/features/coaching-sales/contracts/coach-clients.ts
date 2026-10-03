import {
  VISITOR_GENDERS,
  VISITOR_PRIMARY_GOALS,
} from "@eli-coach-platform/domain/assessment-call";
import { CLIENT_STATUSES } from "@eli-coach-platform/domain/client-roster";
import {
  COACHING_SUBSCRIPTION_STATUSES,
  REFUND_REASONS,
} from "@eli-coach-platform/domain/coaching-subscription";
import { z } from "zod";

import { coachingBundleIdSchema } from "./bundle-cards";

const clientStatusSchema = z.enum(CLIENT_STATUSES);

export type ClientStatus = z.infer<typeof clientStatusSchema>;

const rosterClientSchema = z.object({
  clientId: z.uuid(),
  firstName: z.string().min(1),
  lastName: z.string(),
  email: z.string().min(1),
  status: clientStatusSchema,
  needsRefund: z.boolean(),
  bundleMonths: z.number().int().positive().nullable(),
  paidAt: z.iso.datetime().nullable(),
});

export type RosterClient = z.infer<typeof rosterClientSchema>;

export const clientRosterSchema = z.object({
  clients: z.array(rosterClientSchema).nullable(),
});

export type ClientRoster = z.infer<typeof clientRosterSchema>;

const INVITATION_STATES = ["pending", "expired", "email-failed"] as const;

const clientInvitationSchema = z.object({
  state: z.enum(INVITATION_STATES),
  sentAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});

export type ClientInvitationReading = z.infer<typeof clientInvitationSchema>;

const visitorGenderSchema = z.enum(VISITOR_GENDERS);

const bookedAssessmentCallSchema = z.object({
  startsAt: z.iso.datetime(),
  firstName: z.string().min(1),
  lastName: z.string(),
  email: z.string().min(1),
  dateOfBirth: z.iso.date(),
  gender: visitorGenderSchema,
  country: z.string().min(1),
  phone: z.string().nullable(),
  primaryGoal: z.enum(VISITOR_PRIMARY_GOALS),
  notes: z.string().nullable(),
});

const subscriptionRefundSchema = z.object({
  reason: z.enum(REFUND_REASONS),
  amountCents: z.number().int().nonnegative(),
  outstandingCents: z.number().int().nonnegative(),
  refundedCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  dueBy: z.iso.datetime().nullable(),
  refundedOn: z.iso.datetime().nullable(),
});

const clientSubscriptionSchema = z.object({
  bundleId: coachingBundleIdSchema,
  months: z.number().int().positive(),
  reducedPrice: z.boolean(),
  paidAt: z.iso.datetime(),
  workStartsOn: z.iso.datetime().nullable(),
  status: z.enum(COACHING_SUBSCRIPTION_STATUSES),
  endsOn: z.iso.datetime().nullable(),
  endedOn: z.iso.datetime().nullable(),
  refund: subscriptionRefundSchema.nullable(),
});

export type ClientSubscription = z.infer<typeof clientSubscriptionSchema>;

export const coachClientSchema = z.object({
  clientId: z.uuid(),
  firstName: z.string().min(1),
  lastName: z.string(),
  email: z.string().min(1),
  status: clientStatusSchema,
  needsRefund: z.boolean(),
  coachingClosed: z.boolean(),
  gender: visitorGenderSchema,
  assessmentCall: bookedAssessmentCallSchema,
  subscription: clientSubscriptionSchema.nullable(),
  invitation: clientInvitationSchema.nullable(),
});

export type CoachClient = z.infer<typeof coachClientSchema>;

export const resendInvitationRequestSchema = z.object({
  clientId: z.uuid(),
});

export const resendInvitationSuccessSchema = z.object({
  status: z.literal("sent"),
  email: z.string().min(1),
});

export const resendInvitationErrorSchema = z.object({
  error: z.string().min(1),
});
