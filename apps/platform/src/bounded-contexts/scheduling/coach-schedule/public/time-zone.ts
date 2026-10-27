import { z } from "zod";

const MAX_TIME_ZONE_LENGTH = 64;

export function isFormattableTimeZone(timeZone: string): boolean {
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
