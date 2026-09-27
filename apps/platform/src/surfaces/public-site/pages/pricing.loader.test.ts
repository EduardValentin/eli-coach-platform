import { describe, expect, it, vi } from "vitest";

import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import type { WaitlistFeature } from "~/features/waitlist/server/waitlist-composition.server";
import { waitlistContext } from "~/features/waitlist/server/guards/waitlist-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./pricing";

const activeOffer = {
  campaignSlug: "all-bundles-launch-1",
  plan: "all-bundles",
} as const;

describe("pricing page loader", () => {
  it.each(["available", "limited"] as const)(
    "presents the reduced cards under waitlist pricing while availability is %s",
    async (availability) => {
      // arrange
      const { args, loadPricingCards } = createLoaderArguments({
        availability,
        enabled: true,
        offer: activeOffer,
      });

      // act
      const page = await loader(args);

      // assert
      expect(loadPricingCards).toHaveBeenCalledWith({ tier: "reduced" });
      expect(page).toEqual({ cards: ["reduced cards"], pricing: "waitlist" });
    },
  );

  it.each([
    { availability: "closed", enabled: true },
    { availability: null, enabled: true },
    { availability: "available", enabled: false },
  ] as const)(
    "presents the regular cards when the waitlist offers no bundle price ($availability, enabled $enabled)",
    async (waitlist) => {
      // arrange
      const { args, loadPricingCards } = createLoaderArguments({
        ...waitlist,
        offer: activeOffer,
      });

      // act
      const page = await loader(args);

      // assert
      expect(loadPricingCards).toHaveBeenCalledWith({ tier: "regular" });
      expect(page).toEqual({ cards: ["regular cards"], pricing: "regular" });
    },
  );
});

function createLoaderArguments(waitlist: unknown) {
  const loadPricingCards = vi.fn(({ tier }: { tier: string }) => [
    `${tier} cards`,
  ]);
  const coachingSales = {
    checkouts: { loadPricingCards },
  } as unknown as CoachingSalesFeature;
  const waitlistFeature = {
    waitlist: { getWaitlist: vi.fn().mockResolvedValue(waitlist) },
  } as unknown as WaitlistFeature;

  return {
    args: createRequestArgs({
      contexts: [
        contextEntry(coachingSalesContext, coachingSales),
        contextEntry(waitlistContext, waitlistFeature),
      ],
      request: new Request("http://localhost/pricing"),
    }),
    loadPricingCards,
  };
}
