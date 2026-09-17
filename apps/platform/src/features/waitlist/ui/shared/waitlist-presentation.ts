import type {
  WaitlistOfferPlan,
  WaitlistSnapshot,
} from "@eli-coach-platform/domain/waitlist";

type WaitlistMode = "closed" | "disabled" | "limited" | "open" | "unavailable";

type WaitlistAvailabilityStatus = { label: string; tone: "closed" | "open" };

export type WaitlistPresentation = {
  availabilityStatus: WaitlistAvailabilityStatus | null;
  bundleOfferPlan: WaitlistOfferPlan | null;
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

export function presentWaitlist(
  waitlist: WaitlistSnapshot,
): WaitlistPresentation {
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

function resolveWaitlistMode(waitlist: WaitlistSnapshot): WaitlistMode {
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
  waitlist: WaitlistSnapshot,
): WaitlistAvailabilityStatus | null {
  if (!waitlist.enabled || waitlist.availability === null) {
    return null;
  }

  return {
    label: availabilityStatusLabels[waitlist.availability],
    tone: waitlist.availability === "closed" ? "closed" : "open",
  };
}
