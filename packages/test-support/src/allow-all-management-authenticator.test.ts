import { describe, expect, it } from "vitest";

import { AllowAllManagementAuthenticator } from "./allow-all-management-authenticator";

describe("AllowAllManagementAuthenticator", () => {
  it("authenticates any header as the test principal", async () => {
    // arrange
    const authenticator = new AllowAllManagementAuthenticator();

    // act
    const result = await authenticator.authenticate({
      authorizationHeader: "Bearer anything",
    });

    // assert
    expect(result).toEqual({
      status: "authenticated",
      principal: { id: "test-principal", kind: "machine" },
    });
  });
});
