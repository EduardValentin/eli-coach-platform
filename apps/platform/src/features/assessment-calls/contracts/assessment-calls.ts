import { ASSESSMENT_CALL_RULES } from "@eli-coach-platform/domain/coach-availability";
import { z } from "zod";

const formattableTimeZones = new Map<string, boolean>();

function isFormattableTimeZone(timeZone: string): boolean {
  const remembered = formattableTimeZones.get(timeZone);
  if (remembered !== undefined) {
    return remembered;
  }

  let formattable: boolean;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    formattable = true;
  } catch {
    formattable = false;
  }

  formattableTimeZones.set(timeZone, formattable);
  return formattable;
}

const timeZoneSchema = z
  .string()
  .refine(isFormattableTimeZone, "Please choose a known time zone.");

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
  joinPath: z.string().min(1),
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
  "email_already_booked",
  "bot_verification_failed",
  "server_error",
]);

export const bookAssessmentCallErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: bookAssessmentCallErrorCodeSchema,
    message: z.string().min(1),
    existing: z
      .object({
        startsAt: z.iso.datetime(),
        joinPath: z.string().min(1),
      })
      .optional(),
  }),
});

export const bookAssessmentCallResponseSchema = z.discriminatedUnion(
  "success",
  [bookAssessmentCallSuccessSchema, bookAssessmentCallErrorSchema],
);

export type OpenSlotsResponse = z.infer<typeof openSlotsResponseSchema>;
export type BookAssessmentCallRequest = z.infer<
  typeof bookAssessmentCallRequestSchema
>;
export type Booking = z.infer<typeof bookingSchema>;
export type BookAssessmentCallErrorCode = z.infer<
  typeof bookAssessmentCallErrorCodeSchema
>;
export type BookAssessmentCallResponse = z.infer<
  typeof bookAssessmentCallResponseSchema
>;
