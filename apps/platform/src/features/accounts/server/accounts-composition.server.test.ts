import type { DatabaseClient } from "@eli-coach-platform/db";
import { describe, expect, it } from "vitest";

import { composeAccountsFeature } from "./accounts-composition.server";

describe("composeAccountsFeature", () => {
  it("wires the webhook controller to the signing secret and carries the portal settings", async () => {
    // arrange
    const portal = { appBasePath: "/", publicAppUrl: "https://evoa.fit", signInUrl: "https://accounts.evoa.fit/sign-in" };

    // act
    const feature = composeAccountsFeature({
      bootstrapCoachAuthSubjectId: "user_coach",
      clerkWebhookSigningSecret: undefined,
      database: {} as DatabaseClient,
      portal,
    });

    const response = await feature.webhooks.handleClerkEvent(new Request("http://localhost/api/clerk/webhooks", { method: "POST" }));

    // assert
    expect(feature.portal).toEqual(portal);
    expect(response.status).toBe(503);
  });
});
