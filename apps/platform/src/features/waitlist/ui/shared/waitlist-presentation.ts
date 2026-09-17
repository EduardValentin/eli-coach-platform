import type { CoachingBundleWaitlistOfferPlan } from "@eli-coach-platform/domain/coaching-bundles";
import type { Waitlist } from "@eli-coach-platform/domain/waitlist";

type WaitlistMode = "closed" | "disabled" | "limited" | "open" | "unavailable";

type WaitlistAvailabilityStatus = { label: string; tone: "closed" | "open" };

export type WaitlistPresentation = {
  availabilityStatus: WaitlistAvailabilityStatus | null;
  bundleOfferPlan: CoachingBundleWaitlistOfferPlan | null;
  isClosed: boolean;
  isUnavailable: boolean;
  mode: WaitlistMode;
  showsAuthControls: boolean;
};

const availabilityStatusLabels = {
  available: "Reduced-price spots available",
  closed: "Reduced-price spots closed",
  limited: "Limited spots",
} as const;

export function presentWaitlist(waitlist: Waitlist): WaitlistPresentation {
  const mode = resolveWaitlistMode(waitlist);

  return {
    availabilityStatus: resolveAvailabilityStatus(waitlist),
    bundleOfferPlan:
      mode === "open" || mode === "limited" ? waitlist.offer.plan : null,
    isClosed: mode === "closed",
    isUnavailable: mode === "unavailable",
    mode,
    showsAuthControls: !waitlist.enabled,
  };
}

function resolveWaitlistMode(waitlist: Waitlist): WaitlistMode {
  if (!waitlist.enabled) {
    return "disabled";
  }

  if (waitlist.availability === null) {
    return "unavailable";
  }

  if (waitlist.availability === "available") {
    return "open";
  }

  return waitlist.availability;
}

function resolveAvailabilityStatus(
  waitlist: Waitlist,
): WaitlistAvailabilityStatus | null {
  if (!waitlist.enabled || waitlist.availability === null) {
    return null;
  }

  return {
    label: availabilityStatusLabels[waitlist.availability],
    tone: waitlist.availability === "closed" ? "closed" : "open",
  };
}
