import type { CoachingStanding } from "./coaching-standing";

export type PortalReach = "reachable" | "awaiting_onboarding" | "ended";

export function portalReachOf(reading: {
  standing: CoachingStanding;
  onboardingSubmittedAt: Date | null;
  now: Date;
}): PortalReach {
  if (!reading.standing.hasPortalAccessAt(reading.now)) {
    return "ended";
  }

  return reading.onboardingSubmittedAt ? "reachable" : "awaiting_onboarding";
}
