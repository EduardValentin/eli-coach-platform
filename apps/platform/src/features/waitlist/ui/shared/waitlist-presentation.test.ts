import type { WaitlistSnapshot } from "@eli-coach-platform/domain/waitlist";
import { describe, expect, it } from "vitest";

import { presentWaitlist } from "./waitlist-presentation";

const activeOffer = {
  campaignSlug: "all-bundles-launch-1",
  plan: "all-bundles",
} as const;

const scenarios = [
  {
    expected: {
      availabilityStatus: null,
      isClosed: false,
      isUnavailable: false,
      mode: "disabled",
      showsAuthControls: true,
      showsBundleOffer: false,
    },
    name: "disabled",
    waitlist: { availability: null, enabled: false, offer: activeOffer },
  },
  {
    expected: {
      availabilityStatus: {
        label: "Reduced-price spots available",
        tone: "open",
      },
      isClosed: false,
      isUnavailable: false,
      mode: "open",
      showsAuthControls: false,
      showsBundleOffer: true,
    },
    name: "open",
    waitlist: { availability: "available", enabled: true, offer: activeOffer },
  },
  {
    expected: {
      availabilityStatus: { label: "Limited spots", tone: "open" },
      isClosed: false,
      isUnavailable: false,
      mode: "limited",
      showsAuthControls: false,
      showsBundleOffer: true,
    },
    name: "limited",
    waitlist: { availability: "limited", enabled: true, offer: activeOffer },
  },
  {
    expected: {
      availabilityStatus: {
        label: "Reduced-price spots closed",
        tone: "closed",
      },
      isClosed: true,
      isUnavailable: false,
      mode: "closed",
      showsAuthControls: false,
      showsBundleOffer: false,
    },
    name: "closed",
    waitlist: { availability: "closed", enabled: true, offer: activeOffer },
  },
  {
    expected: {
      availabilityStatus: null,
      isClosed: false,
      isUnavailable: true,
      mode: "unavailable",
      showsAuthControls: false,
      showsBundleOffer: false,
    },
    name: "unavailable",
    waitlist: { availability: null, enabled: true, offer: activeOffer },
  },
] as const satisfies readonly {
  expected: unknown;
  name: string;
  waitlist: WaitlistSnapshot;
}[];

describe("presentWaitlist", () => {
  it.each(scenarios)("presents the $name mode", ({ expected, waitlist }) => {
    // arrange
    // act
    const presentation = presentWaitlist(waitlist);

    // assert
    expect(presentation).toEqual(expected);
  });
});
