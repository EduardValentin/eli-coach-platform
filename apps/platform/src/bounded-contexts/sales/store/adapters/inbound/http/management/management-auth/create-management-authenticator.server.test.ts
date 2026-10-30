import { describe, expect, it } from "vitest";

import { createManagementAuthenticator } from "./create-management-authenticator.server";

const SECRET = "a-sufficiently-long-management-secret";

describe("createManagementAuthenticator", () => {
  it("accepts the configured secret and rejects another", async () => {
    // arrange
    const managementAuthenticatorPort = createManagementAuthenticator({
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
