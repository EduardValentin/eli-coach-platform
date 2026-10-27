import {
  VISITOR_GENDERS,
  VISITOR_PRIMARY_GOALS,
} from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import { CLIENT_STATUSES } from "~/bounded-contexts/clients/clients/domain/client-roster";
import { z } from "zod";

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
  joinedAt: z.iso.datetime(),
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

export const coachClientSchema = z.object({
  clientId: z.uuid(),
  firstName: z.string().min(1),
  lastName: z.string(),
  email: z.string().min(1),
  status: clientStatusSchema,
  needsRefund: z.boolean(),
  coachingCancelledOrEnded: z.boolean(),
  gender: visitorGenderSchema,
  assessmentCall: bookedAssessmentCallSchema,
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
