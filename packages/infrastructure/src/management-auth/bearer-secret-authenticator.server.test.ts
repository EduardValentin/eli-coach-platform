import { describe, expect, it } from "vitest";

import { BearerSecretManagementAuthenticator } from "./index.server";

const SECRET = "a-sufficiently-long-management-secret";
const PRINCIPAL_ID = "management-api-agent";

function createAuthenticator(): BearerSecretManagementAuthenticator {
  return new BearerSecretManagementAuthenticator({
    principalId: PRINCIPAL_ID,
    secret: SECRET,
  });
}

function requestWithAuthorization(authorization?: string): Request {
  return new Request("https://example.test/api/management/store/products", {
    headers: authorization ? { authorization } : {},
    method: "POST",
  });
}

describe("BearerSecretManagementAuthenticator", () => {
  it("resolves a correct credential to the configured machine principal", async () => {
    // arrange
    const authenticator = createAuthenticator();

    // act
    const result = await authenticator.authenticate(
      requestWithAuthorization(`Bearer ${SECRET}`),
    );

    // assert
    expect(result).toEqual({
      status: "authenticated",
      principal: { kind: "machine", id: PRINCIPAL_ID },
    });
  });

  it("accepts the scheme case-insensitively, as HTTP defines it", async () => {
    // arrange
    const authenticator = createAuthenticator();

    // act
    const result = await authenticator.authenticate(
      requestWithAuthorization(`bearer ${SECRET}`),
    );

    // assert
    expect(result).toMatchObject({ status: "authenticated" });
  });

  it.each([
    ["a wrong credential of equal length", `Bearer ${"b".repeat(SECRET.length)}`],
    ["a wrong credential of different length", "Bearer short"],
    ["a credential longer than the secret", `Bearer ${SECRET}extra`],
    ["an empty credential", "Bearer "],
    ["another scheme", `Basic ${SECRET}`],
    ["a bare secret with no scheme", SECRET],
    ["an empty header", ""],
  ])("rejects %s", async (_description, authorization) => {
    // arrange
    const authenticator = createAuthenticator();

    // act
    const result = await authenticator.authenticate(
      requestWithAuthorization(authorization),
    );

    // assert
    expect(result).toEqual({ status: "unauthenticated" });
  });

  it("rejects a request carrying no Authorization header", async () => {
    // arrange
    const authenticator = createAuthenticator();

    // act
    const result = await authenticator.authenticate(requestWithAuthorization());

    // assert
    expect(result).toEqual({ status: "unauthenticated" });
  });

  it("never reports forbidden or unavailable, which only a later provider can produce", async () => {
    // arrange
    const authenticator = createAuthenticator();

    // act
    const results = await Promise.all([
      authenticator.authenticate(requestWithAuthorization(`Bearer ${SECRET}`)),
      authenticator.authenticate(requestWithAuthorization("Bearer wrong")),
      authenticator.authenticate(requestWithAuthorization()),
    ]);

    // assert
    expect(
      results.map((result) => result.status),
    ).toEqual(["authenticated", "unauthenticated", "unauthenticated"]);
  });
});
