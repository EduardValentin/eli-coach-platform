import { SlotPolicy } from "../coach-availability";

const ONE_HOUR_IN_MINUTES = 60;
const ONE_DAY_IN_MINUTES = 24 * ONE_HOUR_IN_MINUTES;

export const CHECK_IN_RULES = SlotPolicy.of({
  durationMinutes: ONE_HOUR_IN_MINUTES,
  bufferMinutes: 0,
  stepMinutes: ONE_HOUR_IN_MINUTES,
  horizonDays: 30,
  leadMinutes: ONE_DAY_IN_MINUTES,
});
