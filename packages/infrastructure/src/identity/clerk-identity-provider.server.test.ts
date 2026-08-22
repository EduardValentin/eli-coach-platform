import { describe, expect, it } from "vitest";

import { ClerkIdentityProvider } from "./clerk-identity-provider.server";
import type { IdentityConfig } from "./identity-contract.server";

const config: IdentityConfig = {
  accountPortalUrl: "https://distinct-mastiff-1353.accounts.dev",
  publishableKey: "pk_test_ZGlzdGluY3QtbWFzdGlmZi0xMzUzLmNsZXJrLmFjY291bnRzLmRldiQ",
  secretKey: "sk_test_example",
};

/**
 * Authentication itself is covered end to end by the integration suites, which
 * drive the real SDK against a stubbed Clerk. What is left here is the one
 * thing they cannot see: the URL this adapter builds before any request exists.
 */
describe("ClerkIdentityProvider", () => {
  it("sends the visitor to the hosted portal with the destination attached", () => {
    // arrange
    const provider = new ClerkIdentityProvider({ config });

    // act
    const url = provider.buildSignInUrl(
      "http://localhost:3000/auth/complete?redirect_url=%2Fstore",
    );

    // assert
    expect(url).toBe(
      "https://distinct-mastiff-1353.accounts.dev/sign-in?redirect_url=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcomplete%3Fredirect_url%3D%252Fstore",
    );
  });
});
