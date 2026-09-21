import {
  ASSESSMENT_CALL_RULES,
  VISITOR_GENDERS,
  VISITOR_PRIMARY_GOALS,
} from "@eli-coach-platform/domain/assessment-call";
import { z } from "zod";

import { findCountry } from "./countries";
import {
  ageOn,
  MAX_BOOKING_AGE,
  MIN_BOOKING_AGE,
  normalizePhone,
} from "./visitor-profile";

const MAX_TIME_ZONE_LENGTH = 64;
const MAX_NAME_LENGTH = 60;
const COUNTRY_MESSAGE = "Choose your country.";
const REAL_BIRTH_DATE_MESSAGE = "Enter a real date of birth.";
const PHONE_MESSAGE =
  "Enter a phone number with digits only, 4 to 14 digits after the country code.";

function isFormattableTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });

    return true;
  } catch {
    return false;
  }
}

export const timeZoneSchema = z
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

function nameSchema(message: string) {
  return z.string().trim().min(1, message).max(MAX_NAME_LENGTH, message);
}

const bookingFieldsSchema = z.object({
  startsAt: z.iso.datetime("Please choose an available time."),
  firstName: nameSchema("Enter your first name, up to 60 characters."),
  lastName: nameSchema("Enter your last name, up to 60 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320, "Please enter an email address under 320 characters.")
    .email("Please enter a valid email address."),
  dateOfBirth: z.iso.date(REAL_BIRTH_DATE_MESSAGE),
  gender: z.enum(VISITOR_GENDERS, "Choose an option."),
  primaryGoal: z.enum(VISITOR_PRIMARY_GOALS, "Choose your primary goal."),
  country: z
    .string(COUNTRY_MESSAGE)
    .refine((code) => findCountry(code) !== undefined, COUNTRY_MESSAGE),
  phoneCallingCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  notes: z
    .string()
    .trim()
    .max(1000, "Please keep your notes under 1000 characters.")
    .optional(),
  visitorTimeZone: timeZoneSchema,
});

type BookingFields = z.infer<typeof bookingFieldsSchema>;
type PhoneFields = Partial<
  Pick<BookingFields, "phoneCallingCode" | "phoneNumber">
>;

export function createBookAssessmentCallRequestSchema(options: { now: Date }) {
  return bookingFieldsSchema.superRefine((request, context) => {
    const birthDateMessage = describeBirthDateProblem(request, options.now);

    if (birthDateMessage) {
      context.addIssue({
        code: "custom",
        message: birthDateMessage,
        path: ["dateOfBirth"],
      });
    }

    if (normalizeRequestPhone(request).status === "invalid") {
      context.addIssue({
        code: "custom",
        message: PHONE_MESSAGE,
        path: ["phoneNumber"],
      });
    }
  });
}

export function phoneFromRequest(request: PhoneFields): string | null {
  const phone = normalizeRequestPhone(request);

  return phone.status === "valid" ? phone.e164 : null;
}

function normalizeRequestPhone(request: PhoneFields) {
  return normalizePhone({
    callingCode: findCountry(request.phoneCallingCode ?? "")?.callingCode ?? "",
    nationalNumber: request.phoneNumber ?? "",
  });
}

// The zone is refined on its own field; a zone the runtime cannot read must
// not turn the age check into a thrown RangeError on top of that issue.
function describeBirthDateProblem(
  request: BookingFields,
  now: Date,
): string | null {
  if (!isFormattableTimeZone(request.visitorTimeZone)) {
    return null;
  }

  const age = ageOn({
    dateOfBirth: request.dateOfBirth,
    on: now,
    timeZone: request.visitorTimeZone,
  });

  if (age < 0 || age > MAX_BOOKING_AGE) {
    return REAL_BIRTH_DATE_MESSAGE;
  }

  if (age < MIN_BOOKING_AGE) {
    return "You must be at least 18 to book a call.";
  }

  return null;
}

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
  "invalid_first_name",
  "invalid_last_name",
  "invalid_email",
  "invalid_date_of_birth",
  "invalid_gender",
  "invalid_primary_goal",
  "invalid_country",
  "invalid_phone",
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

export const COACH_ASSESSMENT_CALLS_UNAVAILABLE_STATUS = 503;

export const COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE =
  "Your assessment calls could not be loaded. Try again in a moment.";

export const coachAssessmentCallSchema = z.object({
  id: z.uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  fullName: z.string().min(1),
  visitorEmail: z.email(),
  visitorNotes: z.string().nullable(),
  dateOfBirth: z.iso.date(),
  gender: z.enum(VISITOR_GENDERS),
  primaryGoal: z.enum(VISITOR_PRIMARY_GOALS),
  country: z.string().length(2),
  phone: z.string().nullable(),
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
export type Booking = z.infer<typeof bookingSchema>;
export type CoachAssessmentCall = z.infer<typeof coachAssessmentCallSchema>;
export type CoachAssessmentCalls = z.infer<typeof coachAssessmentCallsSchema>;
export type BookAssessmentCallErrorCode = z.infer<
  typeof bookAssessmentCallErrorCodeSchema
>;
export type BookAssessmentCallResponse = z.infer<
  typeof bookAssessmentCallResponseSchema
>;
