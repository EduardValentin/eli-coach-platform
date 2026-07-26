export type WaitlistAvailability = "available" | "limited" | "closed";

export const WAITLIST_AVAILABILITY_BUCKET_DURATION_MS = 30 * 60 * 1_000;

type ResolveWaitlistAvailabilityOptions = {
  cap: number;
  reducedPricingSignupCount: number;
};

export function getWaitlistAvailabilityBucketStart(now: Date): Date {
  const elapsedInBucket = now.getTime() % WAITLIST_AVAILABILITY_BUCKET_DURATION_MS;

  return new Date(now.getTime() - elapsedInBucket);
}

export function resolveWaitlistAvailability(
  options: ResolveWaitlistAvailabilityOptions,
): WaitlistAvailability {
  const remaining = Math.max(options.cap - options.reducedPricingSignupCount, 0);

  if (remaining === 0) {
    return "closed";
  }

  return remaining / options.cap <= 0.2 ? "limited" : "available";
}
