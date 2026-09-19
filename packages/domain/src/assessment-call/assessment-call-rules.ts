import { SlotPolicy } from "../coach-availability";

const DURATION_MINUTES = 30;
const BUFFER_MINUTES = 30;

export const ASSESSMENT_CALL_RULES = SlotPolicy.of({
  durationMinutes: DURATION_MINUTES,
  bufferMinutes: BUFFER_MINUTES,
  stepMinutes: DURATION_MINUTES + BUFFER_MINUTES,
  horizonDays: 30,
  leadMinutes: 120,
});
