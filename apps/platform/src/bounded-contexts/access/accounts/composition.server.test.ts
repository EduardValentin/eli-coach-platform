import type { DatabaseClient } from "~/shared/database";
import { InMemoryProductEmailAdapter } from "~/shared/email/index.server";
import { createTokenGeneratorAdapter } from "~/shared/tokens/create-token-generator-adapter.server";
import { createTokenHasherAdapter } from "~/shared/tokens/create-token-hasher-adapter.server";
import { describe, expect, it, vi } from "vitest";

import {
  composeAccountsFeature,
  type AccountsFeatureHandles,
} from "./composition.server";

const PORTAL = {
  appBasePath: "/",
  publicAppUrl: "https://evoa.fit",
  signInUrl: "https://accounts.evoa.fit/sign-in",
};

function accountsFeatureHandles(): AccountsFeatureHandles {
  return {
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
    portal: PORTAL,
    productEmailPort: new InMemoryProductEmailAdapter(),
  };
}

describe("composeAccountsFeature", () => {
  it("wires the webhook controller to the signing secret and carries the portal settings", async () => {
    // arrange
    const handles = accountsFeatureHandles();

    // act
    const { feature } = composeAccountsFeature(handles);

    const response = await feature.accountWebhookController.handleClerkEvent(
      new Request("http://localhost/api/clerk/webhooks", { method: "POST" }),
    );

    // assert
    expect(feature.portal).toEqual(PORTAL);
    expect(response.status).toBe(503);
  });

  it("publishes an API key facade that, with the in-memory identity provider, recognises no key", async () => {
    // arrange
    const { facades } = composeAccountsFeature(accountsFeatureHandles());

    // act
    const resolution =
      await facades.apiKeyAccountsFacade.resolve("Bearer ak_anything");

    // assert
    expect(resolution).toEqual({ status: "invalid" });
  });
});
