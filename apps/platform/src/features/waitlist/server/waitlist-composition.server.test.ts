import type { WaitlistConfig } from "@eli-coach-platform/config";
import type { DatabaseClient } from "@eli-coach-platform/db";
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
    WAITLIST_CAP: 10,
    WAITLIST_MODE: true,
  };
}

describe("composeWaitlistFeature", () => {
  it("answers the waitlist snapshot when the repository is unreachable", async () => {
    // arrange
    const feature = composeWaitlistFeature({
      botVerifier: { verifySubmission: async () => ({ status: "verified" }) },
      clock: { now: () => new Date() },
      contactEmail: "contact@evoa.fit",
      database: createDatabaseStub(),
      incidents: { confirmationDeliveryFailed: () => {} },
      privacyEmail: "privacy@evoa.fit",
      productEmail: new InMemoryProductEmail(),
      waitlist: createWaitlistConfig(),
    });

    // act
    const waitlist = await feature.waitlist.getWaitlist();

    // assert
    expect(waitlist).toMatchObject({ availability: null, enabled: true });
  });
});
