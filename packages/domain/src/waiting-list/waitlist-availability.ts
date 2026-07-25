export type WaitlistAvailability = "available" | "limited" | "closed";

type ResolveWaitlistAvailabilityOptions = {
  cap: number;
  reducedPricingSignupCount: number;
};

export function getWaitlistAvailabilityBucketStart(now: Date): Date {
  const bucketStart = new Date(now);
  const bucketMinute = now.getUTCMinutes() < 30 ? 0 : 30;

  bucketStart.setUTCMinutes(bucketMinute, 0, 0);

  return bucketStart;
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
