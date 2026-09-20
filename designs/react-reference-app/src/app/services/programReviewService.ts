export type ScheduledProgramReview = {
  journeyId: string;
  startsAt: Date;
  scheduledAt: Date;
};

export const REVIEW_CALL_WINDOW_HOURS = 48;

export const SIMULATED_LATENCY_MS = 900;

export async function scheduleReviewCall(
  journeyId: string,
  startsAt: Date,
): Promise<ScheduledProgramReview> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  return { journeyId, startsAt, scheduledAt: new Date() };
}
