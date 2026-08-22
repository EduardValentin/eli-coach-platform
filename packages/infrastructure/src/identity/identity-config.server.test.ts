import { describe, expect, it } from "vitest";

import { createIdentityConfig, resolveFrontendApiHost } from "./identity-config.server";

const developmentKey = "pk_test_ZGlzdGluY3QtbWFzdGlmZi0xMzUzLmNsZXJrLmFjY291bnRzLmRldiQ";

function runtimeEnvironmentWith(publishableKey: string, secretKey: string) {
  return {
    CLERK_API_URL: undefined,
    CLERK_PUBLISHABLE_KEY: publishableKey,
    CLERK_SECRET_KEY: secretKey,
    CLERK_WEBHOOK_SIGNING_SECRET: "whsec_dW5pdC10ZXN0LXdlYmhvb2stc2lnbmluZy1zZWNyZXQ",
  } as never;
}

describe("identity configuration", () => {
  it("reads the frontend API host out of the publishable key", () => {
    // arrange
    // act
    const host = resolveFrontendApiHost(developmentKey);

    // assert
    expect(host).toBe("distinct-mastiff-1353.clerk.accounts.dev");
  });

  it("derives a development Account Portal from the same key", () => {
    // arrange
    // act
    const derived = createIdentityConfig(
      runtimeEnvironmentWith(developmentKey, "sk_test_example"),
    );

    // assert
    expect(derived.accountPortalUrl).toBe("https://distinct-mastiff-1353.accounts.dev");
  });

  it("derives a production Account Portal, which is shaped differently", () => {
    // arrange
    const productionKey = `pk_live_${Buffer.from("clerk.evoa.fit$").toString("base64url")}`;

    // act
    const derived = createIdentityConfig(
      runtimeEnvironmentWith(productionKey, "sk_live_example"),
    );

    // assert
    expect(derived.accountPortalUrl).toBe("https://accounts.evoa.fit");
  });
});
