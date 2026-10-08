import {
  WEEKDAYS,
  type Weekday,
} from "@eli-coach-platform/domain/coach-availability";
import { z } from "zod";

import { timeZoneSchema } from "./assessment-calls";

const MAX_MEETING_LINK_LENGTH = 2048;

export const ASSESSMENT_CALL_SETTINGS_MESSAGES = {
  no_weekday: "Pick at least one day.",
  invalid_hours: "The start hour must be before the end hour.",
  invalid_meeting_link: "Enter a full https:// link, or leave it empty.",
  invalid_time_zone: "Your browser's time zone could not be read.",
  server_error: "We couldn't save your settings. Try again in a moment.",
} as const;

export const ASSESSMENT_CALL_SETTINGS_TOASTS = {
  saved: "Settings saved",
  failed: ASSESSMENT_CALL_SETTINGS_MESSAGES.server_error,
} as const;

export const WEEKDAY_DISPLAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const satisfies readonly Weekday[];

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export const HOUR_OPTIONS = {
  start: Array.from({ length: 24 }, (_unused, hour) => ({
    value: hour,
    label: hourLabel(hour),
  })),
  end: Array.from({ length: 24 }, (_unused, hour) => ({
    value: hour + 1,
    label: hourLabel(hour + 1),
  })),
} as const;

function isEmptyOrHttpsUrl(link: string | null): boolean {
  if (link === null || link.length === 0) {
    return true;
  }

  try {
    return new URL(link).protocol === "https:";
  } catch {
    return false;
  }
}

export const assessmentCallSettingsSchema = z.object({
  timeZone: timeZoneSchema,
  weekdays: z
    .array(z.enum(WEEKDAYS))
    .min(1, ASSESSMENT_CALL_SETTINGS_MESSAGES.no_weekday),
  startHour: z
    .number()
    .int(ASSESSMENT_CALL_SETTINGS_MESSAGES.invalid_hours)
    .min(0, ASSESSMENT_CALL_SETTINGS_MESSAGES.invalid_hours)
    .max(23, ASSESSMENT_CALL_SETTINGS_MESSAGES.invalid_hours),
  endHour: z
    .number()
    .int(ASSESSMENT_CALL_SETTINGS_MESSAGES.invalid_hours)
    .min(1, ASSESSMENT_CALL_SETTINGS_MESSAGES.invalid_hours)
    .max(24, ASSESSMENT_CALL_SETTINGS_MESSAGES.invalid_hours),
  meetingLink: z
    .string()
    .max(
      MAX_MEETING_LINK_LENGTH,
      ASSESSMENT_CALL_SETTINGS_MESSAGES.invalid_meeting_link,
    )
    .nullable()
    .refine(
      isEmptyOrHttpsUrl,
      ASSESSMENT_CALL_SETTINGS_MESSAGES.invalid_meeting_link,
    ),
});

export type AssessmentCallSettings = z.infer<
  typeof assessmentCallSettingsSchema
>;

export const updateAssessmentCallSettingsSuccessSchema = z.object({
  success: z.literal(true),
  settings: assessmentCallSettingsSchema,
});

const assessmentCallSettingsErrorCodeSchema = z.enum([
  "no_weekday",
  "invalid_hours",
  "invalid_meeting_link",
  "invalid_time_zone",
  "server_error",
]);

export type AssessmentCallSettingsErrorCode = z.infer<
  typeof assessmentCallSettingsErrorCodeSchema
>;

export const updateAssessmentCallSettingsErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: assessmentCallSettingsErrorCodeSchema,
    message: z.string().min(1),
  }),
});
