import { describe, expect, it } from "vitest";

import { createManagementAuthenticatorAdapter } from "./create-management-authenticator-adapter.server";

const SECRET = "a-sufficiently-long-management-secret";

describe("createManagementAuthenticatorAdapter", () => {
  it("accepts the configured secret and rejects another", async () => {
    // arrange
    const managementAuthenticatorPort = createManagementAuthenticatorAdapter({
      MANAGEMENT_API_SECRET: SECRET,
    });

    // act
    const accepted = await managementAuthenticatorPort.authenticate({
      authorizationHeader: `Bearer ${SECRET}`,
    });
    const rejected = await managementAuthenticatorPort.authenticate({
      authorizationHeader: "Bearer wrong-secret",
    });

    // assert
    expect(accepted).toMatchObject({ status: "authenticated" });
    expect(rejected).toEqual({ status: "unauthenticated" });
  });
});
