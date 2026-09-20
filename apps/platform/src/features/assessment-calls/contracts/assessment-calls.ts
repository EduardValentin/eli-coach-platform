import { ASSESSMENT_CALL_RULES } from "@eli-coach-platform/domain/assessment-call";
import { z } from "zod";

const MAX_TIME_ZONE_LENGTH = 64;

function isFormattableTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });

    return true;
  } catch {
    return false;
  }
}

const timeZoneSchema = z
  .string()
  .max(MAX_TIME_ZONE_LENGTH, "Please choose a known time zone.")
  .refine(isFormattableTimeZone, "Please choose a known time zone.")
  .transform(
    (timeZone) =>
      new Intl.DateTimeFormat(undefined, { timeZone }).resolvedOptions()
        .timeZone,
  );

export const openSlotsResponseSchema = z.object({
  coachTimeZone: z.string().min(1),
  slots: z.array(z.iso.datetime()),
});

export const bookAssessmentCallRequestSchema = z.object({
  startsAt: z.iso.datetime("Please choose an available time."),
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(120, "Please enter a name under 120 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320, "Please enter an email address under 320 characters.")
    .email("Please enter a valid email address."),
  notes: z
    .string()
    .trim()
    .max(1000, "Please keep your notes under 1000 characters.")
    .optional(),
  visitorTimeZone: timeZoneSchema,
});

export const bookingSchema = z.object({
  id: z.uuid(),
  startsAt: z.iso.datetime(),
  durationMinutes: z.literal(ASSESSMENT_CALL_RULES.durationMinutes),
  visitorTimeZone: timeZoneSchema,
});

export const bookAssessmentCallSuccessSchema = z.object({
  success: z.literal(true),
  booking: bookingSchema,
});

const bookAssessmentCallErrorCodeSchema = z.enum([
  "invalid_name",
  "invalid_email",
  "notes_too_long",
  "invalid_time_zone",
  "invalid_start",
  "slot_unavailable",
  "booking_refused",
  "bot_verification_failed",
  "server_error",
]);

export const bookAssessmentCallErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: bookAssessmentCallErrorCodeSchema,
    message: z.string().min(1),
  }),
});

export const bookAssessmentCallResponseSchema = z.discriminatedUnion(
  "success",
  [bookAssessmentCallSuccessSchema, bookAssessmentCallErrorSchema],
);

export const COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE =
  "Your assessment calls could not be loaded. Try again in a moment.";

export const coachAssessmentCallSchema = z.object({
  id: z.uuid(),
  visitorName: z.string().min(1),
  visitorEmail: z.email(),
  visitorNotes: z.string().nullable(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  joinPath: z.string().min(1),
});

export const coachAssessmentCallsSchema = z.object({
  calls: z.array(coachAssessmentCallSchema),
  coachTimeZone: z.string().min(1),
  now: z.iso.datetime(),
});

export type OpenSlotsResponse = z.infer<typeof openSlotsResponseSchema>;
export type BookAssessmentCallRequest = z.infer<
  typeof bookAssessmentCallRequestSchema
>;
export type Booking = z.infer<typeof bookingSchema>;
export type CoachAssessmentCall = z.infer<typeof coachAssessmentCallSchema>;
export type CoachAssessmentCalls = z.infer<typeof coachAssessmentCallsSchema>;
export type BookAssessmentCallErrorCode = z.infer<
  typeof bookAssessmentCallErrorCodeSchema
>;
export type BookAssessmentCallResponse = z.infer<
  typeof bookAssessmentCallResponseSchema
>;
