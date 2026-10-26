import { VISITOR_GENDERS } from "@eli-coach-platform/domain/assessment-call";
import { WEEKDAYS } from "@eli-coach-platform/domain/coach-availability";
import {
  ACTIVITY_LEVELS,
  CLIENT_EQUIPMENT,
  CLIENT_LEVELS,
  CYCLE_MODES,
  PRIMARY_GOALS,
  SESSION_MINUTE_OPTIONS,
  TRAINING_DAY_OPTIONS,
  TRAINING_PLACES,
  type ClientProfileProblems,
  type CoachingFactsSnapshot,
  type SharedCoachingFacts,
} from "@eli-coach-platform/domain/client-profile";
import { PREFERRED_CHANNELS } from "@eli-coach-platform/domain/client-settings";
import { z } from "zod";

const TEXT_MAX_LENGTH = 2000;

const trainingDaysSchema = z.union(
  TRAINING_DAY_OPTIONS.map((days) => z.literal(days)),
);

const sessionMinutesSchema = z.union(
  SESSION_MINUTE_OPTIONS.map((minutes) => z.literal(minutes)),
);

export const sharedCoachingFactsSchema = z.object({
  heightCm: z.number().nullable(),
  trainingDays: trainingDaysSchema,
  sessionMinutes: sessionMinutesSchema,
  equipment: z.array(z.enum(CLIENT_EQUIPMENT)).max(CLIENT_EQUIPMENT.length),
  trainingPlace: z.enum(TRAINING_PLACES).nullable(),
  limitations: z.string().max(TEXT_MAX_LENGTH),
}) satisfies z.ZodType<SharedCoachingFacts>;

export const coachingFactsSchema = sharedCoachingFactsSchema.extend({
  level: z.enum(CLIENT_LEVELS),
  primaryGoal: z.enum(PRIMARY_GOALS).nullable(),
  goalWeightKg: z.number().nullable(),
  activityLevel: z.enum(ACTIVITY_LEVELS).nullable(),
  cycleMode: z.enum(CYCLE_MODES),
  dietaryRestrictions: z.string().max(TEXT_MAX_LENGTH),
}) satisfies z.ZodType<CoachingFactsSnapshot>;

export const clientPreferencesSchema = z.object({
  preferredCheckInWeekday: z.enum(WEEKDAYS).nullable(),
  preferredChannel: z.enum(PREFERRED_CHANNELS).nullable(),
});

export const profileIdentitySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  dateOfBirth: z.iso.date(),
  gender: z.enum(VISITOR_GENDERS),
  country: z.string().min(1),
  phone: z.string().nullable(),
});

export const clientProfileSchema = z.object({
  identity: profileIdentitySchema,
  coaching: coachingFactsSchema.nullable(),
  coachNotes: z.string().nullable(),
  preferences: clientPreferencesSchema,
  avatarUrl: z.string().nullable(),
  startingWeightKg: z.number().nullable(),
  currentWeightKg: z.number().nullable(),
});

export type ClientProfileView = z.infer<typeof clientProfileSchema>;

export const coachProfileRequestSchema = z.object({
  coaching: coachingFactsSchema.extend({
    primaryGoal: z.string().max(TEXT_MAX_LENGTH).nullable(),
  }),
  coachNotes: z.string().max(TEXT_MAX_LENGTH).nullable(),
});

const clientProfileProblemsSchema = z.object({
  heightCm: z.enum(["out-of-range"]).optional(),
  goalWeightKg: z.enum(["out-of-range"]).optional(),
  equipment: z.enum(["exclusive"]).optional(),
  limitations: z.enum(["too-long"]).optional(),
  primaryGoal: z.enum(["unknown"]).optional(),
  dietaryRestrictions: z.enum(["missing"]).optional(),
  coachNotes: z.enum(["too-long"]).optional(),
}) satisfies z.ZodType<ClientProfileProblems>;

export const clientProfileProblemsAnswerSchema = z.object({
  problems: clientProfileProblemsSchema,
});

export const clientProfileSavedAnswerSchema = z.object({
  status: z.literal("saved"),
});

export const clientProfileRefusalSchema = z.object({
  error: z.enum([
    "not-found",
    "not-on-journey",
    "ended",
    "not-seeded",
    "changed-meanwhile",
  ]),
});
