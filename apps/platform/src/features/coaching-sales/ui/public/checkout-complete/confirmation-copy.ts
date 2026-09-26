import { formatDayMonthYear } from "~/features/coaching-sales/ui/public/calendar-day-format";

export const PAYMENT_CONFIRMED_HEADING = "Payment confirmed";

export const IMMEDIATE_START_SUMMARY =
  "Your program starts as soon as it's ready";

export const INVITATION_LEAD =
  "Your invitation is on its way. Eli sends it personally to";

export const INVITATION_TAIL =
  ", and it works for 30 days once it arrives — you'll create your account from it.";

export function waitingStartSummary(waitingStartsOn: string): string {
  return `After your 14-day withdrawal period — Eli starts working on your program on ${formatDayMonthYear(waitingStartsOn)}. You can let her start sooner from your account`;
}
