import type { DatabaseClient } from "~/shared/database";
import { describe, expect, it } from "vitest";

import { composeAccountsFeature } from "./composition.server";

describe("composeAccountsFeature", () => {
  it("wires the webhook controller to the signing secret and carries the portal settings", async () => {
    // arrange
    const portal = {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    };

    // act
    const { feature } = composeAccountsFeature({
      bootstrapCoachAuthSubjectId: "user_coach",
      clerkWebhookSigningSecret: undefined,
      clock: { now: () => new Date("2026-10-27T10:00:00.000Z") },
      database: {} as DatabaseClient,
      identityConfig: {
        CLERK_SECRET_KEY: "sk_test_unit",
        IDENTITY_PROVIDER: "memory",
      },
      portal,
    });

    const response = await feature.webhooks.handleClerkEvent(
      new Request("http://localhost/api/clerk/webhooks", { method: "POST" }),
    );

    // assert
    expect(feature.portal).toEqual(portal);
    expect(response.status).toBe(503);
  });
});
