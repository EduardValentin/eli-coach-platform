import { describe, expect, it } from "vitest";

import { ClerkIdentityProvider } from "./clerk-identity-provider.server";
import { createIdentityConfig, resolveFrontendApiHost } from "./identity-config.server";
import type { IdentityConfig } from "./identity-contract.server";

const publishableKey = "pk_test_ZGlzdGluY3QtbWFzdGlmZi0xMzUzLmNsZXJrLmFjY291bnRzLmRldiQ";

const config: IdentityConfig = {
  accountPortalUrl: "https://distinct-mastiff-1353.accounts.dev",
  publishableKey,
  secretKey: "sk_test_example",
};

const createProvider = (requestState: unknown) =>
  new ClerkIdentityProvider({
    client: {
      authenticateRequest: async () => requestState,
      sessions: { revokeSession: async () => undefined },
    } as never,
    config,
  });

describe("ClerkIdentityProvider", () => {
  it("reads the frontend API host out of the publishable key", () => {
    // arrange
    // act
    const host = resolveFrontendApiHost(publishableKey);

    // assert
    expect(host).toBe("distinct-mastiff-1353.clerk.accounts.dev");
  });

  it("derives the Account Portal from the same key", () => {
    // arrange
    // act
    const derived = createIdentityConfig({
      CLERK_API_URL: undefined,
      CLERK_PUBLISHABLE_KEY: publishableKey,
      CLERK_SECRET_KEY: "sk_test_example",
      CLERK_WEBHOOK_SIGNING_SECRET: "whsec_dW5pdC10ZXN0LXdlYmhvb2stc2lnbmluZy1zZWNyZXQ",
    } as never);

    // assert
    expect(derived.accountPortalUrl).toBe("https://distinct-mastiff-1353.accounts.dev");
  });

  it("derives the production Account Portal from a production key", () => {
    // arrange
    const productionKey = `pk_live_${Buffer.from("clerk.evoa.fit$").toString("base64url")}`;

    // act
    const derived = createIdentityConfig({
      CLERK_API_URL: undefined,
      CLERK_PUBLISHABLE_KEY: productionKey,
      CLERK_SECRET_KEY: "sk_live_example",
      CLERK_WEBHOOK_SIGNING_SECRET: "whsec_dW5pdC10ZXN0LXdlYmhvb2stc2lnbmluZy1zZWNyZXQ",
    } as never);

    // assert
    expect(derived.accountPortalUrl).toBe("https://accounts.evoa.fit");
  });

  it("sends the visitor to the hosted portal with the destination attached", () => {
    // arrange
    const provider = createProvider({});

    // act
    const url = provider.buildSignInUrl("http://localhost:3000/auth/complete?redirect_url=%2Fstore");

    // assert
    expect(url).toBe(
      "https://distinct-mastiff-1353.accounts.dev/sign-in?redirect_url=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcomplete%3Fredirect_url%3D%252Fstore",
    );
  });

  it("surfaces a verified identity", async () => {
    // arrange
    const provider = createProvider({
      headers: new Headers(),
      toAuth: () => ({
        sessionClaims: { email: "her@evoa.fit" },
        sessionId: "sess_1",
        userId: "user_1",
      }),
    });

    // act
    const result = await provider.authenticate(new Request("http://localhost:3000/"));

    // assert
    expect(result).toEqual({
      status: "authenticated",
      identity: { email: "her@evoa.fit", sessionId: "sess_1", subjectId: "user_1" },
    });
  });

  it("reports no email when the instance does not add the claim", async () => {
    // arrange
    const provider = createProvider({
      headers: new Headers(),
      toAuth: () => ({ sessionClaims: { sub: "user_1" }, sessionId: "sess_1", userId: "user_1" }),
    });

    // act
    const result = await provider.authenticate(new Request("http://localhost:3000/"));

    // assert
    expect(result).toMatchObject({ identity: { email: null } });
  });

  it("reports anonymous when no session is present", async () => {
    // arrange
    const provider = createProvider({ headers: new Headers(), toAuth: () => null });

    // act
    const result = await provider.authenticate(new Request("http://localhost:3000/"));

    // assert
    expect(result).toEqual({ status: "anonymous" });
  });

  it("hands back Clerk's redirect so the caller returns it rather than its own response", async () => {
    // arrange
    const headers = new Headers({ location: "https://fapi.example/v1/client/handshake" });
    const provider = createProvider({ headers, toAuth: () => null });

    // act
    const result = await provider.authenticate(new Request("http://localhost:3000/"));

    // assert
    expect(result.status).toBe("redirect");
    expect(result.status === "redirect" && result.response.status).toBe(307);
    expect(result.status === "redirect" && result.response.headers.get("location")).toBe(
      "https://fapi.example/v1/client/handshake",
    );
  });
});
