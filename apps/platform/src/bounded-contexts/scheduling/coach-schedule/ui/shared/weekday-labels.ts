import type { Weekday } from "~/bounded-contexts/scheduling/public/weekdays";

export const WEEKDAY_DISPLAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const satisfies readonly Weekday[];

export const WEEKDAY_LABELS: Record<Weekday, { full: string; short: string }> =
  {
    monday: { full: "Monday", short: "Mon" },
    tuesday: { full: "Tuesday", short: "Tue" },
    wednesday: { full: "Wednesday", short: "Wed" },
    thursday: { full: "Thursday", short: "Thu" },
    friday: { full: "Friday", short: "Fri" },
    saturday: { full: "Saturday", short: "Sat" },
    sunday: { full: "Sunday", short: "Sun" },
  };
