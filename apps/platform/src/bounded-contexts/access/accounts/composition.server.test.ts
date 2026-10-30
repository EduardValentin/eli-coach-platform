import type { DatabaseClient } from "~/shared/database";
import { InMemoryProductEmailAdapter } from "~/shared/email/index.server";
import { createTokenGeneratorAdapter } from "~/shared/tokens/create-token-generator-adapter.server";
import { createTokenHasherAdapter } from "~/shared/tokens/create-token-hasher-adapter.server";
import { describe, expect, it, vi } from "vitest";

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
      clockPort: { now: () => new Date("2026-10-27T10:00:00.000Z") },
      contactEmail: "contact@evoa.fit",
      database: {} as DatabaseClient,
      identityConfig: {
        CLERK_SECRET_KEY: "sk_test_unit",
        CLERK_SIGN_UP_URL: "https://accounts.evoa.fit/sign-up",
        IDENTITY_PROVIDER: "memory",
      },
      linkTokens: {
        generator: createTokenGeneratorAdapter(),
        hasher: createTokenHasherAdapter(),
      },
      loggerPort: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      portal,
      productEmailPort: new InMemoryProductEmailAdapter(),
    });

    const response = await feature.accountWebhookController.handleClerkEvent(
      new Request("http://localhost/api/clerk/webhooks", { method: "POST" }),
    );

    // assert
    expect(feature.portal).toEqual(portal);
    expect(response.status).toBe(503);
  });
});
