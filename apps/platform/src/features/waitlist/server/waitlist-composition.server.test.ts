import type { WaitlistConfig } from "@eli-coach-platform/config";
import type { DatabaseClient } from "@eli-coach-platform/db";
import { EmailAddress } from "@eli-coach-platform/domain/email-address";
import { InMemoryProductEmail } from "@eli-coach-platform/infrastructure/email/server";
import { describe, expect, it } from "vitest";

import { composeWaitlistFeature } from "./waitlist-composition.server";

function createDatabaseStub(): DatabaseClient {
  return {
    select: () => {
      throw new Error("database down");
    },
  } as unknown as DatabaseClient;
}

function createWaitlistConfig(): WaitlistConfig {
  return {
    WAITLIST_ACTIVE_CAMPAIGN_SLUG: "all-bundles-launch-1",
    WAITLIST_ACTIVE_OFFER_PLAN: "all-bundles",
  };
}

describe("composeWaitlistFeature", () => {
  it("answers the waitlist snapshot when the repository is unreachable", async () => {
    // arrange
    const { feature } = composeWaitlistFeature({
      botVerifier: { verifySubmission: async () => ({ status: "verified" }) },
      clock: { now: () => new Date() },
      contactEmail: "contact@evoa.fit",
      database: createDatabaseStub(),
      featureFlags: {
        execute: async () => {
          throw new Error("database down");
        },
      },
      incidents: {
        confirmationDeliveryFailed: () => {},
        waitlistModeReadFailed: () => {},
      },
      privacyEmail: "privacy@evoa.fit",
      productEmail: new InMemoryProductEmail(),
      waitlist: createWaitlistConfig(),
    });

    // act
    const waitlist = await feature.waitlist.getWaitlist();

    // assert
    expect(waitlist).toMatchObject({ availability: null, enabled: true });
  });

  it("hands coaching sales the pricing eligibility the waitlist entries earn", async () => {
    // arrange
    const { handles } = composeWaitlistFeature({
      botVerifier: { verifySubmission: async () => ({ status: "verified" }) },
      clock: { now: () => new Date() },
      contactEmail: "contact@evoa.fit",
      database: createDatabaseWithReducedAllocation(),
      featureFlags: { execute: async () => ({}) },
      incidents: {
        confirmationDeliveryFailed: () => {},
        waitlistModeReadFailed: () => {},
      },
      privacyEmail: "privacy@evoa.fit",
      productEmail: new InMemoryProductEmail(),
      waitlist: createWaitlistConfig(),
    });

    // act
    const tier = await handles.pricingEligibility.tierForEmail(
      EmailAddress.normalize("ana@example.com"),
    );

    // assert
    expect(tier).toBe("reduced");
  });
});

function createDatabaseWithReducedAllocation(): DatabaseClient {
  const selection = {
    from: () => selection,
    where: () => selection,
    limit: () => Promise.resolve([{ id: 1 }]),
  };

  return { select: () => selection } as unknown as DatabaseClient;
}
