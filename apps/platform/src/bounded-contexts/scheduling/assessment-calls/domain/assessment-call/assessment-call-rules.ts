const DURATION_MINUTES = 30;
const BUFFER_MINUTES = 30;

export type CallSlotRules = {
  readonly durationMinutes: number;
  readonly bufferMinutes: number;
  readonly stepMinutes: number;
  readonly horizonDays: number;
  readonly leadMinutes: number;
};

export const ASSESSMENT_CALL_RULES: CallSlotRules = {
  durationMinutes: DURATION_MINUTES,
  bufferMinutes: BUFFER_MINUTES,
  stepMinutes: DURATION_MINUTES + BUFFER_MINUTES,
  horizonDays: 30,
  leadMinutes: 120,
};
