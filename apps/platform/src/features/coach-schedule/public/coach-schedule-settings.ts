import {
  WEEKDAYS,
  type Weekday,
} from "@eli-coach-platform/domain/coach-availability";
import { z } from "zod";

import { timeZoneSchema } from "./time-zone";

const MAX_MEETING_LINK_LENGTH = 2048;

export const COACH_SCHEDULE_SETTINGS_MESSAGES = {
  no_weekday: "Pick at least one day.",
  invalid_hours: "The start hour must be before the end hour.",
  invalid_meeting_link: "Enter a full https:// link, or leave it empty.",
  invalid_time_zone: "Your browser's time zone could not be read.",
  server_error: "We couldn't save your settings. Try again in a moment.",
} as const;

export const COACH_SCHEDULE_SETTINGS_TOASTS = {
  saved: "Settings saved",
  failed: COACH_SCHEDULE_SETTINGS_MESSAGES.server_error,
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

export const coachScheduleSettingsSchema = z.object({
  timeZone: timeZoneSchema,
  weekdays: z
    .array(z.enum(WEEKDAYS))
    .min(1, COACH_SCHEDULE_SETTINGS_MESSAGES.no_weekday),
  startHour: z
    .number()
    .int(COACH_SCHEDULE_SETTINGS_MESSAGES.invalid_hours)
    .min(0, COACH_SCHEDULE_SETTINGS_MESSAGES.invalid_hours)
    .max(23, COACH_SCHEDULE_SETTINGS_MESSAGES.invalid_hours),
  endHour: z
    .number()
    .int(COACH_SCHEDULE_SETTINGS_MESSAGES.invalid_hours)
    .min(1, COACH_SCHEDULE_SETTINGS_MESSAGES.invalid_hours)
    .max(24, COACH_SCHEDULE_SETTINGS_MESSAGES.invalid_hours),
  meetingLink: z
    .string()
    .max(
      MAX_MEETING_LINK_LENGTH,
      COACH_SCHEDULE_SETTINGS_MESSAGES.invalid_meeting_link,
    )
    .nullable()
    .refine(
      isEmptyOrHttpsUrl,
      COACH_SCHEDULE_SETTINGS_MESSAGES.invalid_meeting_link,
    ),
});

export type CoachScheduleSettings = z.infer<typeof coachScheduleSettingsSchema>;

export const updateCoachScheduleSettingsSuccessSchema = z.object({
  success: z.literal(true),
  settings: coachScheduleSettingsSchema,
});

const coachScheduleSettingsErrorCodeSchema = z.enum([
  "no_weekday",
  "invalid_hours",
  "invalid_meeting_link",
  "invalid_time_zone",
  "server_error",
]);

export type CoachScheduleSettingsErrorCode = z.infer<
  typeof coachScheduleSettingsErrorCodeSchema
>;

export const updateCoachScheduleSettingsErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: coachScheduleSettingsErrorCodeSchema,
    message: z.string().min(1),
  }),
});
