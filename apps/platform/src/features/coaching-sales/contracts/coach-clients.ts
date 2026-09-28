import {
  VISITOR_GENDERS,
  VISITOR_PRIMARY_GOALS,
} from "@eli-coach-platform/domain/assessment-call";
import { CLIENT_STATUSES } from "@eli-coach-platform/domain/client-roster";
import { z } from "zod";

import { coachingBundleIdSchema, priceTierSchema } from "./bundle-cards";

const clientStatusSchema = z.enum(CLIENT_STATUSES);

export type ClientStatus = z.infer<typeof clientStatusSchema>;

const rosterClientSchema = z.object({
  clientId: z.uuid(),
  firstName: z.string().min(1),
  lastName: z.string(),
  email: z.string().min(1),
  status: clientStatusSchema,
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

const clientProfileSchema = z.object({
  dateOfBirth: z.iso.date(),
  gender: z.enum(VISITOR_GENDERS),
  country: z.string().min(1),
  phone: z.string().nullable(),
  primaryGoal: z.enum(VISITOR_PRIMARY_GOALS),
  bookingNotes: z.string().nullable(),
});

export type ClientProfile = z.infer<typeof clientProfileSchema>;

const clientSubscriptionSchema = z.object({
  bundleId: coachingBundleIdSchema,
  months: z.number().int().positive(),
  tier: priceTierSchema,
  paidAt: z.iso.datetime(),
  workStartsOn: z.iso.datetime().nullable(),
});

export type ClientSubscription = z.infer<typeof clientSubscriptionSchema>;

export const coachClientSchema = z.object({
  clientId: z.uuid(),
  firstName: z.string().min(1),
  lastName: z.string(),
  email: z.string().min(1),
  status: clientStatusSchema,
  profile: clientProfileSchema,
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
