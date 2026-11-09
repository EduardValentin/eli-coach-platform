export const STEPS_AFTER_SUBMISSION = [
  "submitted",
  "in-review",
  "needs-details",
  "approved",
] as const;

export type StepAfterSubmission = (typeof STEPS_AFTER_SUBMISSION)[number];

export function isAfterSubmission(step: string): step is StepAfterSubmission {
  return STEPS_AFTER_SUBMISSION.some((submitted) => submitted === step);
}
