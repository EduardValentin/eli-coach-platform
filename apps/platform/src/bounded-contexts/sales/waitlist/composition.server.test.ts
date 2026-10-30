import type { WaitlistConfig } from "~/bounded-contexts/sales/waitlist/config.server";
import type { DatabaseClient } from "~/shared/database";
import { createEmailAcceptance } from "~/shared/submission-checks/email-address";
import { InMemoryProductEmailAdapter } from "~/shared/email/index.server";
import { handleHttpErrorResponse } from "~/shared/http/index.server";
import { describe, expect, it } from "vitest";

import { composeWaitlistFeature } from "./composition.server";

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
      botVerifierPort: {
        verifySubmission: async () => ({ status: "verified" }),
      },
      clockPort: { now: () => new Date() },
      contactEmail: "contact@evoa.fit",
      database: createDatabaseStub(),
      emailAcceptancePort: createEmailAcceptance("allowed"),
      featureFlagsFacade: {
        isOn: async () => {
          throw new Error("database down");
        },
      },
      loggerPort: { error: () => {}, warn: () => {}, info: () => {} },
      privacyEmail: "privacy@evoa.fit",
      productEmailPort: new InMemoryProductEmailAdapter(),
      waitlist: createWaitlistConfig(),
    });

    // act
    const waitlist = await feature.waitlistController.getWaitlist();

    // assert
    expect(waitlist).toMatchObject({ availability: null, enabled: true });
  });

  it("hands coaching sales the pricing eligibility the waitlist entries earn", async () => {
    // arrange
    const { handles } = composeWaitlistFeature({
      botVerifierPort: {
        verifySubmission: async () => ({ status: "verified" }),
      },
      clockPort: { now: () => new Date() },
      contactEmail: "contact@evoa.fit",
      database: createDatabaseWithReducedAllocation(),
      emailAcceptancePort: createEmailAcceptance("allowed"),
      featureFlagsFacade: { isOn: async () => false },
      loggerPort: { error: () => {}, warn: () => {}, info: () => {} },
      privacyEmail: "privacy@evoa.fit",
      productEmailPort: new InMemoryProductEmailAdapter(),
      waitlist: createWaitlistConfig(),
    });

    // act
    const tier =
      await handles.pricingEligibilitySourceFacade.tierForEmail(
        "ana@example.com",
      );

    // assert
    expect(tier).toBe("reduced");
  });

  it("hands the subaddress policy to the waitlist join", async () => {
    // arrange
    const { feature } = composeWaitlistFeature({
      botVerifierPort: {
        verifySubmission: async () => ({ status: "verified" }),
      },
      clockPort: { now: () => new Date() },
      contactEmail: "contact@evoa.fit",
      database: createDatabaseStub(),
      emailAcceptancePort: createEmailAcceptance("refused"),
      featureFlagsFacade: { isOn: async () => false },
      loggerPort: { error: () => {}, warn: () => {}, info: () => {} },
      privacyEmail: "privacy@evoa.fit",
      productEmailPort: new InMemoryProductEmailAdapter(),
      waitlist: createWaitlistConfig(),
    });

    // act
    const response = await handleHttpErrorResponse(() =>
      feature.waitlistController.join(
        new Request("http://localhost/api/waitlist", {
          body: new URLSearchParams({ email: "eli+launch@example.com" }),
          headers: { "content-type": "application/x-www-form-urlencoded" },
          method: "POST",
        }),
      ),
    );
    const body = await response.json();

    // assert
    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "email_subaddress_refused" },
    });
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
